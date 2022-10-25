use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::{
    NamedDataCache, 
    TrackerCache
};
use cyfs_bdt::{
    Stack, 
    StackGuard, 
    StreamListenerGuard, 
    BuildTunnelParams, 
    TempSeqGenerator, 
    StreamGuard,
    DownloadTask, 
    DownloadTaskState, 
    StackOpenParams, 
    SingleDownloadContext, 
    download::DirTaskPathControl,
    local_chunk_store::LocalChunkWriter,
    local_chunk_store::LocalChunkListWriter,
    local_chunk_store::LocalChunkReader,
    mem_tracker::MemTracker,
    mem_chunk_store::MemChunkStore,
    ChunkWriter,
    ChunkWriterExt,
    ChunkListDesc,
};

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

static INIT: Once = Once::new();
static INIT_END: Once = Once::new();
pub async fn setup() -> () { 
    INIT.call_once(|| {
        //函数第一次执行会执行该部分内容
        let log_dir : String = "E:\\git_test\\cyfs-test-lab\\deploy\\log".to_string();
        #[cfg(debug_assertions)]
        let log_default_level = "debug";
        cyfs_debug::CyfsLoggerBuilder::new_app("bdt-unittest")
            .level(log_default_level)
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
        log::info!("before_all fun run");
    });
    //函数每次调用都会执行该部分
    log::info!("before_each fun run");
}
pub async fn teardown() -> () { 
    INIT_END.call_once(|| {
        log::info!("after_each fun run");
    });
}
use std::future::Future;
pub async fn run_test_async<F: Future>(test: F)
  {
    setup().await; 
   // test();
    let result =  move ||{
        async move {
            test.await;
        }
        
    };
    result().await;

    teardown().await;  
}

//<F: FnOnce() -> R + UnwindSafe, R>(f: F) -> Result<R>
pub async fn run_test<T>(test: T) ->  ()
    where T: FnOnce() -> () + panic::UnwindSafe
{
    setup().await; 
    let result = panic::catch_unwind(move ||{
        async move{
            test();
        }
        
    });
    teardown().await;  
    assert!(result.is_ok());
}

