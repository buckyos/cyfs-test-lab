use log::*;
use std::{
    sync::{Arc, Weak, RwLock}, 
    path::{Path, PathBuf}, 
    collections::HashMap
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

struct UploadingIterator {
    rel_path: String, 
    chunk_index: usize, 
    chunk_id: ChunkId, 
}

pub enum SrcSyncSessionPhase {
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
pub trait SrcSyncDelegate: Send + Sync {
    async fn on_post_publish(&self, session: &SrcSyncSession, dir_id: &ObjectId);
    async fn on_pre_upload(&self, session: &SrcSyncSession, task_path: &str);
    async fn on_pre_upload_file(&self, session: &SrcSyncSession, rel_path: &Path, task_path: &str);
}


struct SessionImpl {
    stack: SharedCyfsStack, 
    manager: WeakSyncManager, 
    target: DeviceId, 
    local_path: PathBuf, 
    delegate: Box<dyn SrcSyncDelegate>, 
    dir_id: RwLock<OnceCell<ObjectId>>,  
    phase: RwLock<PhaseImpl>, 
}


#[derive(Clone)]
pub struct SrcSyncSession(Arc<SessionImpl>);

impl std::fmt::Display for SrcSyncSession {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SrcSyncSession{{target:{}, local_path:{:?}, dir_id:{:?}}}", self.target(), self.local_path(), self.dir_id())
    }
}

impl SrcSyncSession {
    fn new<T: 'static + SrcSyncDelegate>(
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

    pub fn state(&self) -> SrcSyncSessionPhase {
        let phase = self.0.phase.read().unwrap();
        match &*phase {
            PhaseImpl::Init => SrcSyncSessionPhase::Init, 
            PhaseImpl::Publishing => SrcSyncSessionPhase::Running,  
            PhaseImpl::Pushing => SrcSyncSessionPhase::Running, 
            PhaseImpl::Uploading { .. } => SrcSyncSessionPhase::Running, 
            PhaseImpl::Finished => SrcSyncSessionPhase::Finished, 
            PhaseImpl::Error(err) => SrcSyncSessionPhase::Error(err.clone()), 
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

    pub fn delegate(&self) -> &dyn SrcSyncDelegate {
        self.0.delegate.as_ref()
    }

    pub fn dir_id(&self) -> Option<ObjectId> {
        self.0.dir_id.read().unwrap().get().cloned()
    }

    pub fn task_path(&self) -> Option<String> {
        self.dir_id().map(|id| [id.to_string(), self.local_path().to_str().unwrap().to_owned()].join("/"))
    }


    pub fn target(&self) -> &DeviceId {
        &self.0.target
    }

    fn set_dir_id(&self, dir_id: ObjectId) {
        let _ = self.0.dir_id.write().unwrap().set(dir_id);
    }

    fn stack(&self) -> &SharedCyfsStack {
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
            chunk_size: 4 * 1024 * 1024,
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
        let resp = self.stack().non_service().post_object(req).await
            .map_err(|err| {
                error!("{} push failed, err=post object {}", self, err);
                err
            })?;
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
}

struct ManagerImpl {
    stack: SharedCyfsStack, 
    sessions: RwLock<HashMap<String, SrcSyncSession>>
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
    pub fn new(stack: &SharedCyfsStack) -> BuckyResult<Self> {
        let manager = Self(Arc::new(ManagerImpl {
            stack: stack.clone(), 
            sessions: RwLock::new(HashMap::new())
        }));

        let _ = manager.listen()?;
        Ok(manager)
    }

    fn from_weak(weak: &WeakSyncManager) -> Option<Self> {
        weak.0.upgrade().map(|s| Self(s))
    }

    fn to_weak(&self) -> WeakSyncManager {
        WeakSyncManager(Arc::downgrade(&self.0))
    }

    fn listen(&self) -> BuckyResult<()> {
        Ok(())
    }

    fn req_path_of(session: &SrcSyncSession) -> String {
        ["in_zone_sync", session.local_path().to_str().unwrap()].join("/")
    }

    fn task_path_of(session: &SrcSyncSession) -> Option<String> {
        session.task_path().map(|path| ["in_zone_sync".to_owned(), path].join("/"))
    }

    async fn on_post_publish(&self, session: &SrcSyncSession) {
        let exists = {
            let mut sessions = self.0.sessions.write().unwrap();
            sessions.insert(session.task_path().unwrap(), session.clone())
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

    fn sync_with_session_state(&self, session: &SrcSyncSession) {
        let mut sessions = self.0.sessions.write().unwrap();
        if sessions.get(&session.task_path().unwrap()).and_then(|exists| if exists.ptr_eq(session) { Some(exists) } else { None }).is_some() {
            let _ = sessions.remove(&session.task_path().unwrap());
        }
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    pub async fn create_session<T: 'static + SrcSyncDelegate>(
        &self, 
        local_path: &Path, 
        dir_id: Option<ObjectId>, 
        delegate: T
    ) -> BuckyResult<SrcSyncSession> {
        let req = UtilGetOODStatusRequest::new();
        let ood_info = self.stack().util().get_ood_status(req.clone()).await
            .map_err(|err| {
                error!("{} create session failed, err=get ood status {}", self, err);
                err
            })?;
        let session = SrcSyncSession::new(
            self, 
            ood_info.status.ood_device_id, 
            local_path, 
            dir_id, 
            delegate);

        Ok(session)
    }
}