use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::*;
use cyfs_bdt::*;
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
use crate::test_tool::*;
use crate::bdt_stream::*;
use crate::bdt_ndn::*;






pub struct BDTClientImpl {
   pub  stack: Arc<Mutex<StackGuard>>,
   pub  acceptor: Arc<Mutex<StreamListenerGuard>>,
   pub  stream_tasks:  Arc<Mutex<StreamMap>>,
   pub  temp_dir: PathBuf, //工作目录
   pub  file_tasks: Arc<Mutex<FileTaskMap>>,
   //pub  dir_tasks: Arc<Mutex<DirTaskMap>>,
   pub  answer : Arc<Mutex<Vec<u8>>>,
}
#[derive(Clone)]
pub struct BDTClient(Arc<BDTClientImpl>);
impl BDTClient{
    pub fn new(stack: StackGuard, acceptor: StreamListenerGuard,temp_dir: PathBuf)->Self {
        let file_task_map = FileTaskMap::new();
        //let dir_task_map = DirTaskMap::new();
        //dir_tasks : Arc::new(Mutex::new(dir_task_map)),
        let stream_task_map = StreamMap::new();
        Self(Arc::new(BDTClientImpl{
            stack:Arc::new(Mutex::new(stack)),
            acceptor:Arc::new(Mutex::new(acceptor)),
            stream_tasks: Arc::new(Mutex::new(stream_task_map)),
            temp_dir: temp_dir,
            file_tasks: Arc::new(Mutex::new(file_task_map)),
          
            answer :Arc::new(Mutex::new(Vec::new())) 
        })) 
    }
    pub  fn set_answer(& self,answer :String){
        log::info!("{} update confirm answer data {}",self.get_stack().local_device_id(),answer.clone());
        let answer = answer.as_bytes().to_vec();
        let mut answer_self = self.0.answer.lock().unwrap();
        *answer_self = answer.clone();
    }
    pub fn get_answer(&self)-> Vec<u8>{
        self.0.answer.lock().unwrap().clone()
    }
    pub fn get_acceptor(&self)-> StreamListenerGuard{
        self.0.acceptor.lock().unwrap().clone()
    }
    pub fn get_stack(&self)-> StackGuard{
        self.0.stack.lock().unwrap().clone()
    }
    pub fn get_stream(&self,stream_name:&str)-> BDTConnection{
        self.0.stream_tasks.lock().unwrap().get_task(stream_name)
    }
    pub fn cache_stream(&self,stream_name:&str,stream:StreamGuard){
        self.0.stream_tasks.lock().unwrap().add_task(stream_name, stream);
    }
    pub fn auto_accept(&self){
        let client = self.clone();
        let acceptor = client.get_acceptor().clone();
        task::spawn(async move {
            loop {            
                let _ = match acceptor.incoming().next().await{
                    Some(stream)=>{
                        let _ = match stream{
                            Ok(pre_stream)=>{
                                log::info!("#### RN recv accept");
                                let question = pre_stream.question;
                                let id = format!("{}{}",pre_stream.stream.remote().0.object_id().to_string(),pre_stream.stream.sequence().value());
                                let stream = pre_stream.stream.clone();
                                client.cache_stream(id.as_str(), stream);
                                log::info!("accept question succ, len={},content = {:?}",question.len(),str::from_utf8(&question).unwrap());
                                let resp = match pre_stream.stream.confirm(&client.get_answer()).await{
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
                
            };
        
        });
        
        
    }
    // pub async fn create_accept_listener( &self,answer :String)->Result<(), BuckyError> {
    //     log::info!("{} start auto_accept",self.stack.lock().unwrap().local_device_id());
    //     let _ =  self.set_answer(answer);
    //     {
    //         task::spawn(async move {
    //             self.auto_accept().await;
    //         });
    //     }
    //     Ok(())
    // }

}



pub struct StackManager {
    BDTClient_map:  HashMap<String, BDTClient> ,
    temp_dir: PathBuf, //工作目录
}
//pub struct StackManager(Arc<StackManagerImpl>);

impl StackManager{
    pub fn new(temp_dir: PathBuf)->Self {
        let mut peer_map = HashMap::new();
        Self{
            BDTClient_map:peer_map,
            temp_dir:temp_dir, 
        }    
    }
    pub fn is_client_exists(&self, peer_name: &str) -> bool {
        self.BDTClient_map.contains_key(peer_name)
    }
    pub fn add_client(&mut self, peer_name:&str, stack:StackGuard ,acceptor:StreamListenerGuard) -> BuckyResult<()> {
        match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTClient::new(stack, acceptor, self.temp_dir.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "bdt stack already exists: {}",
                    peer_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_client(&mut self, peer_name: &str) -> Option<BDTClient> {
        self.BDTClient_map.remove(peer_name).map(|v| v)
    }

    pub fn get_client(&self, peer_name: &str) -> &BDTClient  {
        return self.BDTClient_map.get(peer_name).map(|v| v).unwrap()

    }
    pub async  fn create_test_stack_ipv4udp(&mut self,peer_name:&str,port:usize,SN_list:Option<Vec<PathBuf>>,PN_list:Option<Vec<PathBuf>>)->(Device,PrivateKey){

        // 加载配置中的SN中的配置
        let sn_list = match SN_list{
            Some(sns) =>{
                load_sn(sns).await
            },
            None =>{
                log::warn!("set sn list empty");
                Vec::new()
            }
        };
        let pn_list = match PN_list {
            Some(pns) =>{
                load_pn(pns).await
            },
            None =>{
                log::warn!("set pn list empty");
                Vec::new()
            } 
        };
        let mut eps1 = Vec::new();
        eps1.push(format!("L4udp192.168.100.74:{}",port));
        //eps1.push(format!("L4tcp192.168.100.74:{}",port+1));
        let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
        let (device,key) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),None).await;
        let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        // 已知Device 列表
        params.known_device = None; //
        params.known_sn = Some(sn_list.clone());
        params.active_pn = Some(pn_list.clone());
        params.passive_pn = Some(pn_list.clone());
        params.config.interface.udp.sn_only = false;
        params.tcp_port_mapping = None;
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(
            device.clone(), 
            key.clone(), 
            params).await;
        if let Err(e) = stack.clone(){
            log::error!("init bdt stack error: {}", e);
        }
        let  stack = stack.unwrap();   
        let  acceptor = stack.stream_manager().listen(0).unwrap();
        let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
            Err(err) => {
                log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                1000
            },
            Ok(_) => {
                log::info!("sn online success {}", device.desc().device_id());
                0
            }
        };
        let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
        log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
        let _ = match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTClient::new(stack, acceptor, self.temp_dir.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "bdt stack already exists: {}",
                    peer_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        };
        (device,key)
    }
    
    pub async  fn load_test_stack(&mut self,peer_name:&str,SN_list:Option<Vec<PathBuf>>,PN_list:Option<Vec<PathBuf>>)->(Device,PrivateKey){

        let sn_list = match SN_list{
            Some(sns) =>{
                load_sn(sns).await
            },
            None =>{
                log::warn!("set sn list empty");
                Vec::new()
            }
        };
        let pn_list = match PN_list {
            Some(pns) =>{
                load_pn(pns).await
            },
            None =>{
                log::warn!("set pn list empty");
                Vec::new()
            } 
        };
        let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
        let (device,key) = load_device(save_path,peer_name.to_string()).await;
        let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        // 已知Device 列表
        params.known_device = None; //
        params.known_sn = Some(sn_list.clone());
        params.active_pn = Some(pn_list.clone());
        params.passive_pn = Some(pn_list.clone());
        params.config.interface.udp.sn_only = false;
        params.tcp_port_mapping = None;
        // let tracker = MemTracker::new();
        // let store = MemChunkStore::new(NamedDataCache::clone(&tracker).as_ref());
        // params.chunk_store = Some(store.clone_as_reader());
        // params.ndc = Some(NamedDataCache::clone(&tracker));
        // params.tracker = Some(TrackerCache::clone(&tracker));
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(
            device.clone(), 
            key.clone(), 
            params).await;
        if let Err(e) = stack.clone(){
            log::error!("init bdt stack error: {}", e);
        }
        let  stack = stack.unwrap();   
        let  acceptor = stack.stream_manager().listen(0).unwrap();
        let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
            Err(err) => {
                log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                1000
            },
            Ok(_) => {
                log::info!("sn online success {}", device.desc().device_id());
                0
            }
        };
        let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
        log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
        let _ = match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTClient::new(stack, acceptor, self.temp_dir.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "bdt stack already exists: {}",
                    peer_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        };
        (device,key)
    }

    pub async  fn load_test_stack_tcp(&mut self,peer_name:&str,SN_list:Option<Vec<PathBuf>>,PN_list:Option<Vec<PathBuf>>)->(Device,PrivateKey){

        let sn_list = match SN_list{
            Some(sns) =>{
                load_sn(sns).await
            },
            None =>{
                log::warn!("set sn list empty");
                Vec::new()
            }
        };
        let pn_list = match PN_list {
            Some(pns) =>{
                load_pn(pns).await
            },
            None =>{
                log::warn!("set pn list empty");
                Vec::new()
            } 
        };
        let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
        let (device,key) = load_device(save_path,peer_name.to_string()).await;
        let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        // 已知Device 列表
        params.known_device = None; //
        params.known_sn = Some(sn_list.clone());
        params.active_pn = Some(pn_list.clone());
        params.passive_pn = Some(pn_list.clone());
        params.config.interface.udp.sn_only = true;
        params.tcp_port_mapping = None;
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(
            device.clone(), 
            key.clone(), 
            params).await;
        if let Err(e) = stack.clone(){
            log::error!("init bdt stack error: {}", e);
        }
        let  stack = stack.unwrap();   
        let  acceptor = stack.stream_manager().listen(0).unwrap();
        let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
            Err(err) => {
                log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                1000
            },
            Ok(_) => {
                log::info!("sn online success {}", device.desc().device_id());
                0
            }
        };
        let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
        log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
        let _ = match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTClient::new(stack, acceptor, self.temp_dir.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "bdt stack already exists: {}",
                    peer_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        };
        (device,key)
    }

    pub async fn sleep(& mut self,time:usize){
        let mut time = time;
        while time>0  {
            time = time -1;
            log::trace!("wait 1 s");
            async_std::task::sleep(Duration::from_millis(1000)).await;
        };
    }
    pub async fn create_device(
        &mut self,
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
    
    pub async  fn create_stack(&mut self,peer_name:&str,endpoints: Vec<String>,area:Area,SN_list:Option<Vec<PathBuf>>,PN_list:Option<Vec<PathBuf>>)->(Device,PrivateKey){

        // 加载配置中的SN中的配置
        let sn_list = match SN_list{
            Some(sns) =>{
                load_sn(sns).await
            },
            None =>{
                log::warn!("{} set sn list empty",&peer_name);
                Vec::new()
            }
        };
        let pn_list = match PN_list {
            Some(pns) =>{
                load_pn(pns).await
            },
            None =>{
                log::warn!("{} set pn list empty",&peer_name);
                Vec::new()
            } 
        };
        let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
        let private_key = PrivateKey::generate_rsa(1024).unwrap();
        let (device,key) = self.create_device(peer_name.to_string(),endpoints,sn_list.clone(),pn_list.clone(),None,area,private_key).await;
        let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        // 已知Device 列表
        params.known_device = None; //
        params.known_sn = Some(sn_list.clone());
        params.active_pn = Some(pn_list.clone());
        params.passive_pn = Some(pn_list.clone());
        params.config.interface.udp.sn_only = false;
        params.tcp_port_mapping = None;
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(
            device.clone(), 
            key.clone(), 
            params).await;
        if let Err(e) = stack.clone(){
            log::error!("{}init bdt stack error: {}",&peer_name, e);
        }
        let  stack = stack.unwrap();   
        let  acceptor = stack.stream_manager().listen(0).unwrap();
        let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
            Err(err) => {
                log::error!("{} sn online timeout {}.err= {}",&peer_name, device.desc().device_id(),err);
                1000
            },
            Ok(_) => {
                log::info!("{} sn online success {}",&peer_name, device.desc().device_id());
                let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                0
            }
        };
        for sn in stack.sn_client().sn_list(){
            log::info!("{} sn list:{}",&peer_name,sn.object_id().to_string());
        }
        let _ = match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTClient::new(stack, acceptor, self.temp_dir.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "bdt stack already exists: {}",
                    peer_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        };
        (device,key)
    }
    
    pub async fn destory_all(& mut self){
        for client in self.BDTClient_map.values_mut(){
            client.0.stack.lock().unwrap().close();
        }
        self.BDTClient_map = HashMap::new();
    }
}