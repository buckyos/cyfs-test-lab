use log::*;
use std::{
    sync::{Arc, Weak, RwLock}, 
    path::{Path, PathBuf}, 
    collections::BTreeMap, str::FromStr
};
use async_std::{
    task, 
    future
};
use once_cell::sync::OnceCell; 
use cyfs_base::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_util::*;

const CHUNK_SIZE: u32 = 4 * 1024 * 1024;

struct UploadingIterator {
    rel_path: String, 
    chunk_index: usize, 
    chunk_id: ChunkId, 
}

pub enum BackupSrcSessionPhase {
    Init, 
    Running, 
    Finished,
    Error(BuckyError)
}

enum PhaseImpl {
    Init, 
    Publishing, 
    Pushing, 
    Uploading {
        iter: Option<UploadingIterator>, 
    }, 
    Finished, 
    Error(BuckyError), 
}

#[async_trait::async_trait]
pub trait BackupSrcDelegate: Send + Sync {
    async fn on_post_publish(&self, session: &BackupSrcSession, dir_id: &ObjectId);
    async fn on_post_push(&self, session: &BackupSrcSession);
    async fn on_pre_upload_file(&self, session: &BackupSrcSession, rel_path: &Path, task_path: &str);
}


struct SessionImpl {
    stack: SharedCyfsStack, 
    manager: WeakSyncManager, 
    target: DeviceId, 
    local_path: PathBuf, 
    delegate: Box<dyn BackupSrcDelegate>, 
    dir_id: RwLock<OnceCell<ObjectId>>,  
    phase: RwLock<PhaseImpl>, 
}


#[derive(Clone)]
pub struct BackupSrcSession(Arc<SessionImpl>);

impl std::fmt::Display for BackupSrcSession {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "BackupSrcSession{{target:{}, local_path:{:?}, dir_id:{:?}}}", self.target(), self.local_path(), self.dir_id())
    }
}

