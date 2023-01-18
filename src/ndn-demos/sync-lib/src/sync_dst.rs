use std::{
    sync::{Arc, RwLock, Mutex}, 
    path::{Path, PathBuf}, 
    task::{Context, Poll, Waker}, 
    pin::Pin
};
use async_std::{
    task
};
use cyfs_base::*;
use cyfs_core::*;
use cyfs_lib::*;
use cyfs_util::*;


#[async_trait::async_trait]
pub trait DstSyncDelegate: Send + Sync {
    fn clone_as_dst_sync_delegate(&self) -> Box<dyn DstSyncDelegate>;
    async fn on_pre_download(&self, task_path: &str);
    async fn on_pre_download_file(&self, rel_path: &Path, task_path: &str);
}

struct DownloadingIterator {
    rel_path: String, 
    chunk_index: usize, 
    chunk_id: ChunkId, 
}

enum SessionPhase {
    Waiting, 
    Downloading {
        delegate: Box<dyn DstSyncDelegate>, 
        iter: DownloadingIterator
    }, 
    Finished, 
    Error(BuckyError)
}

struct SessionImpl {
    stack: SharedCyfsStack, 
    dir_id: ObjectId, 
    local_path: PathBuf, 
}

#[derive(Clone)]
pub struct DstSyncSession(Arc<SessionImpl>);

impl DstSyncSession {
    fn new(
        stack: &SharedCyfsStack, 
        local_path: &Path, 
        dir_id: ObjectId, 
    ) -> Self {
        Self(Arc::new(SessionImpl {
            stack: stack.clone(), 
            local_path: PathBuf::from(local_path), 
            dir_id, 
        }))
    }

    fn stack(&self) -> &SharedCyfsStack {
        &self.0.stack
    }

    fn dir_id(&self) -> &ObjectId {
        &self.0.dir_id
    }

    
}


struct ListenerImpl {
    stack: SharedCyfsStack
}

#[derive(Clone)]
pub struct SyncListener(Arc<ListenerImpl>);

impl SyncListener {
    pub fn new(stack: &SharedCyfsStack) -> Self {
        Self(Arc::new(ListenerImpl {
            stack: stack.clone()
        }))
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
        unimplemented!()
    }
}