pub async fn load_sn(snList:Vec<PathBuf>)->Vec<Device>{
    let mut sns = Vec::new();
    for sn_desc_path in snList{
        let path = format!("{:?}", &sn_desc_path);
        let mut file = std::fs::File::open(sn_desc_path.clone()).map_err(|e| {
            log::error!("open sn desc failed on create, path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        log::info!("load sn file success,path =  {}",sn_desc_path.display());
        let mut buf = Vec::<u8>::new();
        let _ = file.read_to_end(&mut buf).map_err(|e| {
            log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        let (device, _) = Device::raw_decode(buf.as_slice()).map_err(|e| {
            log::error!("decode sn failed on create, path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        log::info!("sn device decode success,sn object id =  {}",device.desc().calculate_id());
        sns.push(device);
    }
    sns
    
}
pub async fn load_pn(pnList:Vec<PathBuf>)->Vec<Device>{
    let mut active_pn = Vec::new();
    for pn_desc_path in pnList{
        let path = format!("{:?}", &pn_desc_path);
        let mut file = std::fs::File::open(pn_desc_path).map_err(|e| {
            log::error!("open pn desc failed on create, path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        let mut buf = Vec::<u8>::new();
        let _ = file.read_to_end(&mut buf).map_err(|e| {
            log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        let (device, _) = Device::raw_decode(buf.as_slice()).map_err(|e| {
            log::error!("decode pn failed , path={:?}, e={}", path.as_str(), &e);
            e
        }).unwrap();
        active_pn.push(device);
    }
    active_pn

}
pub async fn create_device(endpoints:Vec<String>,sns:Vec<Device>,pns:Vec<Device>,save_path:Option<PathBuf>)->(Device,PrivateKey){
    let mut eps = Vec::new();
    for addr in endpoints.iter() {
        let ep = {
            let s = format!("{}",addr);
            Endpoint::from_str(s.as_str()).map_err(|e| {
                log::error!("parse ep failed, s={}, e={}",s, &e);
                e
            }).unwrap()
        };
        log::info!("create device add ep: {}", &ep);
        eps.push(ep);
    }
    let mut sn_list = Vec::new();
    for sn in sns.iter() {
        sn_list.push(sn.desc().device_id());
    }
    let mut pn_list = Vec::new();
    for pn in pns.iter() {
        pn_list.push(pn.desc().device_id());
    }
    let private_key = PrivateKey::generate_rsa(1024).unwrap();
    let public_key = private_key.public();
    let mut device = Device::new(
        None,
        UniqueId::default(),
        eps,
        sn_list,
        pn_list,
        public_key,
        Area::default(),
        DeviceCategory::OOD
    ).build();
    let id = device.desc().device_id();
    let desc_path = format!("{}.desc",id);  
    let _ = match save_path.clone(){
        Some(my_path) =>{
            let file_obj_path = my_path.join(desc_path);
            let _ = match device.encode_to_file(file_obj_path.clone().as_path(),true){
                Ok(_) => {
                    log::info!("encode device to file succ ,path ={}", file_obj_path.display());
                },
                Err(e) => {
                    log::error!("encode device obj to file failed,path = {},err {}",file_obj_path.display(), e);
                },
            };
            let sec_path = format!("{}.sec",id.to_string());  
            let file_obj_path = my_path.join(sec_path);
            let _ = match private_key.encode_to_file(file_obj_path.clone().as_path(),true){
                Ok(_) => {
                    log::info!("encode device sec to file succ ,path ={}", file_obj_path.display());
                },
                Err(e) => {
                    log::error!("encode device sec to file failed,path = {},err {}",file_obj_path.display(), e);
                },
            };
        },
        None => {},
    };
    
    (device, private_key)
}

pub async fn load_device(device_path:PathBuf,name:String)->(Device,PrivateKey){
    let desc = format!("{}.desc",name);
    let sec = format!("{}.sec",name);
    let device_desc_path = device_path.join(desc); 
    let device_sec_path = device_path.join(sec); 
    let mut file = std::fs::File::open(device_desc_path.clone()).map_err(|e| {
        log::error!("open peer desc failed on create, path={:?}, e={}", device_desc_path.display(), &e);
        e
    }).unwrap();
    let mut buf = Vec::<u8>::new();
    let _ = file.read_to_end(&mut buf);
    let (device, _) = Device::raw_decode(buf.as_slice()).unwrap();
    let mut device = device;
    let path = format!("{:?}", &device_sec_path);
    let mut file = std::fs::File::open(device_sec_path).map_err(|e| {
        log::error!("open key file failed on create, path={:?}, e={}", path.as_str(), &e);
        e
    }).unwrap();
    let mut buf = Vec::<u8>::new();
    let _ = file.read_to_end(&mut buf);
    let (private_key, _) = PrivateKey::raw_decode(buf.as_slice()).map_err(|e| {
        log::error!("decode key file failed on create, path={:?}, e={}", path.as_str(), &e);
        e
    }).unwrap();
    log::info!("load device {} success,deviceId = {}",name,device.desc().calculate_id().to_string());
    (device,private_key)
}
pub async fn load_stack(device:Device,private_key:PrivateKey,params:StackOpenParams)->(StackGuard,StreamListenerGuard){
    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
    let stack = Stack::open(
        device.clone(), 
        private_key, 
        params).await;
    if let Err(e) = stack.clone(){
        log::error!("init bdt stack error: {}", e);
    }
    let stack = stack.unwrap(); 
    let acceptor = stack.stream_manager().listen(0).unwrap();
    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
        Err(err) => {
            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
            1000
        },
        Ok(_) => {
            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
            0
        }
    };
    log::info!("BDT stack EP list");
    for  ep in stack.net_manager().listener().endpoints() {
        log::info!("device {} BDT stack EP: {}",stack.local_device_id(),ep);
    }
    (stack,acceptor)
}

pub async fn auto_accept(acceptor:StreamListenerGuard, answer :Vec<u8>){
    task::spawn(async move {
        log::info!("start auto_accept{}",acceptor);
        loop {
            let mut incoming = acceptor.incoming().next().await;
            log::info!("#### RN recv accept");
            let _ = match incoming{
                Some(stream)=>{
                    let _ = match stream{
                        Ok(pre_stream)=>{
                            let question = pre_stream.question;
                            log::info!("accept question succ, name={}",String::from_utf8(question.clone()).unwrap());
                            let resp = match pre_stream.stream.confirm(&answer).await{
                                Err(e)=>{
                                    log::error!("confirm err, err={}",e);
                                },
                                Ok(_)=>{
                                    log::info!("confirm succ");
                                }
                            };
                        },
                        Err(err) =>{
                            log::error!("accept question err ={}" ,err);
                        }
                    };                                
                },
                _ =>{
                    log::error!("bdt incoming.next() is None");
                }
            };
            
        }
    });
}