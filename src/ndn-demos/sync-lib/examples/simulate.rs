use log::*;
use std::{
    path::{Path}, 
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
        .console("off")
        .enable_bdt(Some("debug"), Some("off"))
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
    struct LoggerDelegate {};

    #[async_trait::async_trait]
    impl DstSyncDelegate for LoggerDelegate {
        fn clone_as_dst_sync_delegate(&self) -> Box<dyn DstSyncDelegate> {
            Box::new(LoggerDelegate {})
        }

        async fn on_pre_download_chunk(&self, session: &DstSyncSession, iter: &DstSyncIterator, _task_path: &str) {
            println!("ood {} downloading file {:?}", session.stack().local_device_id(), session.local_path().join(&iter.rel_path));
        }

        async fn on_error(&self, session: &DstSyncSession, err: BuckyError) {
            println!("{} failed, err={}", session, err);
        }

        async fn on_finish(&self, session: &DstSyncSession) {
            println!("{} finished", session);
        }
    }

    let dst_stack = TestLoader::get_shared_stack(DeviceIndex::User1OOD);
    let listener = SyncListener::new(&dst_stack, 10).await.unwrap();

    let mut incoming = listener.incoming();
    loop {
        let session = incoming.next().await.unwrap().unwrap();
        println!("ood {} begin sync dir id {} path {:?} from device {}", session.stack().local_device_id(), session.dir_id(), session.local_path(), session.source());
        session.start(LoggerDelegate {});
    }
}

async fn start_sync() {
    let src_stack = TestLoader::get_shared_stack(DeviceIndex::User1Device1);
    let manager = SyncManager::new(&src_stack).await.unwrap();
    
    let local_path = Path::new("H:/depends");
    
    struct LoggerDelegate {
    }

    #[async_trait::async_trait]
    impl SrcSyncDelegate for LoggerDelegate {
        async fn on_post_publish(&self, session: &SrcSyncSession, dir_id: &ObjectId) {
            println!("deivce {} published sync dir {:?} object {}", session.stack().local_device_id(), session.local_path(), dir_id);
        }

        async fn on_post_push(&self, session: &SrcSyncSession) {
            println!("deivce {} post object {} to ood", session.stack().local_device_id(), session.dir_id().unwrap());
        }

        async fn on_pre_upload_file(&self, session: &SrcSyncSession, rel_path: &Path, task_path: &str) {
            println!("{} pre-upload file, file_path={:?}, task_path={}", session, rel_path, task_path);
        }
    }
    
    let session = manager.create_session(
        &local_path, 
        None, 
        LoggerDelegate {}
    ).await.unwrap();

    println!("deivce {} begin sync dir {:?}", src_stack.local_device_id(), session.local_path());
    
    let _ = session.start().unwrap();
    let _ = session.wait_finish().await.unwrap();
}