impl BackupSrcSession {
    fn new<T: 'static + BackupSrcDelegate>(
        manager: &SyncManager, 
        target: DeviceId, 
        local_path: &Path, 
        dir_id: Option<ObjectId>, 
        delegate: T
    ) -> Self {
        Self(Arc::new(SessionImpl {
            stack: manager.stack().clone(), 
            manager: manager.to_weak(),  
            target, 
            local_path: PathBuf::from(local_path), 
            delegate: Box::new(delegate), 
            dir_id: RwLock::new(if let Some(dir_id) = dir_id {
                OnceCell::from(dir_id)
            } else {
                OnceCell::new()
            }), 
            phase: RwLock::new(PhaseImpl::Init)
        }))
    }

    fn ptr_eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.0, &other.0)
    }

    pub fn state(&self) -> BackupSrcSessionPhase {
        let phase = self.0.phase.read().unwrap();
        match &*phase {
            PhaseImpl::Init => BackupSrcSessionPhase::Init, 
            PhaseImpl::Publishing => BackupSrcSessionPhase::Running,  
            PhaseImpl::Pushing => BackupSrcSessionPhase::Running, 
            PhaseImpl::Uploading { .. } => BackupSrcSessionPhase::Running, 
            PhaseImpl::Finished => BackupSrcSessionPhase::Finished, 
            PhaseImpl::Error(err) => BackupSrcSessionPhase::Error(err.clone()), 
        }
    }

    pub fn start(&self) -> BuckyResult<()> {
        enum NextStep {
            Publish, 
            Push(ObjectId)
        }

        let next = {
            let dir_id = self.dir_id();
            let mut phase = self.0.phase.write().unwrap();
            match &mut *phase {
                PhaseImpl::Init => {
                    Ok(if let Some(dir_id) = dir_id {
                        let next = NextStep::Push(dir_id);
                        *phase = PhaseImpl::Pushing;
                        next 
                    } else {    
                        *phase = PhaseImpl::Publishing;
                        NextStep::Publish
                    })
                }, 
                _ => Err(BuckyError::new(BuckyErrorCode::ErrorState, "not in init state")) 
            }
        }?;

        match next {
            NextStep::Publish => {
                let session = self.clone();
                task::spawn(async move {
                    session.publish().await;
                });
            }, 
            NextStep::Push(dir_id) => {
                let session = self.clone();
                task::spawn(async move {
                    session.push(dir_id).await;
                });
            }
        }
        Ok(())
    }

    pub fn cancel_by_error(&self, err: BuckyError) {
        unimplemented!()

        // let req = TransControlTaskGroupRequest {
        //     common: NDNOutputRequestCommon::new(NDNAPILevel::NDN),
        //     group_type: TransTaskGroupType::Upload, 
        //     group: self.task_path_of(&exists).unwrap(),
        //     action: TransTaskGroupControlAction::Cancel,
        // };
        // let _ = self.stack().trans_service().control_task_group(req).await;
    }

    pub fn delegate(&self) -> &dyn BackupSrcDelegate {
        self.0.delegate.as_ref()
    }

    pub fn dir_id(&self) -> Option<ObjectId> {
        self.0.dir_id.read().unwrap().get().cloned()
    }

    pub fn task_path(&self) -> Option<String> {
        self.dir_id().map(|id| id.to_string())
    }


    pub fn target(&self) -> &DeviceId {
        &self.0.target
    }

    fn set_dir_id(&self, dir_id: ObjectId) {
        let _ = self.0.dir_id.write().unwrap().set(dir_id);
    }

    pub fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    pub fn local_path(&self) -> &Path {
        self.0.local_path.as_path()
    }

    pub async fn wait_finish(&self) -> BuckyResult<()> {
        future::pending::<BuckyResult<()>>().await
    }

    async fn publish(&self) {
        info!("{} begin publish", self);
        let next = match self.inner_publish().await {
            Ok(dir_id) => {
                self.set_dir_id(dir_id.clone());
                let mut phase = self.0.phase.write().unwrap();
                match &mut *phase {
                    PhaseImpl::Publishing => {
                        *phase = PhaseImpl::Pushing;
                        Some(dir_id.to_owned())
                    },
                    _ => None
                }
            },
            Err(err) => {
                let mut phase = self.0.phase.write().unwrap();
                match &mut *phase {
                    PhaseImpl::Finished | PhaseImpl::Error(_) => {}, 
                    _ => {
                        *phase = PhaseImpl::Error(err);
                    }
                }
                None
            }
        };

        if let Some(dir_id) = next {
            info!("{} has published", self);
            let manager = SyncManager::from_weak(&self.0.manager).unwrap();
            manager.on_post_publish(self).await;
            self.delegate().on_post_publish(self, &dir_id).await;
            let session = self.clone();
            task::spawn(async move {
                session.push(dir_id).await;
            });
        }
    }

    async fn inner_publish(&self) -> BuckyResult<ObjectId> {
        let req = TransPublishFileOutputRequest {
            common: NDNOutputRequestCommon {
                req_path: None,
                dec_id: self.stack().dec_id().cloned(),
                level: Default::default(),
                target: None,
                referer_object: vec![],
                flags: 0,
            },
            owner: self.stack().local_device().desc().owner().clone().unwrap(),
            local_path: self.local_path().to_owned(),
            chunk_size: CHUNK_SIZE,
            chunk_method: TransPublishChunkMethod::None,
            access: None,
            file_id: None,
            dirs: None,
        };  
        let resp = self.stack().trans().publish_file(req).await
            .map_err(|err| {
                error!("{} publish file failed, err={}", self, err);
                err
            })?;
        Ok(resp.file_id)
    }

    async fn push_inner(&self, dir_id: &ObjectId) -> BuckyResult<()> {
        let req = NONGetObjectRequest::new_noc(dir_id.clone(), None);
        let resp = self.stack().non_service().get_object(req).await
            .map_err(|err| {
                error!("{} push failed, err=get object from noc {}", self, err);
                err
            })?; 
        let mut req = NONPostObjectOutputRequest::new_router(
            Some(self.target().object_id().clone()), 
            dir_id.clone(), 
            resp.object.object_raw);
        req.common.req_path = Some(SyncManager::req_path_of(self));
        let _ = self.stack().non_service().post_object(req).await
            .map_err(|err| {
                error!("{} push failed, err=post object {}", self, err);
                err
            })?;
        self.delegate().on_post_push(self).await;
        
        info!("{} has post object to ood", self); 
        Ok(())
    }

    async fn push(&self, dir_id: ObjectId) {
        info!("{} begin push", self);
        match self.push_inner(&dir_id).await {
            Ok(_) => {
                let mut phase = self.0.phase.write().unwrap();
                match &mut *phase {
                    PhaseImpl::Pushing => {
                        *phase = PhaseImpl::Uploading { iter: None };
                    },
                    _ => {}
                }
            },
            Err(err) => {
                let mut phase = self.0.phase.write().unwrap();
                match &mut *phase {
                    PhaseImpl::Finished | PhaseImpl::Error(_) => {}, 
                    _ => {
                        *phase = PhaseImpl::Error(err);
                    }
                }
            }
        }
    }

    async fn on_interest(&self, _chunk: &ChunkId, rel_path: &str, task_path: &str) -> BuckyResult<InterestUploadSource> {
        let rel_path = Path::new(rel_path);
        let chunk_index = rel_path.file_name().and_then(|n| n.to_str())
            .ok_or_else(|| BuckyError::new(BuckyErrorCode::InvalidInput, format!("invalid rel path {:?}", rel_path)))
            .and_then(|n| usize::from_str(n).map_err(|err| BuckyError::from(err)))?;
        let rel_path = rel_path.parent()
            .ok_or_else(|| BuckyError::new(BuckyErrorCode::InvalidInput, format!("invalid rel path {:?}", rel_path)))?;
        let abs_path = self.local_path().join(rel_path);
        let offset = chunk_index as u64 * CHUNK_SIZE as u64;
        self.delegate().on_pre_upload_file(self, &Path::new(rel_path), task_path).await;
        Ok(InterestUploadSource::File { path: abs_path.to_owned(), offset})
    }
}

