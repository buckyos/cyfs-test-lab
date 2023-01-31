use log::*;
use std::{
    sync::{Arc, RwLock, Mutex}, 
    path::{Path, PathBuf}, 
    task::{Context, Poll, Waker}, 
    pin::Pin, 
    str::FromStr, 
    collections::HashMap, 
    io::ErrorKind
};


use async_std::{
    task, 
    channel::{bounded, Sender, Receiver}
};
use cyfs_base::*;
use cyfs_bdt::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_util::*;

#[derive(Debug, Clone)]
pub struct DstSyncIterator {
    rel_path: String, 
    chunk: Option<(usize, ChunkId)>, 
}

#[async_trait::async_trait]
pub trait DstSyncDelegate: Send + Sync {
    fn clone_as_dst_sync_delegate(&self) -> Box<dyn DstSyncDelegate>;
    async fn on_pre_download(&self, session: &DstSyncSession, task_path: &str);
    async fn on_pre_download_chunk(&self, session: &DstSyncSession, iter: &DstSyncIterator, task_path: &str);
    async fn on_error(&self, session: &DstSyncSession, err: BuckyError);
    async fn on_finish(&self, session: &DstSyncSession);
}

#[derive(Debug)]
pub enum DstSyncPhase {
    Waiting, 
    Downloading, 
    Finished, 
    Error(BuckyError)
}

impl From<&PhaseImpl> for DstSyncPhase {
    fn from(phase: &PhaseImpl) -> Self {
        match phase {
            PhaseImpl::Waiting => DstSyncPhase::Waiting,
            PhaseImpl::Downloading { .. } => DstSyncPhase::Downloading,
            PhaseImpl::Finished => DstSyncPhase::Finished, 
            PhaseImpl::Error(err) => DstSyncPhase::Error(err.clone()), 
        }
    }
}

enum PhaseImpl {
    Waiting, 
    Downloading {
        delegate: Box<dyn DstSyncDelegate>, 
    }, 
    Finished, 
    Error(BuckyError)
}

struct SessionImpl {
    stack: SharedCyfsStack, 
    dir_id: ObjectId,  
    source: DeviceId, 
    local_path: PathBuf, 
    phase: RwLock<PhaseImpl>
}

#[derive(Clone)]
pub struct DstSyncSession(Arc<SessionImpl>);

impl std::fmt::Display for DstSyncSession {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "DstSyncSession{{local:{}, dir_id:{}, source:{}, path:{:?}}}", self.stack().local_device_id(), self.dir_id(), self.source(), self.local_path())
    }
}

enum RelPathStub {
    Dir(ObjectId, SingleOpEnvStub), 
    File(ObjectId, ChunkListDesc)
}

impl RelPathStub {
    fn as_file(&self) -> Option<ChunkListDesc> {
        match self {
            Self::File(id, chunks) => Some(chunks.clone()), 
            _ => None
        }
    } 

    fn as_dir(&self) -> Option<SingleOpEnvStub> {
        match self {
            Self::Dir(id, op) => Some(op.clone()),
            _ => None
        }
    }
}

