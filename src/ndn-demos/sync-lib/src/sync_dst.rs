use log::*;
use std::{
    sync::{Arc, RwLock, Mutex}, 
    path::{Path, PathBuf}, 
    task::{Context, Poll, Waker}, 
    pin::Pin, 
    str::FromStr
};
use async_std::{
    task
};
use cyfs_base::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_util::*;

pub struct DstSyncIterator {
    rel_path: String, 
    chunk_index: usize, 
    chunk_id: ChunkId, 
}

#[async_trait::async_trait]
pub trait DstSyncDelegate: Send + Sync {
    fn clone_as_dst_sync_delegate(&self) -> Box<dyn DstSyncDelegate>;
    async fn on_pre_download(&self, session: &DstSyncSession, task_path: &str);
    async fn on_pre_download_chunk(&self, session: &DstSyncSession, iter: &DstSyncIterator, task_path: &str);
}

enum SessionPhase {
    Waiting, 
    Downloading {
        delegate: Box<dyn DstSyncDelegate>, 
        iter: DstSyncIterator
    }, 
    Finished, 
    Error(BuckyError)
}

struct SessionImpl {
    stack: SharedCyfsStack, 
    dir_id: ObjectId,  
    source: DeviceId, 
    local_path: PathBuf
}

#[derive(Clone)]
pub struct DstSyncSession(Arc<SessionImpl>);

impl std::fmt::Display for DstSyncSession {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "DstSyncSession{{local:{}, dir_id:{}, source:{}, path:{:?}}}", self.stack().local_device_id(), self.dir_id(), self.source(), self.local_path())
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
            local_path 
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

    pub fn start<T: 'static + DstSyncDelegate>(&self, delegate: T) -> BuckyResult<()> {
        unimplemented!()
    }

}


struct ListenerImpl {
    stack: SharedCyfsStack
}

#[derive(Clone)]
pub struct SyncListener(Arc<ListenerImpl>);

impl std::fmt::Display for SyncListener {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SyncListener")
    }
}

impl SyncListener {
    pub async fn new(stack: &SharedCyfsStack) -> BuckyResult<Self> {
        let listener = Self(Arc::new(ListenerImpl {
            stack: stack.clone()
        }));

        let _ = listener.listen().await?;
        Ok(listener)
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    pub async fn listen(&self) -> BuckyResult<()> {
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
                let req = NONPutObjectRequest::new(
                    NONAPILevel::NOC, 
                    param.request.object.object_id.clone(), 
                    param.request.object.object_raw.clone());
                let _ = self.0.stack().non_service().put_object(req).await?;
                self.0.push_session(session);
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

        Ok(())
    }

    fn push_session(&self, session: DstSyncSession) {
        info!("{} pushed session = {}", self, session);
        unimplemented!()
    }

    pub fn incoming(&self) -> SessionIncoming {
        SessionIncoming(self.clone(), Arc::new(Mutex::new(IncommingState { result: None, waker: None, is_pending: false })))
    }
}


struct IncommingState {
    result: Option<Option<BuckyResult<DstSyncSession>>>,
    waker: Option<Waker>,
    is_pending: bool,
}

pub struct SessionIncoming(SyncListener, Arc<Mutex<IncommingState>>);

impl async_std::stream::Stream for SessionIncoming {
    type Item = BuckyResult<DstSyncSession>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<<Self as async_std::stream::Stream>::Item>> {
        Poll::Pending
    }
}