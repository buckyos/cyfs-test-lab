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
        let desc_info = device.desc().object_id().info();
        if let ObjectIdInfo::Standard(obj) = desc_info {
            let tmp_area = obj.area.unwrap();
            log::info!("sn area = {}",tmp_area);
        } 
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
pub async fn create_device(name:String,endpoints:Vec<String>,sns:Vec<Device>,pns:Vec<Device>,save_path:Option<PathBuf>)->(Device,PrivateKey){
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
        let mut run = 0;
        while run>0 {
            pn_list.push(pn.desc().device_id());
            run = run - 1;
        }
        
    }
    //1024
    let private_key = PrivateKey::generate_secp256k1().unwrap();
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
    let desc_path = format!("{}.desc",name.clone());  
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
            let sec_path = format!("{}.sec",name.clone());  
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


pub async fn create_device_area(
    name:String,
    endpoints:Vec<String>,
    sns:Vec<Device>,
    pns:Vec<Device>,
    save_path:Option<PathBuf>,
    area:Area,
    private_key:PrivateKey
)->(Device,PrivateKey){
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
    //let private_key = PrivateKey::generate_rsa(1024).unwrap();
    let public_key = private_key.public();
    let mut device = Device::new(
        None,
        UniqueId::default(),
        eps,
        sn_list,
        pn_list,
        public_key,
        area,
        DeviceCategory::OOD
    ).build();
    let id = device.desc().device_id();
    let desc_path = format!("{}.desc",name.clone());  
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
            let sec_path = format!("{}.sec",name.clone());  
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
pub async fn random_mem(piece: usize, count: usize) -> (usize, Vec<u8>) {
    let mut buffer = vec![0u8; piece * count];
    for i in 0..count {
        let r = rand::random::<u64>();
        buffer[i * 8..(i + 1) * 8].copy_from_slice(&r.to_be_bytes());
    }
    (piece * count, buffer)
}
pub async fn random_str(len : usize) -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    let str_info: String = (0..len)
        .map(|_| {
            let idx = rng.gen_range(0, CHARSET.len());
            // 这是安全的，因为 `idx` 会在 `CHARSET` 的范围内。
            char::from(unsafe { *CHARSET.get_unchecked(idx) }) // 来自用户的所有输入，最好都定义为不安全的。
        })
        .collect();
    str_info
}

pub async fn random_file(file_path : &str ,file_name : &str ,len : usize) -> String {
    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
    let file_path = file_path.to_string() + "\\" + file_name;
    let mut file = File::create(file_path.clone()).await.unwrap();
    // 大素数作为随机值
    let randcache = random_str(1000037).await;
    let randcache = randcache.as_bytes();
    let mut cache_size = randcache.len();
    let mut size = len;
    while size>cache_size{
        let _ = file.write(randcache).await;
        size = size - cache_size;
    }
    let other_data = random_str(size).await;
    let _ =  file.write(other_data.as_bytes()).await;
    let random_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
    log::info!("create random file time = {} ,path = {}",random_time,file_path.clone());
    file_path
}

pub fn random_int(min:usize,max:usize)->usize{
    rand::thread_rng().gen_range(min, max) as usize
    
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
                            log::info!("accept question succ, len={},content = {:?}",question.len(),str::from_utf8(&question).unwrap());
                            let resp = match pre_stream.stream.confirm(&answer.clone()).await{
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

pub async fn sleep(time:usize){
    let mut time = time;
    while time>0  {
        time = time -1;
        log::trace!("wait 1 s");
        async_std::task::sleep(Duration::from_millis(1000)).await;
    };
}