impl DstSyncSession {
    fn new(
        stack: &SharedCyfsStack, 
        source: DeviceId, 
        dir_id: ObjectId, 
        local_path: PathBuf 
    ) -> Self {
        Self(Arc::new(SessionImpl {
            stack: stack.clone(), 
            source,  
            dir_id, 
            local_path, 
            phase: RwLock::new(PhaseImpl::Waiting)
        }))
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    fn dir_id(&self) -> &ObjectId {
        &self.0.dir_id
    }

    fn source(&self) -> &DeviceId {
        &self.0.source
    }

    fn local_path(&self) -> &Path {
        self.0.local_path.as_path()
    }

    fn task_path(&self) -> String {
        ["in_zone_sync".to_owned(), self.dir_id().to_string()].join("/")
    }

    fn task_path_of(&self, iter: &DstSyncIterator) -> Option<String> {
        iter.chunk.as_ref().map(|(index, _)| [self.task_path(), [iter.rel_path.clone(), index.to_string()].join("/")].join(""))
    }

    pub fn start<T: 'static + DstSyncDelegate>(&self, delegate: T) -> BuckyResult<()> {
        info!("{} start", self);
        let _ = {
            let mut phase = self.0.phase.write().unwrap();
            match &mut *phase {
                PhaseImpl::Waiting => {
                    *phase = PhaseImpl::Downloading { 
                        delegate: delegate.clone_as_dst_sync_delegate(), 
                    };
                    Ok(())
                }, 
                _ => {
                    Err(BuckyError::new(BuckyErrorCode::ErrorState, "not in waiting phase"))
                }
            }
        }?;
        
        
        let session = self.clone();
        task::spawn(async move {
            delegate.on_pre_download(&session, session.task_path().as_str()).await;
            let result = session.download_process().await;

            if let Err(err) = result {
                let delegate = {
                    let mut phase = session.0.phase.write().unwrap();
                    match &mut *phase {
                        PhaseImpl::Downloading { delegate, .. } => {
                            let delegate = Some(delegate.clone_as_dst_sync_delegate());
                            *phase = PhaseImpl::Error(err.clone());
                            delegate
                        }, 
                        _ => None
                    } 
                };
                if let Some(delegate) = delegate {
                    delegate.on_error(&session, err.clone()).await;
                }
            }
        });

        Ok(())
    }

    async fn download_process(&self) -> BuckyResult<()> {
        let mut sub_dirs: HashMap<String, RelPathStub> = Default::default();

        let root_obj = self.stack().root_state_stub(None, None).create_single_op_env().await
            .map_err(|err| {
                error!("{} download process failed, err=create map op env {}", self, err);
                err
            })?;
        let _ = root_obj.load(self.dir_id().clone()).await
            .map_err(|err| {
                error!("{} download process failed, err=create map op env {}", self, err);
                err
            })?;
        sub_dirs.insert("".to_owned(), RelPathStub::Dir(self.dir_id().clone(), root_obj.clone()));
        if root_obj.list().await
            .map_err(|err| {
                error!("{} download process failed, err=list dir {}", self, err);
                err
            })?.len() == 0 {
            info!("{} download process finished for empty dir", self);
            return Ok(());
        }
        
        let mut iter = DstSyncIterator { rel_path: "".to_owned(), chunk: None };
        let result = loop {
            match self.next_chunk(&mut sub_dirs, &iter).await {
                Ok(new_iter) => if let Some(cur) = new_iter {
                    let delegate = {
                        let mut phase = self.0.phase.write().unwrap();
                        match &mut *phase {
                            PhaseImpl::Downloading { delegate, .. } => {
                                Some(delegate.clone_as_dst_sync_delegate())
                            }, 
                            _ => None
                        } 
                    };
                    iter = cur;

                    if let Some(delegate) = delegate {
                        let task_path = self.task_path_of(&iter).unwrap();
                        delegate.on_pre_download_chunk(self, &iter, task_path.as_str()).await;
                        let ret = self.download_chunk(&iter.chunk.as_ref().unwrap().1, task_path).await;
                        if ret.is_err() {
                            break ret;
                        }
                    } else {
                        break Ok(())
                    }
                } else {
                    let delegate = {
                        let mut phase = self.0.phase.write().unwrap();
                        match &mut *phase {
                            PhaseImpl::Downloading { delegate, .. } => {
                                let delegate = Some(delegate.clone_as_dst_sync_delegate());
                                *phase = PhaseImpl::Finished;
                                delegate
                            }, 
                            _ => None
                        } 
                    };
                    if let Some(delegate) = delegate {
                        delegate.on_finish(self).await;
                    }
                    break Ok(())
                }, 
                Err(err) => {
                    break Err(err)
                }
            }
        };

        result
    }


