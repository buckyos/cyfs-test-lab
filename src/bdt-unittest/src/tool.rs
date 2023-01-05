use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::*;
use cyfs_bdt::*;
use rand::Rng;
use std::{
    str::FromStr, 
    path::{Path, PathBuf}, 
    io::{Read, Write}, 
    sync::{Mutex}, 
    time::{Duration, Instant},
    collections::{HashMap,hash_map,BTreeSet},
    convert::TryFrom,
    borrow::Cow,
    
};
use async_std::{
    sync::Arc, 
    task, 
    fs::File, 
    io::prelude::*,
    future, stream::StreamExt, 
};
use actix_rt;
use std::*;
use std::sync::Once; 
use std::fs::OpenOptions;

static INIT: Once = Once::new();
static INIT_END: Once = Once::new();
pub async fn setup(testcaseName:&str) -> () { 
    INIT.call_once(|| {
        
        //函数第一次执行会执行该部分内容
        let log_dir : String = "C:\\cyfs\\cyfs-test-lab\\deploy\\log".to_string();
        let url = "https://oapi.dingtalk.com/robot/send?access_token=336c5b9e11d6450539b3ac4b765f4559caac2bd3bda6abd67b0a1970ec7376c8";
        #[cfg(debug_assertions)]
        //let log_default_level = "info";
        cyfs_debug::CyfsLoggerBuilder::new_app("bdt-unittest")
            .level("info")
            .console("warn")
            .directory(log_dir.clone())
            .build()
            .unwrap()
            .start();
        //panic异常捕获
        cyfs_debug::PanicBuilder::new("bdt-unittest", "bdt-unittest")
            .exit_on_panic(true)
            .build()
            .start();
        log::info!("########################## Before all testcase init ##########################");
        
    });
    //函数每次调用都会执行该部分
    log::info!("########################## Testcase {} start running ##########################",testcaseName);
}
pub async fn teardown(testcaseName:&str) -> () { 
    INIT_END.call_once(|| {
        log::info!("########################## All testcase run finished ##########################");
    });
    log::info!("########################## Testcase {} run finished ##########################",testcaseName);
}
use std::future::Future;
pub async fn run_test_async<F: Future>(testcaseName:&str,test: F){
    setup(testcaseName).await; 
   // test();
    let result = move ||{
        async move {
            test.await
        } 
    };
    result().await;
    teardown(testcaseName).await;  
    log::info!("########################## Testcase return ##########################")
}

//<F: FnOnce() -> R + UnwindSafe, R>(f: F) -> Result<R>
pub async fn run_test<T>(testcaseName:&str,test: T) ->  ()
    where T: FnOnce() -> () + panic::UnwindSafe
{
    setup(testcaseName).await; 
    let result = panic::catch_unwind(move ||{
        async move{
            test();
        }
        
    });
    teardown(testcaseName).await;  
    assert!(result.is_ok());
}