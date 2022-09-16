use cyfs_bdt::{Stack, StackGuard, StreamListenerGuard, BuildTunnelParams, TempSeqGenerator, StreamGuard,
     DownloadTask, DownloadTaskControl, TaskControlState, StackOpenParams, ChunkDownloadConfig};

use cyfs_base::{self, *};
use std::hash::Hash;
use std::str::FromStr;
use std::path::{Path, PathBuf};
use crate::server::cyfs_stack::command::{*};
use std::io::{Read, Write};
use std::sync::{Mutex};
//use futures::StreamExt;
use crate::lib::{*};
// mod lib;
use crate::lib::{Lpc,LpcCommand};
//use auto_test_util::{LpcCommand, Lpc};
use std::convert::TryFrom;
use rand::{Rng};
use crate::server::cyfs_stack::connection::TestConnection;
use futures::StreamExt;
use std::time::Duration;
use std::{
    collections::{HashMap,hash_map},
    sync::RwLock,
};
use async_std::{
    sync::Arc, 
    task, 
    fs::File, 
    io::prelude::*
};

use sha2::Digest;

//
#[derive(Clone)]
struct Task {
    task: Arc<Box<dyn DownloadTaskControl>>,
}

struct TaskMap {
    tasks_map: HashMap<String, Task>,
}

impl TaskMap {
    pub fn new() -> Self {
        Self {
            tasks_map: HashMap::new(),
        }
    }

    pub fn is_task_exists(&self, file_name: &str) -> bool {
        self.tasks_map.contains_key(file_name)
    }

    pub fn get_task_state(&self, file_name: &str) -> Option<TaskControlState> {
        let task = self.get_task(file_name);
        if task.is_some() {
            Some(task.unwrap().task.control_state())
        } else {
            None
        }
    }

    pub fn get_task(&self, file_name: &str) -> Option<Task> {
        self.tasks_map.get(file_name).map(|v| v.clone())
    }

    pub fn add_task(&mut self, file_name: &str, download_file_task: Box<dyn DownloadTaskControl>) -> BuckyResult<()> {
        match self.tasks_map.entry(file_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = Task { 
                    task: Arc::new(download_file_task) 
                };
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "download file task already exists: {}",
                    file_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_task(&mut self, file_name: &str) -> Option<Arc<Box<dyn DownloadTaskControl>>> {
        self.tasks_map.remove(file_name).map(|v| v.task)
    }
}


pub fn task_id_gen(s: String) -> String {
    let mut sha256 = sha2::Sha256::new();
    sha256.input(s.as_bytes());

    hex::encode(sha256.result().as_slice())
}

//
struct LazyComponents {
    acceptor: StreamListenerGuard,
    stack: StackGuard,
}

struct PeerImpl {
    lazy_components: Option<LazyComponents>, 
    stream_name_gen: TempSeqGenerator, 
    stream_manager: Mutex<Vec<TestConnection>>,
    temp_dir: PathBuf,
    tasks: Arc<Mutex<TaskMap>>,
    peer_name : String
}
#[derive(Clone)]
pub struct Peer(Arc<PeerImpl>);

impl Peer {
    pub fn new(peer_name :String ,temp_dir: String)->Self {
        let task_map = TaskMap::new();
        Self(Arc::new(PeerImpl {
            lazy_components: None, 
            stream_name_gen: TempSeqGenerator::new(), 
            stream_manager: Mutex::new(Vec::new()),
            temp_dir: PathBuf::from_str(temp_dir.as_str()).unwrap(),
            tasks: Arc::new(Mutex::new(task_map)),
            peer_name
        }))
    }
    pub fn on_sendCommand(&self, c: LpcCommand, lpc: Lpc) {
        
        log::info!("cyfs-stack-test on sendCommand, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        let peer_name = self.0.peer_name.clone(); 
        task::spawn(async move {
            // 这里进行相应的实际操作
            let resp = match SendCommandLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SendCommandLpcCommandReq failed, e={}", &e);
                    SendCommandLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        time: 0,
                        output_buff : Vec::new(),
                        output_num : 0,
                        output_str : "".to_string(),
                        peer_name,
                        name: "".to_string(),
                        system: "".to_string(),                   
                    }
                },
                Ok(c) => {
                    log::error!("convert command to SendCommandLpcCommandReq success");
                    let input_buff = c.input_buff;
                    let input_num = c.input_num;
                    let input_str = c.input_str;
                    let name = c.name;
                    let system = c.system;
                    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    SendCommandLpcCommandResp {
                        seq, 
                        result: 0,
                        time: begin_time as u32,
                        output_buff : input_buff,
                        output_num : input_num,
                        output_str : input_str,
                        peer_name,
                        name,
                        system                  
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
            
        });
        
    }
    pub fn on_startEvent(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("cyfs-stack-test on startEvent, c={:?}", &c);
        let seq = c.seq();
        let mut runNumber = 0;
        let mut lpc = lpc.clone();
        let mut peer_name = self.0.peer_name.clone();  
        //解析event 创建参数
        let mut result = match SendCommandLpcCommandReq::try_from(c) {
            Err(e) => {
                log::error!("convert command to SendCommandLpcCommandReq failed, e={}", &e);
            },
            Ok(c) => {

                log::info!("convert command to SendCommandLpcCommandReq success");

            }
        };
        task::spawn(async move {
            loop {
                //这里写一个await 函数
                emit_event().await;
                let resp = EventCommandLpcCommandResp{
                    seq, 
                    result: 0 as u16,
                    time: 0,
                    output_buff : Vec::new(),
                    output_num : 0,
                    output_str : "".to_string(),
                    peer_name : peer_name.clone() , 
                    name: "startEvent".to_string(),
                    system : "cyfs-stack".to_string()
                };
                let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
            }
            
            
        });
    }

    
}



pub async fn emit_event()-> u32{
    task::sleep(Duration::from_secs(5)).await;
    20
}