    async fn download_chunk(
        &self, 
        chunk: &ChunkId, 
        task_path: String
    ) -> BuckyResult<()> {
        let mut req = NDNGetDataRequest::new_ndn(Some(self.source().clone()), chunk.object_id(), None);
        req.group = Some(task_path.clone());
        let resp = self.stack().ndn_service().get_data(req).await
            .map_err(|err| {
                error!("{} download chunk failed, task={}, chunk={}", self, task_path, chunk);
                err
            })?;
        let _ = async_std::io::copy(resp.data, async_std::io::sink()).await
            .map_err(|err| {
                error!("{} download chunk failed, task={}, chunk={}", self, task_path, chunk);
                err
            })?;
        Ok(())
    }

    async fn backtrace_to_parent(
        &self, 
        sub_dirs: &mut HashMap<String, RelPathStub>, 
        cur_path: &str
    ) -> BuckyResult<Option<DstSyncIterator>> {
        let parent_path = Path::new(cur_path).parent();
        if let Some(upper) = parent_path {
            let iter = DstSyncIterator {
                rel_path: upper.to_str().unwrap().to_owned(), 
                chunk: None
            };
            self.next_chunk(sub_dirs, &iter).await
        } else {
            Ok(None)
        }
    }

    #[async_recursion::async_recursion]
    async fn next_chunk(
        &self, 
        sub_dirs: &mut HashMap<String, RelPathStub>, 
        iter: &DstSyncIterator
    ) -> BuckyResult<Option<DstSyncIterator>> {
        if let Some((index, _)) = &iter.chunk {
            let file_chunks = sub_dirs.get(&iter.rel_path).unwrap().as_file().unwrap();
            let index = *index + 1;
            if index == file_chunks.chunks().len() - 1 {
                debug!("{} all chunks finished, backtrace to parent, iter={:?}", self, iter);
                self.backtrace_to_parent(sub_dirs, &iter.rel_path).await
            } else {
                let iter = DstSyncIterator {
                    rel_path: iter.rel_path.clone(), 
                    chunk: Some((index, file_chunks.chunks()[index].clone()))
                };
                info!("{} next chunk, iter={:?}", self, iter);
                Ok(Some(iter))
            }
        } else {
            let sub_dir_obj = sub_dirs.get(&iter.rel_path).unwrap().as_dir().unwrap();
            let next_child = sub_dir_obj.next(1).await
                .map_err(|err| {
                    error!("{} download process failed, iter={:?}, err=enumate {}", self, iter, err);
                    err
                })?;
            if next_child.len() == 0 {
                debug!("{} all child finished, backtrace to parent, iter={:?}", self, iter);
                self.backtrace_to_parent(sub_dirs, &iter.rel_path).await
            } else {
                let next_child = &next_child[0];
                if let ObjectMapContentItem::Map((child_path, child_id)) = next_child {
                    let req = NONGetObjectRequest::new_non(Some(self.source().clone()), child_id.clone(), None);
                    let get_resp = self.stack().non_service().get_object(req).await
                        .map_err(|err| {
                            error!("{} download process failed, iter={:?}, err=get object {}", self, child_path, err);
                            err
                        })?;

                    let child_path = [iter.rel_path.as_str(), child_path.as_str()].join("/").to_owned();
                    if child_id.obj_type_code() == ObjectTypeCode::File {
                        let file_obj = File::clone_from_slice(get_resp.object.object_raw.as_slice())
                            .map_err(|err| {
                                error!("{} download process failed, iter={:?}, err=load file {}", self, child_path, err);
                                err
                            })?;
                        let file_chunks = ChunkListDesc::from_file(&file_obj)
                            .map_err(|err| {
                                error!("{} download process failed, iter={:?}, err=get chunk list {}", self, child_path, err);
                                err
                            })?;
                        if file_chunks.chunks().len() == 0 {
                            debug!("{} ignore empty file, iter={:?}", self, child_path);
                            self.next_chunk(sub_dirs, iter).await
                        } else {
                            sub_dirs.insert(child_path.clone(), RelPathStub::File(child_id.clone(), file_chunks.clone()));

                            let iter = DstSyncIterator {
                                rel_path: child_path, 
                                chunk: Some((0, file_chunks.chunks()[0].clone()))
                            };

                            info!("{} next chunk, iter={:?}", self, iter);
                            Ok(Some(iter))
                        }
                    } else if child_id.obj_type_code() == ObjectTypeCode::ObjectMap {
                        let child_obj = self.stack().root_state_stub(None, None).create_single_op_env().await
                            .map_err(|err| {
                                error!("{} download process failed, iter={:?}, err=create map op {}", self, child_path, err);
                                err
                            })?;
                        let _ = child_obj.load(child_id.clone()).await
                            .map_err(|err| {
                                error!("{} download process failed, iter={:?}, err=creat map op {}", self, child_path, err);
                                err
                            })?;
                        
                        sub_dirs.insert(child_path.clone(), RelPathStub::Dir(child_id.clone(), child_obj.clone()));

                        let iter = DstSyncIterator {
                            rel_path: child_path, 
                            chunk: None
                        };

                        debug!("{} continue sub dir, iter={:?}", self, iter);
                        self.next_chunk(sub_dirs, &iter).await
                    } else {
                        unimplemented!()
                    }
                } else {
                    unimplemented!()
                }
            }
        }
    }