struct ManagerImpl {
    stack: SharedCyfsStack, 
    sessions: RwLock<BTreeMap<ObjectId, BackupSrcSession>>
}

#[derive(Clone)]
pub struct SyncManager(Arc<ManagerImpl>);

struct WeakSyncManager(Weak<ManagerImpl>);

impl std::fmt::Display for SyncManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SyncManager{{local:{}}}", self.stack().local_device_id())
    }
}

impl SyncManager {
    pub async fn new(stack: &SharedCyfsStack) -> BuckyResult<Self> {
        let manager = Self(Arc::new(ManagerImpl {
            stack: stack.clone(), 
            sessions: RwLock::new(BTreeMap::new())
        }));

        let _ = manager.listen().await?;
        Ok(manager)
    }

    fn from_weak(weak: &WeakSyncManager) -> Option<Self> {
        weak.0.upgrade().map(|s| Self(s))
    }

    fn to_weak(&self) -> WeakSyncManager {
        WeakSyncManager(Arc::downgrade(&self.0))
    }

    async fn listen(&self) -> BuckyResult<()> {
        struct OnSyncChunk(SyncManager);

        #[async_trait::async_trait]
        impl EventListenerAsyncRoutine<RouterHandlerInterestRequest, RouterHandlerInterestResult> for OnSyncChunk {
            async fn call(&self, param: &RouterHandlerInterestRequest) -> BuckyResult<RouterHandlerInterestResult> {
                let task_path = param.request.group_path.as_ref().unwrap();
                info!("{} got interest task_path={}", self.0, task_path);
                let mut parts = task_path.split("/").skip(2);

                let id_str = parts.next()
                    .ok_or_else(|| BuckyError::new(BuckyErrorCode::InvalidInput, format!("invalid task path {}", task_path)))?; 
                
                let rel_parts: Vec<_> = parts.collect();
                let rel_path = rel_parts.join("/");

                let dir_id = ObjectId::from_str(id_str)?;
                let session = self.0.session_of(&dir_id, &param.request.from_channel)
                    .ok_or_else(|| BuckyError::new(BuckyErrorCode::InvalidInput, format!("dir {} to {} not found", dir_id, param.request.from_channel)))?; 
                
                let source = session.on_interest(&param.request.chunk, &rel_path, task_path).await?;
                Ok(RouterHandlerInterestResult {
                    action: RouterHandlerAction::Response,
                    request: None,
                    response: Some(Ok(InterestHandlerResponse::Upload {
                            source, 
                            groups: vec![task_path.to_owned()]
                        }))
                })
            }
        }

        let system_stack = self.stack()
            .fork_with_new_dec(Some(cyfs_core::get_system_dec_app().to_owned()))
            .await.map_err(|err| {
                error!("{} listen failed, err=add access {}", self, err);
                err
            })?;

        let meta = system_stack.root_state_meta_stub(None, None);
       
        let item = GlobalStatePathAccessItem {
            path: "/.cyfs/api/handler/ndn/interest/".to_owned(),
            access: GlobalStatePathGroupAccess::Specified(GlobalStatePathSpecifiedGroup {
                zone: None,
                zone_category: Some(DeviceZoneCategory::CurrentZone),
                dec: self.stack().dec_id().cloned(),
                access: AccessPermissions::WriteOnly as u8,
            }),
        };

        meta.add_access(item)
            .await.map_err(|err| {
                error!("{} listen failed, err=add access {}", self, err);
                err
            })?;

        let _ = self.stack().router_handlers().interest().add_handler(
            RouterHandlerChain::NDN, 
            "OnSyncChunk", 
            0, 
            Some(format!("group_path=='{}/in_zone_sync/**'", self.stack().dec_id().unwrap())), 
            None, 
            RouterHandlerAction::Reject, 
            Some(Box::new(OnSyncChunk(self.clone())))
        ).await.map_err(|err| {
            error!("{} listen failed, err=add interest handler failed {}", self, err);
            err 
        })?;

        Ok(())
    }

