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
    
    listen_sync();
    start_sync().await;
 
}


fn listen_sync() {
    let dst_stack = TestLoader::get_shared_stack(DeviceIndex::User1OOD);
    let listener = SyncListener::new(&dst_stack);

    task::spawn(async move {
        let mut incoming = listener.incoming();
        loop {
            let session = incoming.next().await.unwrap().unwrap();
            
        }
    });
}

async fn start_sync() {
    let src_stack = TestLoader::get_shared_stack(DeviceIndex::User1Device1);
    let manager = SyncManager::new(&src_stack).await;
    
    let local_path = Path::new("./");
    
    struct LoggerDelegate {
    }

    #[async_trait::async_trait]
    impl SrcSyncDelegate for LoggerDelegate {
        async fn on_post_publish(&self, session: &SrcSyncSession, dir_id: &ObjectId) {
            
        }

        async fn on_pre_upload(&self, session: &SrcSyncSession, task_path: &str) {

        }

        async fn on_pre_upload_file(&self, session: &SrcSyncSession, rel_path: &Path, task_path: &str) {

        }
    }
    
    let session = manager.create_session(
        &local_path, 
        None, 
        Box::new(LoggerDelegate {})
    ).unwrap();
    
    let _ = session.wait_finish().await.unwrap();
}