    pub fn phase(&self) -> DstSyncPhase {
        DstSyncPhase::from(&*self.0.phase.read().unwrap())
    }

}

enum ListenerState {
    Init, 
    Listening(Sender<DstSyncSession>, Receiver<DstSyncSession>), 
    Stopped
}

struct ListenerImpl {
    stack: SharedCyfsStack, 
    state: RwLock<ListenerState>
}

#[derive(Clone)]
pub struct SyncListener(Arc<ListenerImpl>);

impl std::fmt::Display for SyncListener {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SyncListener")
    }
}

impl SyncListener {
    pub async fn new(stack: &SharedCyfsStack, backlog: usize) -> BuckyResult<Self> {
        let listener = Self(Arc::new(ListenerImpl {
            stack: stack.clone(), 
            state: RwLock::new(ListenerState::Init)
        }));

        let _ = listener.listen(backlog).await?;
        Ok(listener)
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    pub async fn listen(&self, backlog: usize) -> BuckyResult<()> {
        struct OnPushSyncDir(SyncListener);

        #[async_trait::async_trait]
        impl EventListenerAsyncRoutine<RouterHandlerPostObjectRequest, RouterHandlerPostObjectResult> for OnPushSyncDir {
            async fn call(&self, param: &RouterHandlerPostObjectRequest) -> BuckyResult<RouterHandlerPostObjectResult> {
                let req_path = param.request.common.req_path.as_ref().unwrap();
                let parts: Vec<_> = req_path.split("/").skip(1).collect();
                let path_str = parts.join("/");
                let local_path = PathBuf::from_str(path_str.as_str())
                    .map_err(|_| BuckyError::new(BuckyErrorCode::InvalidParam, format!("invalid local path {}", path_str)))?;
                let session = DstSyncSession::new(
                    self.0.stack(), 
                    param.request.common.source.zone.device.clone().unwrap(), 
                    param.request.object.object_id, 
                    local_path
                );
                // let req = NONPutObjectRequest::new(
                //     NONAPILevel::NOC, 
                //     param.request.object.object_id.clone(), 
                //     param.request.object.object_raw.clone());
                // let _ = self.0.stack().non_service().put_object(req).await?;
                self.0.push_session(session).await;
                Ok(RouterHandlerPostObjectResult {
                    action: RouterHandlerAction::Response,
                    request: None,
                    response: Some(Ok(NONPostObjectInputResponse {
                        object: None
                    }))
                })
            }
        }

        
        self.stack().root_state_meta_stub(None, None).clear_access()
            .await.map_err(|err| {
                error!("{} listen failed, err=clear access {}", self, err);
                err
            })?;

        let call_path = "/in_zone_sync";
   
        // open access for self dec's register post-object handler
        let mut access = AccessString::new(0);
        access.set_group_permission(AccessGroup::CurrentZone, AccessPermission::Write);
        access.set_group_permission(AccessGroup::CurrentDevice, AccessPermission::Write);
        access.set_group_permission(AccessGroup::OwnerDec, AccessPermission::Write);
        let item = GlobalStatePathAccessItem {
            path: call_path.to_owned(),
            access: GlobalStatePathGroupAccess::Default(access.value()),
        };

        self.stack().root_state_meta_stub(None, None).add_access(item)
            .await.map_err(|err| {
                error!("{} listen failed, err=add access {}", self, err);
                err
            })?;

        let req_path = RequestGlobalStatePath::new(self.stack().dec_id().cloned(), Some(call_path.to_owned()));
        let _ = self.stack().router_handlers().post_object().add_handler(
            RouterHandlerChain::Handler,
            "OnSyncPushObject",
            0,
            None, 
            Some(req_path.to_string()),
            RouterHandlerAction::Default,
            Some(Box::new(OnPushSyncDir(self.clone()))),
        ).await.map_err(|err| {
            error!("{} listen failed, err=add OnPushSyncDir handler {}", self, err);
            err
        })?;

        let (sender, receiver) = bounded(backlog);
        *self.0.state.write().unwrap() = ListenerState::Listening(sender, receiver);
        Ok(())
    }

    pub async fn accept(&self) -> Option<BuckyResult<DstSyncSession>> {
        let receiver = {
            let state = self.0.state.read().unwrap();
            match &*state {
                ListenerState::Listening(_, r) => r.clone(),
                _ => return None
            }
        };
        match receiver.recv().await {
            Ok(s) => Some(Ok(s)),
            Err(_) => None
        }
    }

    async fn push_session(&self, session: DstSyncSession) {
        info!("{} push session = {}", self, session);
        let sender = {
            let state = self.0.state.read().unwrap();
            match &*state {
                ListenerState::Listening(s, _) => Some(s.clone()),
                _ => None
            }
        };
        if let Some(sender) = sender {
            if !sender.is_full() {
                debug!("{} pushed session", self);
                let _ = sender.send(session).await;
            } else {
                debug!("{} backlog full", self);
            }
        } else {
            debug!("{} not listening", self);
        }
    }

    pub fn incoming(&self) -> SessionIncoming {
        SessionIncoming(self.clone(), Arc::new(Mutex::new(IncommingState { result: None, waker: None })))
    }
}


struct IncommingState {
    result: Option<Option<std::io::Result<DstSyncSession>>>,
    waker: Option<Waker>,
}

pub struct SessionIncoming(SyncListener, Arc<Mutex<IncommingState>>);

impl async_std::stream::Stream for SessionIncoming {
    type Item = std::io::Result<DstSyncSession>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<<Self as async_std::stream::Stream>::Item>> {
        let (poll_result, is_accept_next) = {
            let mut last_result = None;
            let mut state = self.1.lock().unwrap();
            std::mem::swap(&mut state.result, &mut last_result);

            match last_result {
                Some(r) => {
                    state.waker = None;
                    (Poll::Ready(r), true)
                }, 
                None => {
                    let is_accept_next = !state.waker.is_some();
                    state.waker = Some(cx.waker().clone());
                    (Poll::Pending, is_accept_next)
                }
            }
        };

        if is_accept_next {
            let listener = self.0.clone();
            let next_state = self.1.clone();

            task::spawn(async move {
                let result = match listener.accept().await {
                    Some(r) => {
                        Some(r.map_err(|e| std::io::Error::new(ErrorKind::Other, e)))
                    }
                    None => {
                        None
                    }
                };

                let waker = {
                    let mut result = Some(result);
                    let mut next_state = next_state.lock().unwrap();
                    assert!(next_state.result.is_none()); // 没有结果
                    std::mem::swap(&mut next_state.result, &mut result);
                    next_state.waker.clone()
                };

                if let Some(wk) = waker {
                    wk.wake();
                }
            });
        }

        poll_result
    }
}