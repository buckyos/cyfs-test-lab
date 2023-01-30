use log::*;
use std::{
    path::{Path}
};
use async_std::{
    task
};
use futures::StreamExt;
use cyfs_debug::*;
use cyfs_base::*;
use zone_simulator::{self, *};
use ndn_demo_sync_lib::*;

#[async_std::main]
async fn main() {
    CyfsLoggerBuilder::new_app("ndn-demos-sync")
        .level("debug")
        .console("debug")
        .enable_bdt(Some("error"), Some("error"))
        .disable_file_config(true)
        .file(true)
        .build()
        .unwrap()
        .start();

    PanicBuilder::new("tests", "ndn-demos-sync")
        .exit_on_panic(true)
        .build()
        .start();


    zone_simulator::TEST_PROFILE.load();
    let stack_config = zone_simulator::CyfsStackInsConfig::default();
    zone_simulator::TestLoader::load_default(&stack_config).await;
    
    task::spawn(listen_sync());
    start_sync().await;
 
}


async fn listen_sync() {
    struct LoggerDelegate {
    }

    #[async_trait::async_trait]
    impl DstSyncDelegate for LoggerDelegate {
        fn clone_as_dst_sync_delegate(&self) -> Box<dyn DstSyncDelegate> {
            Box::new(LoggerDelegate {})
        }

        async fn on_pre_download(&self, session: &DstSyncSession, task_path: &str) {
            info!("{} pre-download with task group, group_path={}", session, task_path);
        }

        async fn on_pre_download_chunk(&self, session: &DstSyncSession, iter: &DstSyncIterator, task_path: &str) {
            info!("{} pre-download with task group, group_path={}", session, task_path);
        }
    }

    let dst_stack = TestLoader::get_shared_stack(DeviceIndex::User1OOD);
    let listener = SyncListener::new(&dst_stack).await.unwrap();

    let mut incoming = listener.incoming();
    loop {
        let session = incoming.next().await.unwrap().unwrap();
        session.start(LoggerDelegate {});
    }
}

async fn start_sync() {
    let src_stack = TestLoader::get_shared_stack(DeviceIndex::User1Device1);
    let manager = SyncManager::new(&src_stack).unwrap();
    
    let local_path = Path::new("H:/depends");
    
    struct LoggerDelegate {
    }

    #[async_trait::async_trait]
    impl SrcSyncDelegate for LoggerDelegate {
        async fn on_post_publish(&self, session: &SrcSyncSession, dir_id: &ObjectId) {
            info!("{} has published object, id={}", session, dir_id);
        }

        async fn on_pre_upload(&self, session: &SrcSyncSession, task_path: &str) {
            info!("{} pre-upload with task group, group_path={}", session, task_path);

        }

        async fn on_pre_upload_file(&self, session: &SrcSyncSession, rel_path: &Path, task_path: &str) {
            info!("{} pre-upload file, file_path={:?}, task_path={}", session, rel_path, task_path);
        }
    }
    
    let session = manager.create_session(
        &local_path, 
        None, 
        LoggerDelegate {}
    ).await.unwrap();
    
    let _ = session.start().unwrap();
    let _ = session.wait_finish().await.unwrap();
}