    fn session_of(&self, dir_id: &ObjectId, dst: &DeviceId) -> Option<BackupSrcSession> {
        let sessions = self.0.sessions.read().unwrap();
        sessions.get(dir_id).and_then(|session| if session.target().eq(dst) { Some(session.clone()) } else { None })
    }

    fn req_path_of(session: &BackupSrcSession) -> String {
        ["in_zone_sync", session.local_path().to_str().unwrap()].join("/")
    }

    fn task_path_of(session: &BackupSrcSession) -> Option<String> {
        session.task_path().map(|path| ["in_zone_sync".to_owned(), path].join("/"))
    }

    async fn on_post_publish(&self, session: &BackupSrcSession) {
        let exists = {
            let mut sessions = self.0.sessions.write().unwrap();
            sessions.insert(session.dir_id().unwrap(), session.clone())
        };
        if let Some(exists) = exists {
            if !exists.ptr_eq(session) {
                exists.cancel_by_error(BuckyError::new(BuckyErrorCode::UserCanceled, "user canceled"));
            } else {
                return;
            }
        }

        let manager = self.clone();
        let session = session.clone();
        task::spawn(async move {
            let _ = session.wait_finish().await;
            manager.sync_with_session_state(&session);
        });
    }

    fn sync_with_session_state(&self, session: &BackupSrcSession) {
        let mut sessions = self.0.sessions.write().unwrap();
        if sessions.get(&session.dir_id().unwrap()).and_then(|exists| if exists.ptr_eq(session) { Some(exists) } else { None }).is_some() {
            let _ = sessions.remove(&session.dir_id().unwrap());
        }
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    pub async fn create_session<T: 'static + BackupSrcDelegate>(
        &self, 
        local_path: &Path, 
        dir_id: Option<ObjectId>, 
        delegate: T
    ) -> BuckyResult<BackupSrcSession> {
        let req = UtilGetOODStatusRequest::new();
        let ood_info = self.stack().util().get_ood_status(req.clone()).await
            .map_err(|err| {
                error!("{} create session failed, err=get ood status {}", self, err);
                err
            })?;
        let session = BackupSrcSession::new(
            self, 
            ood_info.status.ood_device_id, 
            local_path, 
            dir_id, 
            delegate);

        Ok(session)
    }
}