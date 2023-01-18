use std::{
    sync::{Arc, RwLock}, 
    path::{Path, PathBuf}, 
};
use async_std::{
    task
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
    local_path: PathBuf, 
    delegate: Box<dyn SrcSyncDelegate>, 
    dir_id: RwLock<OnceCell<ObjectId>>,  
    phase: RwLock<PhaseImpl>, 
}


#[derive(Clone)]
pub struct SrcSyncSession(Arc<SessionImpl>);

impl SrcSyncSession {
    fn new(
        stack: &SharedCyfsStack, 
        local_path: &Path, 
        dir_id: Option<ObjectId>, 
        delegate: Box<dyn SrcSyncDelegate>
    ) -> Self {
        Self(Arc::new(SessionImpl {
            stack: stack.clone(), 
            local_path: PathBuf::from(local_path), 
            delegate, 
            dir_id: RwLock::new(if let Some(dir_id) = dir_id {
                OnceCell::from(dir_id)
            } else {
                OnceCell::new()
            }), 
            phase: RwLock::new(PhaseImpl::Init)
        }))
    }

    pub fn state(&self) -> SrcSyncSessionPhase {
        let phase = self.0.phase.read().unwrap();
        match &*phase {
            PhaseImpl::Init => SrcSyncSessionPhase::Init, 
            PhaseImpl::Publishing => SrcSyncSessionPhase::Running,  
            PhaseImpl::Pushing => SrcSyncSessionPhase::Running, 
            PhaseImpl::Uploading { .. } => SrcSyncSessionPhase::Running, 
            PhaseImpl::Finished => SrcSyncSessionPhase::Running, 
            PhaseImpl::Error(err) => SrcSyncSessionPhase::Running, 
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

    pub fn delegate(&self) -> &dyn SrcSyncDelegate {
        self.0.delegate.as_ref()
    }

    pub fn dir_id(&self) -> Option<ObjectId> {
        self.0.dir_id.read().unwrap().get().cloned()
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
        unimplemented!()
    }

    async fn publish(&self) {
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
        let resp = self.stack().trans().publish_file(req).await?;
        Ok(resp.file_id)
    }

    async fn push_inner(&self, dir_id: &ObjectId) -> BuckyResult<()> {
        // let mut req = NONGetObjectRequest::new_noc(dir_id.clone(), None);
        // let resp = self.stack().non_service().get_object(req).await.unwrap();

        // let mut req = NONPostObjectOutputRequest::new_router(None, dir_id, q.to_vec().unwrap());
        unimplemented!()
    }

    async fn push(&self, dir_id: ObjectId) {
        match self.push_inner(&dir_id).await {
            Ok(dir_id) => {
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
    stack: SharedCyfsStack
}

#[derive(Clone)]
pub struct SyncManager(Arc<ManagerImpl>);

impl SyncManager {
    pub async fn new(stack: &SharedCyfsStack) -> Self {
        Self(Arc::new(ManagerImpl {
            stack: stack.clone()
        }))
    }

    pub fn create_session(
        &self, 
        local_path: &Path, 
        dir_id: Option<ObjectId>, 
        delegate: Box<dyn SrcSyncDelegate>
    ) -> BuckyResult<SrcSyncSession> {
        unimplemented!()
    }
}