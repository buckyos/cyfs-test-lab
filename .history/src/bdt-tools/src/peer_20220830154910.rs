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
    future, 
};
use rand::{Rng};
use futures::StreamExt;
use sha2::Digest;
use cyfs_base::*;
use bytes::Bytes;

//use cyfs_base::{self, *};
use cyfs_bdt::{
    Stack, 
    StackGuard, 
    StreamListenerGuard, 
    BuildTunnelParams, 
    TempSeqGenerator, 
    StreamGuard,
    DownloadTaskControl, 
    TaskControlState, 
    StackOpenParams, 
    ChunkDownloadConfig, 
    download::DirTaskPathControl,
    local_chunk_store::LocalChunkWriter,
    local_chunk_store::LocalChunkListWriter,
    ChunkWriter,
    ChunkWriterExt,
    ChunkListDesc
};
use crate::lib::{LpcCommand, Lpc};
use crate::{
    command::{*}, 
    connection::TestConnection
};


use cyfs_util::SYSTEM_INFO_MANAGER;

use walkdir::WalkDir;


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

    pub fn add_task(&mut self, file_name: &str, download_file_task: Arc<Box<dyn DownloadTaskControl>>) -> BuckyResult<()> {
        match self.tasks_map.entry(file_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = Task { 
                    task: download_file_task
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


struct DirTask {
    //task: DirTaskPathControl,
    task: Arc< DirTaskPathControl>,
}

struct DirTaskMap {
    tasks_map: HashMap<String, DirTask>,
}

impl DirTaskMap {
    pub fn new() -> Self {
        Self {
            tasks_map: HashMap::new(),
        }
    }

    pub fn is_task_exists(&self, file_name: &str) -> bool {
        self.tasks_map.contains_key(file_name)
    }
    pub fn get_task(&self, file_name: &str) -> Option<&DirTask> {
        self.tasks_map.get(file_name).map(|v| v.clone())
    }
    // pub fn get_task(&self, file_name: &str) -> Option<DirTaskPathControl>{
    //     self.tasks_map.get(file_name).map(|v| v.clone())
    // }

    pub fn add_task(&mut self, file_name: &str, download_file_task: Arc<DirTaskPathControl>) -> BuckyResult<()> {
        match self.tasks_map.entry(file_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = DirTask { 
                    task: download_file_task
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

    pub fn remove_task(&mut self, file_name: &str) -> Option<Arc< DirTaskPathControl>> {
        self.tasks_map.remove(file_name).map(|v| v.task)
    }
}




async fn chunk_check(reader: &mut (dyn cyfs_util::AsyncReadWithSeek + Unpin + Send + Sync), chunkid: ChunkId) -> BuckyResult<ChunkState> {
    let mut content = vec![0u8; chunkid.len()];
    let _ = reader.read(content.as_mut_slice()).await?;
    let check_id = ChunkId::calculate(content.as_slice()).await?;

    if check_id == chunkid {
        Ok(ChunkState::Ready)
    } else {
        Ok(ChunkState::OnAir)
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
    dir_tasks: Arc<Mutex<DirTaskMap>>,
    fristQA_answer : Mutex<Vec<u8>>
}
#[derive(Clone)]
pub struct Peer(Arc<PeerImpl>);

impl Peer {
    pub fn new(temp_dir: String)->Self {
        let task_map = TaskMap::new();
        let dir_task_map = DirTaskMap::new();
        let answer = Vec::new();
        Self(Arc::new(PeerImpl {
            lazy_components: None, 
            stream_name_gen: TempSeqGenerator::new(), 
            stream_manager: Mutex::new(Vec::new()),
            temp_dir: PathBuf::from_str(temp_dir.as_str()).unwrap(),
            tasks: Arc::new(Mutex::new(task_map)),
            dir_tasks : Arc::new(Mutex::new(dir_task_map)),
            fristQA_answer :Mutex::new(answer),
        }))
    }

    pub fn on_create(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on create, c={:?}", &c);
        let seq = c.seq();
        let c = CreateLpcCommandReq::try_from(c).map_err(|e| {
            log::error!("convert command to CreateLpcCommandReq failed, e={}", &e);
            e
        }).unwrap();
        let peer = self.clone();
        let ep_type = c.ep_type.clone();
        let sn = c.sn.clone();
        task::spawn(async move {
            let resp = match peer.create(c).await {
                Err(e) => {
                    log::error!("create stack failed, e={}", &e);
                    CreateLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        local: None,
                        ep_info: BTreeSet::new(),
                        ep_resp:Vec::new(),
                    }
                },
                Ok(_) => {
                    let mut local = peer.get_stack().local();
                    log::info!("on create succ, local: {}", local.desc().device_id());
                    // 如果配置SN 等待sn上线
                    if sn.len()>0{
                        log::info!("peer sn list len={},wait for sn online",sn.len());
                        let _ = peer.get_stack().net_manager().listener().wait_online().await;
                    }
                    // 获取所有ep列表数据
                    let ep_list =  peer.get_stack().net_manager().listener().endpoints();
                    for ep in ep_list.clone(){
                        log::info!("{}",format!("local ep info:{}",ep));
                    }
                    let _ = match(ep_type){
                        Some(ef_config) =>{
                            if ef_config == String::from("Empty") {
                                log::info!("set resp endpoint list Empty");
                                local.body_mut().as_mut().unwrap().content_mut().mut_endpoints().clone_from(&Vec::new());
                            }else if ef_config == String::from("effectiveEP_LAN"){
                                log::info!("set resp endpoint list effectiveEP_LAN");
                                let eps = local.mut_connect_info().mut_endpoints().clone();
                                local.mut_connect_info().mut_endpoints().clear();
                                for ep in eps{
                                    if !ep.is_static_wan(){
                                        local.mut_connect_info().mut_endpoints().push(ep);
                                    }
                                }  
                            }else if ef_config == String::from("effectiveEP_WAN"){
                                log::info!("set resp endpoint list effectiveEP_WAN");
                                let  eps = local.mut_connect_info().mut_endpoints().clone();
                                local.mut_connect_info().mut_endpoints().clear();
                                for ep in eps{
                                    if ep.is_static_wan(){
                                        local.mut_connect_info().mut_endpoints().push(ep);
                                    }
                                }
                            }else if ef_config == String::from("default"){
                                log::info!("set resp endpoint list default");
                                local.mut_connect_info().mut_endpoints().clear();
                                let ep =  cyfs_base::Endpoint::default();
                                local.mut_connect_info().mut_endpoints().push(ep);
                            }else if ef_config == String::from("SN_Resp"){
                                log::info!("set resp endpoint list SN_Resp");
                                local.mut_connect_info().mut_endpoints().clear();
                                for ep in ep_list.clone(){
                                     local.mut_connect_info().mut_endpoints().push(ep);
                                }
                            }
                        },
                        _ => {
                            log::info!("set resp endpoint none,not modify");
                        }
                    };
                    let ep_resp =  local.mut_connect_info().mut_endpoints().clone();
                    CreateLpcCommandResp {
                        seq, 
                        result: 0 as u16,
                        local: Some(local),
                        ep_info : ep_list,
                        ep_resp,
                    }
                    
                }
            };

            async_std::task::sleep(Duration::from_millis(700)).await; // FIXME:先加个延迟，增加sn上线概率
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_connect(&self, c: LpcCommand, lpc: Lpc) {

        log::info!("on connect, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match ConnectLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to ConnectLpcCommandReq failed, e={}", &e);
                    ConnectLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        stream_name: String::new(),
                        answer : Vec::new(),
                        time: 0,
                    }
                },
                Ok(c) => {
                    let mut wan_addr = false;
                    for addr in c.remote_desc.connect_info().endpoints().iter() {
                        if addr.is_static_wan() {
                            wan_addr = true;
                        }
                    }
                    if(c.known_eps){
                        wan_addr = true;
                    }
                    let remote_sn = match c.remote_desc.body().as_ref() {
                        None => {
                            Vec::new()
                        },
                        Some(b) => {
                            b.content().sn_list().clone()
                        },
                    };
                    let param = BuildTunnelParams {
                        remote_const: c.remote_desc.desc().clone(),
                        remote_sn,
                        remote_desc: if wan_addr {
                            Some(c.remote_desc)
                        } else {
                            None
                        }
                    };
                    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let mut answer = [0;128];
                    if(c.accept_answer){
                        match stack.stream_manager().connect(0, c.question, param).await {
                            Ok(mut stream) => {
                                let len = match stream.read(&mut answer).await{
                                    Ok(len) => {
                                        log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
                                        len
                                    },
                                    Err(e) => {
                                        log::error!("Read answer faild");
                                        let len : usize = 0;
                                        len
                                    }
                                };
                                let conn = peer.add_stream(stream);
                                
                                ConnectLpcCommandResp {
                                    seq, 
                                    result: 0 as u16,
                                    stream_name: conn.get_name().clone(),
                                    answer: answer[..len].to_vec(),
                                    time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                                }
                            },
                            Err(e) => {
                                log::error!("connect failed, e={}", &e);
                                ConnectLpcCommandResp {
                                    seq, 
                                    result: e.code().as_u16(),
                                    stream_name: String::new(),
                                    answer : Vec::new(),
                                    time: 0,
                                }
                            }
                        }
                    }else {
                        match stack.stream_manager().connect(0, c.question, param).await {
                            Ok(mut stream) => {
                                let conn = peer.add_stream(stream);
                                ConnectLpcCommandResp {
                                    seq, 
                                    result: 0 as u16,
                                    stream_name: conn.get_name().clone(),
                                    answer: Vec::new(),
                                    time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                                }
                            },
                            Err(e) => {
                                log::error!("connect failed, e={}", &e);
                                ConnectLpcCommandResp {
                                    seq, 
                                    result: e.code().as_u16(),
                                    stream_name: String::new(),
                                    answer : Vec::new(),
                                    time: 0,
                                }
                            }
                        }
                    }
                    
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_auto_accept(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on auto accept, c={:?}", &c);
        let seq = c.seq();
        {
            let peer = self.clone();
            let mut lpc = lpc.clone();
            let resp = match AutoAcceptStreamLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to AutoAcceptStreamLpcCommandReq failed, e={}", &e);
                    AutoAcceptStreamLpcCommandResp {
                        seq, 
                        result: e.code().as_u16()
                    }
                },
                Ok(c) => {
                    task::spawn(async move {
                        let acceptor = peer.get_acceptor();
                        let mut incoming = acceptor.incoming();
                        let _ = peer.set_answer(&c.answer);
                        loop {
                            let pre_stream = incoming.next().await.unwrap().unwrap();
                            let question = pre_stream.question;
                            log::info!("accept question succ, name={}",String::from_utf8(question.clone()).unwrap());
                            let resp = match pre_stream.stream.confirm(&peer.get_answer()).await{
                                Err(e)=>{
                                    log::error!("confirm err, err={}",e);
                                    ConfirmStreamLpcCommandResp {
                                        seq,
                                        result: e.code().as_u16(),
                                        question,
                                        stream_name: "".to_string(),
                                    }
                                },
                                Ok(_)=>{
                                    let conn = peer.add_stream(pre_stream.stream);
                                    log::info!("confirm succ, name={}", conn.get_name());
                                    ConfirmStreamLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        question,
                                        stream_name: conn.get_name().clone(),
                                    }
                                }
                            };
                           
                            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
                        }
                    });
                    AutoAcceptStreamLpcCommandResp {
                        seq, 
                        result: 0 as u16,
                    }
                }
            };
        }
        
        let resp = AutoAcceptStreamLpcCommandResp {
            seq, 
            result: 0 as u16,
        };
        task::spawn(async move {
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_accept(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on accept, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        task::spawn(async move {
            let acceptor = peer.get_acceptor();
            let mut incoming = acceptor.incoming();
            let pre_stream = incoming.next().await.unwrap().unwrap();
            let conn = peer.add_stream(pre_stream.stream);
            let resp = AcceptStreamLpcCommandResp {
                seq, 
                result: 0 as u16,
                stream_name: conn.get_name().clone(),
                question: pre_stream.question,
            };
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_set_answer(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on set_answer, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        let resp = match SetAnswerLpcCommandReq::try_from(c) {
            Err(e) => {
                log::error!("convert command to SetAnswerLpcCommandReq failed, e={}", &e);
                SetAnswerLpcCommandResp {
                    seq, 
                    result: e.code().as_u16(),
                }
            },
            Ok(c) => {
                let _ = peer.set_answer(&c.answer);
                SetAnswerLpcCommandResp {
                    seq, 
                    result: 0,
                }
            }
        };
        async_std::task::spawn(async move {
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
        
    }
    pub fn on_confirm(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on confirm, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match ConfirmStreamLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to ConnectLpcCommandReq failed, e={}", &e);
                    ConfirmStreamLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        question : Vec::new(),
                        stream_name: String::new(),
                    }
                },
                Ok(c) => {
                    match peer.get_conn(&c.stream_name) {
                        None => {
                            log::error!("not found stream, name={}", &c.stream_name);
                            ConfirmStreamLpcCommandResp {
                                seq, 
                                result: BuckyErrorCode::NotFound.as_u16(),
                                question : Vec::new(),
                                stream_name: c.stream_name,
                            }
                        },
                        Some(conn) => {
                            match conn.get_stream().confirm(c.answer.as_slice()).await {
                                Err(e) => {
                                    log::error!("confirm failed, name={}, e={}", &c.stream_name, &e);
                                    ConfirmStreamLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        question : Vec::new(),
                                        stream_name: c.stream_name,
                                    }
                                },
                                Ok(_) => {
                                    log::info!("confirm succ, name={}", &c.stream_name);
                                    ConfirmStreamLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        question : Vec::new(),
                                        stream_name: c.stream_name,
                                    }
                                }
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_close(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on close, c={:?}", &c);
        let seq = c.seq();
        let resp = match CloseStreamLpcCommandReq::try_from(c) {
            Err(e) => {
                log::error!("convert command to CloseLpcCommandReq failed, e={}", &e);
                CloseStreamLpcCommandResp {
                    seq, 
                    result: e.code().as_u16(),
                    stream_name: String::new(),
                }
            },
            Ok(c) => {
                match self.get_conn(&c.stream_name) {
                    None => {
                        log::error!("not found stream, name={}", &c.stream_name);
                        CloseStreamLpcCommandResp {
                            seq, 
                            result: BuckyErrorCode::NotFound.as_u16(),
                            stream_name: c.stream_name,
                        }
                    },
                    Some(conn) => {
                        let conn = conn;
                        match conn.get_stream().shutdown(c.which.clone()) {
                            Err(e) => {
                                log::error!("close failed, name={}, e={}", &c.stream_name, &e);
                                CloseStreamLpcCommandResp {
                                    seq, 
                                    result: BuckyErrorCode::Failed.as_u16(),
                                    stream_name: c.stream_name,
                                }
                            },
                            Ok(()) => {
                                log::info!("close succ, name={}", &c.stream_name);
                                CloseStreamLpcCommandResp {
                                    seq, 
                                    result: 0 as u16,
                                    stream_name: c.stream_name,
                                }
                            }
                        }
                    }
                }
            }
        };

        async_std::task::spawn(async move {
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_reset(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on reset, c={:?}", &c);
        let seq = c.seq();
        let resp = match ResetStreamLpcCommandReq::try_from(c) {
            Err(e) => {
                log::error!("convert command to ResetStreamLpcCommandReq failed, e={}", &e);
                ResetStreamLpcCommandResp {
                    seq, 
                    result: e.code().as_u16(),
                    stream_name: String::new(),
                }
            },
            Ok(c) => {
                match self.get_conn(&c.stream_name) {
                    None => {
                        log::error!("not found stream, name={}", &c.stream_name);
                        ResetStreamLpcCommandResp {
                            seq, 
                            result: BuckyErrorCode::NotFound.as_u16(),
                            stream_name: c.stream_name,
                        }
                    },
                    Some(conn) => {
                        let conn = conn;
                        match conn.get_stream().shutdown(std::net::Shutdown::Both) {
                            Err(e) => {
                                log::error!("reset failed, name={}, e={}", &c.stream_name, &e);
                                ResetStreamLpcCommandResp {
                                    seq, 
                                    result: BuckyErrorCode::Failed.as_u16(),
                                    stream_name: c.stream_name,
                                }
                            },
                            Ok(()) => {
                                log::info!("reset succ, name={}", &c.stream_name);
                                ResetStreamLpcCommandResp {
                                    seq, 
                                    result: 0 as u16,
                                    stream_name: c.stream_name,
                                }
                            }
                        }
                    }
                }
            }
        };

        async_std::task::spawn(async move {
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_send(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on send, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match SendLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SendLpcCommandReq failed, e={}", &e);
                    SendLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        stream_name: String::new(),
                        time: 0,
                        hash: HashValue::default()
                    }
                },
                Ok(c) => {
                    match peer.get_conn(&c.stream_name) {
                        None => {
                            log::error!("not found stream, name={}", &c.stream_name);
                            SendLpcCommandResp {
                                seq, 
                                result: BuckyErrorCode::NotFound.as_u16(),
                                stream_name: c.stream_name,
                                time: 0,
                                hash: HashValue::default()
                            }
                        },
                        Some(conn) => {
                            let mut conn = conn;
                            let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                            match conn.send_file(c.size).await {
                                Err(e) => {
                                    log::error!("send failed, name={}, e={}", &c.stream_name, &e);
                                    SendLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        stream_name: c.stream_name,
                                        time: 0,
                                        hash: HashValue::default()
                                    }
                                },
                                Ok(hash) => {
                                    log::info!("send succ, name={}", &c.stream_name);
                                    SendLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        stream_name: c.stream_name,
                                        time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                                        hash
                                    }
                                }
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_recv(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on recv, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match RecvLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to RecvLpcCommandReq failed, e={}", &e);
                    RecvLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        stream_name: String::new(),
                        file_size: 0,
                        hash: HashValue::default()
                    }
                },
                Ok(c) => {
                    match peer.get_conn(&c.stream_name) {
                        None => {
                            log::error!("not found stream, name={}", &c.stream_name);
                            RecvLpcCommandResp {
                                seq, 
                                result: BuckyErrorCode::NotFound.as_u16(),
                                stream_name: c.stream_name,
                                file_size: 0,
                                hash: HashValue::default()
                            }
                        },
                        Some(conn) => {
                            let mut conn = conn;
                            match conn.recv_file().await {
                                Err(e) => {
                                    log::error!("recv failed, name={}, e={}", &c.stream_name, &e);
                                    RecvLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        stream_name: c.stream_name,
                                        file_size: 0,
                                        hash: HashValue::default()
                                    }
                                },
                                Ok((file_size,hash)) => {
                                    log::info!("recv succ, name={}", &c.stream_name);
                                    RecvLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        stream_name: c.stream_name,
                                        file_size,
                                        hash
                                    }
                                }
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_send_object(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on send, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match SendObjectLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SendObjectLpcCommandReq failed, e={}", &e);
                    SendObjectLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        stream_name: String::new(),
                        time: 0,
                        hash: HashValue::default()
                    }
                },
                Ok(c) => {
                    match peer.get_conn(&c.stream_name) {
                        None => {
                            log::error!("not found stream, name={}", &c.stream_name);
                            SendObjectLpcCommandResp {
                                seq, 
                                result: BuckyErrorCode::NotFound.as_u16(),
                                stream_name: c.stream_name,
                                time: 0,
                                hash: HashValue::default()
                            }
                        },
                        Some(conn) => {
                            let mut conn = conn;
                            let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                            match conn.send_object(c.obj_type,c.obj_path).await {
                                Err(e) => {
                                    log::error!("send failed, name={}, e={}", &c.stream_name, &e);
                                    SendObjectLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        stream_name: c.stream_name,
                                        time: 0,
                                        hash: HashValue::default()
                                    }
                                },
                                Ok(hash) => {
                                    log::info!("send succ, name={}", &c.stream_name);
                                    SendObjectLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        stream_name: c.stream_name,
                                        time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                                        hash
                                    }
                                }
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    

    pub fn on_recv_object(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on recv, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match RecvObjectLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to RecvLpcCommandReq failed, e={}", &e);
                    RecvObjectLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        stream_name: String::new(),
                        file_size: 0,
                        hash: HashValue::default(),
                        object_id : "".to_string(),
                    }
                },
                Ok(c) => {
                    match peer.get_conn(&c.stream_name) {
                        None => {
                            log::error!("not found stream, name={}", &c.stream_name);
                            RecvObjectLpcCommandResp {
                                seq, 
                                result: BuckyErrorCode::NotFound.as_u16(),
                                stream_name: c.stream_name,
                                file_size: 0,
                                hash: HashValue::default(),
                                object_id : "".to_string(),
                            }
                        },
                        Some(conn) => {
                            let mut conn = conn;
                            match conn.recv_object(c.obj_path).await {
                                Err(e) => {
                                    log::error!("recv failed, name={}, e={}", &c.stream_name, &e);
                                    RecvObjectLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        stream_name: c.stream_name,
                                        file_size: 0,
                                        hash: HashValue::default(),
                                        object_id : "".to_string(),
                                    }
                                },
                                Ok((file_size,hash,object_id)) => {
                                    log::info!("recv object succ, name={},object_id ={}", &c.stream_name,object_id.clone());
                                    RecvObjectLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        stream_name: c.stream_name,
                                        file_size,
                                        hash,
                                        object_id
                                    }
                                }
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_send_datagram(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on send datagram, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let resp = match SendDatagramLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SendDatagramLpcCommandReq failed, e={}", &e);
                    SendDatagramLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        time: 0,
                        hash: HashValue::default(),
                        create_time : None,
                        send_time : None,
                    }
                },
                Ok(c) => {
                    let stack = peer.get_stack();
                    let mut options = cyfs_bdt::DatagramOptions::default();
                    // 要强转数据类型
                    let _ = match c.sequence.clone() {
                        Some(v) => {
                            options.sequence = Some(cyfs_bdt::TempSeq::from(v as u32));
                        },
                        None => {

                        }
                    };
                    options.create_time = c.create_time.clone();
                    options.send_time = c.send_time.clone();
                    options.author_id = c.author_id;
                    options.plaintext = c.plaintext;
                    let hash = hash_data(&c.content);
                    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let datagram = stack.datagram_manager().bind(0).map_err(|err| format!("deamon bind datagram tunnel failed for {}\r\n", err)).unwrap();
                    let create_time = c.create_time;
                    let send_time = c.send_time;
                    let resp = match datagram.send_to(&c.content, &mut options, &c.remote_id, c.reservedVPort as u16){
                        Ok(c) =>{
                            log::info!("Send Datagram succcess ");
                            SendDatagramLpcCommandResp {
                                seq, 
                                result: 0,
                                time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                                hash:hash,
                                create_time,
                                send_time,
                            }
                        },
                        Err(e) =>{
                            log::error!("Send Datagram error, e={}", &e);
                            SendDatagramLpcCommandResp {
                                seq, 
                                result: 1,
                                time: 0,
                                hash: HashValue::default(),
                                create_time : None,
                                send_time : None,
                            }
                        }
                    };
                    resp
                    
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_recv_datagram(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on send datagram, c={:?}", &c);
        let seq = c.seq();
        {
            let peer = self.clone();
            let mut lpc = lpc.clone();
            let resp = match RecvDatagramMonitorLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to RecvDatagramMonitorLpcCommandReq failed, e={}", &e);
                    RecvDatagramMonitorLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                    }
                },
                Ok(c) => {
                    let stack = peer.get_stack();
                    task::spawn(async move {
                        let mut lpc1 = lpc.clone();
                        let datagram = stack.datagram_manager().bind(0).map_err(|err| format!("deamon bind datagram tunnel failed for {}\r\n", err)).unwrap();
                        loop {
                            let datagrams  = datagram.recv_v().await.unwrap();
                            for datagramData in datagrams {
                                let sequence = datagramData.options.sequence.unwrap().value() as u64;
                                let remote_id = Some(datagramData.source.remote);
                                let content = datagramData.data;
                                let hash = hash_data(&content);
                                let notify = RecvDatagramLpcCommandResp {
                                    seq, 
                                    result: 0 as u16,
                                    content,
                                    remote_id,
                                    sequence,
                                    hash,
                                };
                                let _ = lpc1.send_command(LpcCommand::try_from(notify).unwrap()).await;
                            }
                            
                        }
                    });
                    RecvDatagramMonitorLpcCommandResp{
                        seq, 
                        result: 0,
                    }
                    
                }
            };

        }
        let resp  = RecvDatagramMonitorLpcCommandResp{
            seq, 
            result: 0,
        };
        task::spawn(async move {
            let mut lpc = lpc.clone();
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        }); 
         
    }


    pub fn on_calculate_chunk(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on calculate-chunk, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match CalculateChunkLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to CalculateChunkLpcCommandReq failed, e={}", &e);
                    CalculateChunkLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        chunk_id: Default::default(),
                        calculate_time:0,
                    }
                },
                Ok(c) => {
                    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let ret = if c.path.as_path().exists() {
                        let mut content =  File::open(c.path.as_path()).await.unwrap();
                    }else{

                    }
                    match ChunkId::calculate(c.content.as_slice()).await {
                        Ok(chunk_id) => {
                            let dir = cyfs_util::get_named_data_root(stack.local_device_id().to_string().as_str());
                            let path = dir.join(chunk_id.to_string().as_str());
                            CalculateChunkLpcCommandResp {
                                seq, 
                                result: 0 as u16,
                                chunk_id,
                                calculate_time:((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) ) as u32,
                            }
                        }
                        Err(e) => {
                            log::error!("set-chunk failed for calculate chunk-id failed, err: {:?}", e);
                            CalculateChunkLpcCommandResp {
                                seq, 
                                result: e.code().as_u16(),
                                chunk_id: Default::default(),
                                calculate_time:0,
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_set_chunk(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on set-chunk, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match SetChunkLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SetChunkLpcCommandReq failed, e={}", &e);
                    SetChunkLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        chunk_id: Default::default(),
                        set_time:0,
                        
                    }
                },
                Ok(c) => {
                    let begin_calculate_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let dir = cyfs_util::get_named_data_root(stack.local_device_id().to_string().as_str());
                    let path = dir.join(c.chunk_id.clone().to_string().as_str());
                    let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    match cyfs_bdt::download::track_chunk_to_path(&*stack, &c.chunk_id, Arc::new(c.content), path.as_path()).await {
                        Ok(_) => {
                            let set_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set_time) as u32;
                            SetChunkLpcCommandResp {
                                seq, 
                                result: 0 as u16,
                                chunk_id:c.chunk_id.clone(),
                                set_time,
                                
                            }
                        },
                        Err(e) => {
                            log::error!("set-chunk failed, e={}", &e);
                            SetChunkLpcCommandResp {
                                seq, 
                                result: e.code().as_u16(),
                                chunk_id:c.chunk_id.clone(),
                                set_time:0,
                                
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_interest_chunk(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on interest-chunk, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match InterestChunkLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to InterestChunkLpcCommandReq failed, e={}", &e);
                    InterestChunkLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                    }
                },
                Ok(c) => {
                    let remote_id = c.remote.desc().device_id();
                    stack.device_cache().add(&remote_id, &c.remote);

                    let dir = cyfs_util::get_named_data_root(stack.local_device_id().to_string().as_str());
                    let path = dir.join(c.chunk_id.to_string().as_str());

                    let ret = cyfs_bdt::download::download_chunk_to_path(&stack, 
                        c.chunk_id.clone(), 
                        ChunkDownloadConfig::force_stream(remote_id), 
                        path.as_path()).await;
                    match ret {
                        Ok(_) => {
                            InterestChunkLpcCommandResp {
                                seq, 
                                result: 0 as u16,
                            }
                        },
                        Err(e) => {
                            log::error!("interest-chunk failed, e={}", &e);
                            InterestChunkLpcCommandResp {
                                seq, 
                                result: e.code().as_u16(),
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_interest_chunk_list(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on interest-chunk-list, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match InterestChunkListLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to InterestChunkListLpcCommandReq failed, e={}", &e);
                    InterestChunkListCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
                    let remote_id = c.remote.desc().device_id();
                    stack.device_cache().add(&remote_id, &c.remote);

                    let dir = cyfs_util::get_named_data_root(stack.local_device_id().to_string().as_str());
                    let mut writers : Vec<Box<dyn ChunkWriter>> = Vec::new();
                    let writer = LocalChunkListWriter::new(
                        dir.clone(), 
                        &ChunkListDesc::from_chunks(&c.chunk_list.clone()), 
                        stack.ndn().chunk_manager().ndc(), 
                        stack.ndn().chunk_manager().tracker());
                    let writer = Box::new(writer) as Box<dyn ChunkWriter>;
                    writers.push(writer);
                    let task = cyfs_bdt::download::download_chunk_list(&stack, 
                        c.task_name.clone(),
                        &c.chunk_list.clone(), 
                        ChunkDownloadConfig::force_stream(remote_id), 
                        writers).await.unwrap();
                    let mut tasks = peer.0.tasks.lock().unwrap();
                    let _ =  tasks.add_task(c.task_name.clone().as_str(), Arc::new(task)).unwrap();
                    InterestChunkListCommandResp {
                        seq, 
                        result: Ok(c.task_name.clone()),
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_check_chunk(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on check-chunk, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match CheckChunkLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to CheckChunkLpcCommandReq failed, e={}", &e);
                    CheckChunkLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        state: ChunkState::NotFound
                    }
                },
                Ok(c) => {
                    match stack.ndn().chunk_manager().store().read(&c.chunk_id).await {
                        Ok(mut reader) => {
                            match chunk_check(reader.as_mut(), c.chunk_id).await {
                                Ok(state) => {
                                    CheckChunkLpcCommandResp {
                                        seq, 
                                        result: 0,
                                        state
                                    }
                                }
                                Err(e) => {
                                    log::error!("get chunk state failed, e={}", &e);
                                    CheckChunkLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        state: ChunkState::NotFound
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            log::error!("get chunk failed, e={}", &e);
                            CheckChunkLpcCommandResp {
                                seq, 
                                result: 0,//e.code() as u16,
                                state: ChunkState::Pending//ChunkState::NotFound
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_check_chunk_list(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on check-chunk-list, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            // let stack = peer.get_stack();
            let resp = match CheckChunkListCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to CheckChunkListCommandReq failed, e={}", &e);
                    CheckChunkListCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(c) => {
                    let task_id = c.session;
                    let tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.as_str());
                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(speed,progress) => "downloading",
                                TaskControlState::Finished(_) => "finished",
                                TaskControlState::Paused => "paused",
                                _ => "unkown",
                            };
                            log::info!("on_download_file_state: session {} {}", task_id, state_str);
                            CheckChunkListCommandResp {
                                seq, 
                                state: Ok(state)
                            }
                        },
                        None => {
                            log::error!("on_download_file_state: session {} not found", task_id);
                            CheckChunkListCommandResp {
                                seq, 
                                state: Err(BuckyError::new(BuckyErrorCode::NotFound, "session not exists"))
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_add_device(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on add-device, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        let stack = peer.get_stack();
        let resp = match AddDeviceCommandReq::try_from(c) {
            Err(e) => {
                log::error!("convert command to AddDeviceCommandReq failed, e={}", &e);
                AddDeviceCommandResp {
                    seq, 
                    result: Err(e)
                }
            },
            Ok(c) => {
                stack.device_cache().add(&c.device.desc().device_id(), &c.device);
                AddDeviceCommandResp {
                    seq, 
                    result: Ok(())
                }
            }
        };

        async_std::task::spawn(async move {
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_create_file_session(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on create-file-session, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match CreateFileSessionCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to CreateFileSessionCommandReq failed, e={}", &e);
                    CreateFileSessionCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
                    let ret = if c.path.as_path().exists() {
                        let chunkids = {
                            let chunk_size: usize = 10 * 1024 * 1024;
                            let mut chunkids = Vec::new();
                            let mut file = File::open(c.path.as_path()).await.unwrap();
                            loop {
                                let mut buf = vec![0u8; chunk_size];
                                let len = file.read(&mut buf).await.unwrap();
                                if len < chunk_size {
                                    buf.truncate(len);    
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                    break;
                                } else {
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                }
                            }
                            chunkids
                        };

                        let (hash, len) = hash_file(c.path.as_path()).await.unwrap();
                        let file = cyfs_base::File::new(
                            ObjectId::default(),
                            len,
                            hash,
                            ChunkList::ChunkInList(chunkids)
                        ).no_create_time().build();
                        cyfs_bdt::download::track_file_in_path(&*stack, file.clone(), c.path.clone()).await.unwrap();
                        let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                        log::info!("sender: task_id {}", &task_id);
                        Ok((task_id, file))
                    } else {
                        if let Some(file) = c.file.as_ref() {
                            let task = cyfs_bdt::download::download_file_to_path(&stack, 
                                file.clone(), 
                                ChunkDownloadConfig::force_stream(c.default_hub), 
                                c.path.as_path()).await.unwrap();
                                                        
                            let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                            log::info!("recver: task_id {}", &task_id);
                            let mut tasks = peer.0.tasks.lock().unwrap();
                            tasks.add_task(&task_id.as_str(), Arc::new(task)).unwrap();

                            Ok((task_id, file.clone()))
                        } else {
                            let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input file object");
                            log::error!("convert command to CreateFileSessionCommandReq failed, e={}", &e);
                            Err(e)
                        }
                    };

                    CreateFileSessionCommandResp {
                        seq, 
                        result: ret,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_start_trans_session(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-trans-session, c={:?}", &c);
        let seq = c.seq();
        // let peer = self.clone();
        async_std::task::spawn(async move {
            // let stack = peer.get_stack();
            let resp = match StartTransSessionCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartTransSessionCommandReq failed, e={}", &e);
                    GetTransSessionStateCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(_) => {
                    GetTransSessionStateCommandResp {
                        seq, 
                        state: Ok(TaskControlState::Downloading(0,0)),
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_get_trans_session_state(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on get-trans-session-state, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            // let stack = peer.get_stack();
            let resp = match GetTransSessionStateCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartTransSessionCommandReq failed, e={}", &e);
                    GetTransSessionStateCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(c) => {
                    let task_id = c.session;
                    let tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.as_str());
                
                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(speed, progress) => "downloading",
                                TaskControlState::Finished(_) => "finished",
                                TaskControlState::Paused => "paused",
                                _ => "unkown",
                            };
                            log::info!("on_get_trans_session_state: session {} {}", task_id, state_str);
                            GetTransSessionStateCommandResp {
                                seq, 
                                state: Ok(state)
                            }
                        },
                        None => {
                            log::error!("on_get_trans_session_state: session {} not found", task_id);
                            GetTransSessionStateCommandResp {
                                seq, 
                                state: Err(BuckyError::new(BuckyErrorCode::NotFound, "session not exists")),
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    
    fn get_conn(&self, name: &String) -> Option<TestConnection> {
        let manager = self.0.stream_manager.lock().unwrap();
        for conn in manager.iter() {
            if conn.get_name() == name {
                return Some(conn.clone());
            }
        }
        None
    }

    fn get_stack(&self) -> StackGuard {
        self.0.lazy_components.as_ref().unwrap().stack.clone()
    }

    fn set_answer(&self,answer:&Vec<u8>){
        let mut answer_self = self.0.fristQA_answer.lock().unwrap();
        *answer_self = answer.clone();
    }
    fn get_answer(&self)-> Vec<u8>{
        self.0.fristQA_answer.lock().unwrap().clone()
    }
    fn get_acceptor(&self) -> StreamListenerGuard {
        self.0.lazy_components.as_ref().unwrap().acceptor.clone()
    }

    fn temp_dir(&self) -> &Path {
        self.0.temp_dir.as_path()
    }

    fn add_stream(&self, stream: StreamGuard) -> TestConnection {
        let name = format!("{}", stream);
        let conn = TestConnection::new(stream, name);
        let mut manager = self.0.stream_manager.lock().unwrap();
        manager.push(conn.clone());
        conn
    }

    async fn create(&self, c: CreateLpcCommandReq) -> Result<(), BuckyError> {
        let mut sns = Vec::new();
        for s in c.sn.iter() {
            let exe_folder = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
            let sn_desc_path = exe_folder.join(s.as_str());
            let path = format!("{:?}", &sn_desc_path);
            let mut file = std::fs::File::open(sn_desc_path).map_err(|e| {
                log::error!("open sn desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf).map_err(|e| {
                log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let (device, _) = Device::raw_decode(buf.as_slice()).map_err(|e| {
                log::error!("decode sn failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            sns.push(device);
        }


        let mut active_pn = Vec::new();
        for s in c.active_pn.iter() {
            let exe_folder = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
            let desc_path = exe_folder.join(s.as_str());
            let path = format!("{:?}", &desc_path);
            let mut file = std::fs::File::open(desc_path).map_err(|e| {
                log::error!("open desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf).map_err(|e| {
                log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let (device, _) = Device::raw_decode(buf.as_slice()).map_err(|e| {
                log::error!("decode pn failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            log::debug!("parse create command active pn {}", device.desc().device_id());
            active_pn.push(device);
        }

        let mut passive_pn = Vec::new();
        for s in c.passive_pn.iter() {
            let exe_folder = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
            let desc_path = exe_folder.join(s.as_str());
            let path = format!("{:?}", &desc_path);
            let mut file = std::fs::File::open(desc_path).map_err(|e| {
                log::error!("open desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf).map_err(|e| {
                log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            let (device, _) = Device::raw_decode(buf.as_slice()).map_err(|e| {
                log::error!("decode sn failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            })?;
            passive_pn.push(device);
        }

        let (local, key) = match &c.local {
            Some(v) => {
        
                let public_key_path = format!("{}.desc", v.as_str());                
                let (device, key) = match std::path::Path::new(&public_key_path).exists(){
                    true =>{
                        let mut file = std::fs::File::open(public_key_path.clone()).map_err(|e| {
                            log::error!("open peer desc failed on create, path={:?}, e={}", public_key_path.as_str(), &e);
                            e
                        })?;
                        let mut buf = Vec::<u8>::new();
                        let _ = file.read_to_end(&mut buf)?;
                        let (device, _) = Device::raw_decode(buf.as_slice())?;
        
                        let private_key_path = format!("{}.key", v.as_str());

                        let path = format!("{:?}", &private_key_path);
                        let mut file = std::fs::File::open(private_key_path).map_err(|e| {
                            log::error!("open key file failed on create, path={:?}, e={}", path.as_str(), &e);
                            e
                        })?;
                        let mut buf = Vec::<u8>::new();
                        let _ = file.read_to_end(&mut buf)?;
                        let (key, _) = PrivateKey::raw_decode(buf.as_slice()).map_err(|e| {
                            log::error!("decode key file failed on create, path={:?}, e={}", path.as_str(), &e);
                            e
                        })?;
                        log::debug!("create-peer exist, local: {:?}", device.to_vec());
                        (device, key)
                    },
                    false => {
                        let mut eps = Vec::new();
                        for addr in c.addrs.iter() {
                            let ep = {
                                let port: u16 = rand::thread_rng().gen_range(10000, 60000) as u16;
                                let s = format!("{}:{}", addr, port);
                                Endpoint::from_str(s.as_str()).map_err(|e| {
                                    log::error!("parse ep failed, s={}, e={}",s, &e);
                                    e
                                })?
                            };

                            log::debug!("ep={} on create", &ep);
                            eps.push(ep);
                        }
                        let mut sn_list = Vec::new();
                        for sn in sns.iter() {
                            sn_list.push(sn.desc().device_id());
                        }

                        let private_key = PrivateKey::generate_rsa(1024).unwrap();
                        let public_key = private_key.public();

                        let device = Device::new(
                            None,
                            UniqueId::default(),
                            eps,
                            sn_list,
                            vec![],
                            public_key,
                            Area::default(),
                            DeviceCategory::OOD
                        ).build();
                        let id = device.desc().device_id();
                        let mut buffer = [0u8; 4096];
                        // let exe_folder = std::path::Path::new(&self.0.temp_dir);
                        let s = format!("{}.desc", id);
                        let file_path = self.temp_dir().join(s.as_str());
                        let path = format!("{:?}", &file_path);
                        let other = device.raw_encode(buffer.as_mut(), &None)?;
                        let mut file = std::fs::File::create(file_path).map_err(|e| {
                            log::error!("create new desc file failed on create, path={:?}, e={}", path.as_str(), &e);
                            e
                        })?;
                        let len = 4096-other.len();
                        file.write_all(&buffer[0..len])?;

                        let s = format!("{}.key", id);
                        let file_path = self.temp_dir().join(s.as_str());
                        let path = format!("{:?}", &file_path);
                        let other = private_key.raw_encode(buffer.as_mut(), &None)?;
                        let mut file = std::fs::File::create(file_path).map_err(|e| {
                            log::error!("create private key file failed on create, path={:?}, e={}", path.as_str(), &e);
                            e
                        })?;
                        let len = 4096-other.len();
                        file.write_all(&buffer[0..len])?;
                        log::debug!("create-peer new, local: {:?}", device.to_vec());
                        (device, private_key)
                    }
                };
        
                (device, key)
                
            },
            None => {
                let mut eps = Vec::new();
                for addr in c.addrs.iter() {
                    // let ep = if addr.contains(":") {
                    //     Endpoint::from_str(addr.as_str()).map_err(|e| {
                    //         log::error!("parse ep failed, s={}, e={}",addr, &e);
                    //         e
                    //     })?
                    // } else {
                    let ep = {
                        let port: u16 = rand::thread_rng().gen_range(10000, 60000) as u16;
                        let s = format!("{}:{}", addr, port);
                        Endpoint::from_str(s.as_str()).map_err(|e| {
                            log::error!("parse ep failed, s={}, e={}",s, &e);
                            e
                        })?
                    };

                    log::debug!("ep={} on create", &ep);
                    eps.push(ep);
                }
                let mut sn_list = Vec::new();
                for sn in sns.iter() {
                    sn_list.push(sn.desc().device_id());
                }

                let private_key = PrivateKey::generate_rsa(1024).unwrap();
                let public_key = private_key.public();

                let device = Device::new(
                    None,
                    UniqueId::default(),
                    eps,
                    sn_list,
                    vec![],
                    public_key,
                    Area::default(),
                    DeviceCategory::OOD
                ).build();
                let id = device.desc().device_id();
                let mut buffer = [0u8; 4096];
                // let exe_folder = std::path::Path::new(&self.0.temp_dir);
                let s = format!("{}.desc", id);
                let file_path = self.temp_dir().join(s.as_str());
                let path = format!("{:?}", &file_path);
                let other = device.raw_encode(buffer.as_mut(), &None)?;
                let mut file = std::fs::File::create(file_path).map_err(|e| {
                    log::error!("create new desc file failed on create, path={:?}, e={}", path.as_str(), &e);
                    e
                })?;
                let len = 4096-other.len();
                file.write_all(&buffer[0..len])?;

                let s = format!("{}.key", id);
                let file_path = self.temp_dir().join(s.as_str());
                let path = format!("{:?}", &file_path);
                let other = private_key.raw_encode(buffer.as_mut(), &None)?;
                let mut file = std::fs::File::create(file_path).map_err(|e| {
                    log::error!("create private key file failed on create, path={:?}, e={}", path.as_str(), &e);
                    e
                })?;
                let len = 4096-other.len();
                file.write_all(&buffer[0..len])?;

                log::debug!("create-peer new, local: {:?}", device.to_vec());

                (device, private_key)
            }
        };

        let mut params = StackOpenParams::new(local.desc().device_id().to_string().as_str());
        match c.chunk_cache.as_str() {
            "file" => {},
            "mem" => {
                // let tracker = bdt_utils::MemTracker::new();
                // let store = bdt_utils::MemChunkStore::new(NamedDataCache::clone(&tracker).as_ref());
                // params.chunk_store = Some(store.clone_as_reader());
                // params.ndc = Some(NamedDataCache::clone(&tracker));
                // params.tracker = Some(TrackerCache::clone(&tracker));
            }, 
            _ => unreachable!()
        }
        params.known_device = Some(c.known_peers);
        params.known_sn = Some(sns);
        params.active_pn = Some(active_pn);
        params.passive_pn = Some(passive_pn);

        let _ = match &c.ndn_event{
            Some(s) =>{
                let _ = match &c.ndn_event_target{
                    Some(d) =>{
                        if s.clone() == "Redirect" {
                            log::info!("set ndn_event handler = Redirect,target = {}",d.clone());
                            // params.ndn_event = Some(Box::new(cyfs_bdt::event_utils::RedirectHandle::new(d.clone())));
                        }else if s.clone() == "Forward"{
                            log::info!("set ndn_event handler = Forward,target = {}",d.clone());
                            params.ndn_event = Some(Box::new(cyfs_bdt::event_utils::ForwardEventHandle::new(d.clone())));
                        }
                    },
                    None => {
                        params.ndn_event = None;
                    }
            
                };
                
            },  
            None => {
                params.ndn_event = None;
            }
        };

        let stack = Stack::open(
            local, 
            key, 
            params).await?;

        let acceptor = stack.stream_manager().listen(0).unwrap();

        let peer_impl = unsafe {
            &mut *(Arc::as_ptr(&self.0) as *mut PeerImpl)
        };
        peer_impl.lazy_components = Some(LazyComponents {
            stack, 
            acceptor
        });

        Ok(())
    }

    pub fn on_calculate_file(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on calculate_file, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match CalculateFileCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to CalculateFileCommandReq failed, e={}", &e);
                    CalculateFileCommandResp {
                        seq, 
                        result: Err(e),
                        calculate_time:0,
                    }
                },
                Ok(c) => {
                    
                    let begin_calculate_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let mut calculate_time : u32 = 0;
                    let ret = if c.path.as_path().exists() {
                        let chunkids = {
                            let chunk_size: usize = c.chunk_size;
                            let mut chunkids = Vec::new();
                            let mut file =  File::open(c.path.as_path()).await.unwrap();
                            
                            loop {
                                let mut buf = vec![0u8; chunk_size];
                                let len = file.read(&mut buf).await.unwrap();
                                if len < chunk_size {
                                    buf.truncate(len);    
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                    break;
                                } else {
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                }
                            }
                            chunkids
                        };

                        let (hash, len) = hash_file(c.path.as_path()).await.unwrap();
                        let file = cyfs_base::File::new(
                            ObjectId::default(),
                            len,
                            hash,
                            ChunkList::ChunkInList(chunkids)
                        ).no_create_time().build();
                        calculate_time = ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_calculate_time) ) as u32;
                        let file_id = file.clone().desc().calculate_id();
                        log::info!("sender: task_id {}", &file_id.clone());
                        Ok((file_id.to_string(), file.clone()))
                    } else {
                        let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input the send file");
                        log::error!("convert command to StartSendFileCommandReq failed, e={}", &e);
                        Err(e)
                    };

                    CalculateFileCommandResp {
                        seq, 
                        result: ret,
                        calculate_time,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_set_file(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on set-file, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match SetFileCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to SetFileCommandReq failed, e={}", &e);
                    SetFileCommandResp {
                        seq, 
                        result: Err(e),
                        set_time:0,
                    }
                },
                Ok(c) => {
                    let mut set_time : u32 =0;
                    let ret = if c.path.as_path().exists() {
                        let file = c.file.unwrap();
                        let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                        cyfs_bdt::download::track_file_in_path(&*stack, file.clone(), c.path.clone()).await.unwrap();
                        set_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set_time) as u32;
                        //let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                        let file_id = file.clone().desc().calculate_id();
                        log::info!("sender: task_id {}", &file_id.clone());
                        Ok((file_id.to_string(), file.clone()))
                    } else {
                        let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input the send file");
                        log::error!("convert command to StartSendFileCommandReq failed, e={}", &e);
                        Err(e)
                    };

                    SetFileCommandResp {
                        seq, 
                        result: ret,
                        set_time,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_start_send_file(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-send-file, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartSendFileCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartSendFileCommandReq failed, e={}", &e);
                    StartSendFileCommandResp {
                        seq, 
                        result: Err(e),
                        set_time:0,
                        calculate_time:0,
                    }
                },
                Ok(c) => {
                    let begin_calculate_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let mut calculate_time : u32 = 0;
                    let mut set_time : u32 =0;
                    let ret = if c.path.as_path().exists() {
                        let chunkids = {
                            let chunk_size: usize = c.chunk_size;
                            let mut chunkids = Vec::new();
                            let mut file =  File::open(c.path.as_path()).await.unwrap();
                            
                            loop {
                                let mut buf = vec![0u8; chunk_size];
                                let len = file.read(&mut buf).await.unwrap();
                                if len < chunk_size {
                                    buf.truncate(len);    
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                    break;
                                } else {
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    chunkids.push(chunkid);
                                }
                            }
                            chunkids
                        };

                        let (hash, len) = hash_file(c.path.as_path()).await.unwrap();
                        let file = cyfs_base::File::new(
                            ObjectId::default(),
                            len,
                            hash,
                            ChunkList::ChunkInList(chunkids)
                        ).no_create_time().build();
                        calculate_time = ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_calculate_time) ) as u32;
                        let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                        cyfs_bdt::download::track_file_in_path(&*stack, file.clone(), c.path.clone()).await.unwrap();
                        set_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set_time) as u32;
                        //let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                        let file_id = file.clone().desc().calculate_id();
                        log::info!("sender: task_id {}", &file_id.clone());
                        Ok((file_id.to_string(), file.clone()))
                    } else {
                        let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input the send file");
                        log::error!("convert command to StartSendFileCommandReq failed, e={}", &e);
                        Err(e)
                    };

                    StartSendFileCommandResp {
                        seq, 
                        result: ret,
                        set_time,
                        calculate_time,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_start_download_file(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-download-file, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartDownloadFileCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartDownloadFileCommandReq failed, e={}", &e);
                    StartDownloadFileCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
                    // 缓存对端设置Device
                    let ret = {
                        let mut src = Vec::new();
                        src.push(c.peer_id);
                        if c.second_peer_id.is_some() {
                            src.push(c.second_peer_id.unwrap());
                        }
                        
                        if let Some(file) = c.file.as_ref() {
                            let task = cyfs_bdt::download::download_file_to_path(&stack, 
                                file.clone(), 
                                ChunkDownloadConfig::from(src), 
                                c.path.as_path()).await.unwrap();
                                                        
                            let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                            log::info!("recver: task_id {}", &task_id);
                            let mut tasks = peer.0.tasks.lock().unwrap();
                            match tasks.add_task(&task_id.as_str(), Arc::new(task)) {
                                Ok(_) => {
                                    Ok((task_id, file.clone()))
                                },
                                Err(e) => {
                                    Err(e)
                                }
                            }                                
                        } else {
                            let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input file object");
                            log::error!("convert command to StartDownloadFileCommandReq failed, e={}", &e);
                            Err(e)
                        }
                    };

                    StartDownloadFileCommandResp {
                        seq, 
                        result: ret,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_start_download_file_range(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-download-file-range, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartDownloadFileQWithRangesCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartDownloadFileQWithRangesCommandReq failed, e={}", &e);
                    StartDownloadFileWithRangesCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
                    let ret = {
                        let mut src = Vec::new();
                        src.push(c.peer_id);
                        if c.second_peer_id.is_some() {
                            src.push(c.second_peer_id.unwrap());
                        }
                        
                        if let Some(file) = c.file.as_ref() {
                            let file_id = file.desc().calculate_id();
                            let total_size = 10000;
                            // let writer = FirstWakeupStreamWriter::new(&file_id,total_size);
                            // let mut writer_list = vec![writer.clone().into_writer_ext()];
                            // // 本地缓存
                            // if let Ok(Some(writer)) = self.data_cache.gen_file_writer(file_id, file).await {
                            //     writer_list.push(ChunkWriterExtAdapter::new(writer).into_writer_ext());
                            // }

                            // // 增加返回短路器
                            // let waker = FirstWakeupStreamWriter::new(writer.task_id());
                            // writer_list.push(waker.clone().into_writer_ext());

                            let chunk_list = ChunkListDesc::from_file(&file).unwrap();
                            let writer = LocalChunkListWriter::new(
                                c.path.clone().as_path().to_owned(), 
                                &chunk_list, 
                                stack.ndn().chunk_manager().ndc(), 
                                stack.ndn().chunk_manager().tracker());
                            let writer = Box::new(writer)  as Box<dyn ChunkWriterExt>;
                            let task = cyfs_bdt::download::download_file_with_ranges(&stack, 
                                file.clone(), 
                                c.ranges.clone(),
                                ChunkDownloadConfig::from(src), 
                                vec![writer]).await.unwrap();
                                                        
                            //let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                            log::info!("recver: task_id {}", file_id.clone());
                            let mut tasks = peer.0.tasks.lock().unwrap();
                            match tasks.add_task(&file_id.clone().to_string().as_str(), Arc::new(task)) {
                                Ok(_) => {
                                    Ok((file_id.clone().to_string(), file.clone()))
                                },
                                Err(e) => {
                                    Err(e)
                                }
                            }                                
                        } else {
                            let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input file object");
                            log::error!("convert command to StartDownloadFileQWithRangesCommandReq failed, e={}", &e);
                            Err(e)
                        }
                    };

                    StartDownloadFileWithRangesCommandResp {
                        seq, 
                        result: ret,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    pub fn on_download_file_state(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on download-file-state, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            // let stack = peer.get_stack();
            let resp = match DownloadFileStateCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to DownloadFileStateCommandReq failed, e={}", &e);
                    DownloadFileStateCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(c) => {
                    let task_id = c.session;
                    let tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.as_str());
                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(speed, progress) => "downloading",
                                TaskControlState::Finished(_) => "finished",
                                TaskControlState::Paused => "paused",
                                _ => "unkown",
                            };
                            log::info!("on_download_file_state: session {} {}", task_id, state_str);
                            DownloadFileStateCommandResp {
                                seq, 
                                state: Ok(state)
                            }
                        },
                        None => {
                            log::error!("on_download_file_state: session {} not found", task_id);
                            DownloadFileStateCommandResp {
                                seq, 
                                state: Err(BuckyError::new(BuckyErrorCode::NotFound, "session not exists"))
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_start_send_dir(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-send-dir, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartSendDirCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartSendDirCommandReq failed, e={}", &e);
                    StartSendDirCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
                    
                    let ret = if c.path.as_path().exists() {
                        //let mut down_file_path : Vec<()>  = vec![];
                        let mut file_obj_map = HashMap::new();
                        let mut object_map = HashMap::new();
                        let mut dir_map : Vec<FileInfo> = Vec::new();
                        // 解析文件夹下所有文件
                        for entry_ret in WalkDir::new(c.path.as_path()) {
                            match entry_ret {
                                Ok(entry) => {
                                    log::info!("add file,path = {}",entry.clone().path().display());
                                    if entry.file_type().is_file() {
                                        let file_name = entry.file_name();
                                        let file_path_str = entry.path();
                                        let mut file_path:PathBuf  = entry.path().to_path_buf().clone();
                                        log::info!("add file,path = {}",file_path.clone().display());
                                        //down_file_path.push(String::from(entry.path().as_os_str().to_str().expect(""))); 
                                        //单个文件chunk生成
                                        let chunkids = {
                                            let chunk_size: usize = c.chunk_size * 1024 * 1024;
                                            let mut chunkids = Vec::new();
                                            let mut file =  File::open(file_path.clone()).await.unwrap();
                                            loop {
                                                log::info!("chunk read from file");
                                                let mut buf = vec![0u8; chunk_size];
                                                let len = file.read(&mut buf).await.unwrap();
                                                log::info!("chunk len = {}",len.clone());
                                                if len < chunk_size {
                                                    buf.truncate(len);    
                                                    let hash = hash_data(&buf[..]);
                                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                                    chunkids.push(chunkid);
                                                    break;
                                                } else {
                                                    let hash = hash_data(&buf[..]);
                                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                                    chunkids.push(chunkid);
                                                }
                                            }
                                            chunkids
                                        };
                                        //生成文件对象
                                        let (hash, len) = hash_file(file_path_str.clone()).await.unwrap();
                                        let file = cyfs_base::File::new(
                                            ObjectId::default(),
                                            len,
                                            hash,
                                            ChunkList::ChunkInList(chunkids)
                                        ).no_create_time().build();
                                        let file_id = file.desc().calculate_id();
                                        //将文件对象保存到本地
                                        let file_obj_path =  c.dir_object_path.clone().join("file_obj").join(file_id.to_string().as_str());
                                        match file.encode_to_file(file_obj_path.clone().as_path(),true){
                                            Ok(_) => {
                                                log::info!("succ encode secret to {}", file_obj_path.clone().display());
                                            },
                                            Err(e) => {
                                                log::error!("encode secret to file failed, err {}", e);
                                            },
                                        }
                                        let inner_node = cyfs_base::InnerNodeInfo::new(cyfs_base::Attributes::default(), cyfs_base::InnerNode::ObjId(file_id.clone()));
                                        object_map.insert(file_id.to_string().to_owned(), inner_node);
                                        file_obj_map.insert(file_id.clone(), file.to_vec().unwrap());
                                        dir_map.push(FileInfo{
                                            name : file_path.file_name().unwrap().to_str().unwrap().to_string(),
                                            file_id : file_id.clone().to_string()
                                        });
                                        let _ = cyfs_bdt::download::track_file_in_path(&*stack, file.clone(),file_path.clone()).await.unwrap();
                                        let task_id = task_id_gen(file_path.clone().to_str().unwrap().to_string());
                                        log::info!("sender: task_id {}", &task_id);
                                    }
                                },
                                Err(e) => {
                                    log::error!("walk dir {} err {}", c.path.display(), e);
                                }
                            } 
                        }
                        let dir = Dir::new(
                            Attributes::new(0),
                            NDNObjectInfo::ObjList(NDNObjectList {
                                parent_chunk: None,
                                object_map: object_map,
                            }),
                            file_obj_map,
                        )
                        .create_time(0)
                        .build();
                        let dir_id = format!("{}",dir.desc().calculate_id());
                        log::info!("on start-send-dir finished ,dir = {}",dir_id);
                        let dir_obj_path =  c.dir_object_path.clone().join("dir_obj").join(dir_id.to_string().as_str());
                        match dir.encode_to_file(dir_obj_path.clone().as_path(),true){
                            Ok(_) => {
                                log::info!("succ encode dir to {}", dir_obj_path.clone().display());
                            },
                            Err(e) => {
                                log::error!("encode dir to file failed, err {}", e);
                            },
                        }
                        Ok((dir_id,c.dir_object_path.clone(),dir,dir_map))
                        
                    } else {
                        let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input the send dir");
                        log::error!("convert command to StartSendDirCommandReq failed, e={}", &e);
                        Err(e)
                    };

                    StartSendDirCommandResp {
                        seq, 
                        result: ret,
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    
    pub fn on_start_download_dir(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on start-download-dir, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();

        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartDownloadDirCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartDownloadDirCommandReq failed, e={}", &e);
                    StartDownloadDirCommandResp {
                        seq, 
                        result: Err(e),
                    }
                },
                Ok(c) => {
 
                    let ret = {
                        let mut src = Vec::new();
                        src.push(c.peer_id);
                        if c.second_peer_id.is_some() {
                            src.push(c.second_peer_id.unwrap());
                        }
                        let down_dir = c.path.clone();
                        let mut down_file_path/* : Vec<_> */ = vec![];
                        let mut source = c.dir_object_path.as_path().join("file_obj"); 
                        let mut dir_map : Vec<FileInfo> =  c.dir_map;
                        // 读取本地的file object 文件获取对象数据
                        for fileInfo in dir_map{
                            let entry = source.clone().join(fileInfo.file_id);
                            let mut file_name = fileInfo.name;
                            if entry.is_file() {
                                let mut file = std::fs::File::open(entry.clone()).unwrap();
                                let mut buf = Vec::<u8>::new();
                                let _ = file.read_to_end(&mut buf).map_err(|e| {
                                    log::error!("read file object file failed , e={}", &e);
                                    e
                                });
                                let (file_obj,_) = cyfs_base::File::raw_decode(buf.as_slice()).unwrap();
                                let file_id = file_obj.desc().calculate_id();
                                let down_path = down_dir.join(file_name.as_str());
                                down_file_path.push((file_obj.clone(), down_path));
                            }
                        }
                        // 下载文件夹
                        if let Some(dir) = c.dir.clone().as_ref() {
                            let mut task_id = format!("{}",dir.desc().calculate_id());
                            let download_dir =  match cyfs_bdt::download::download_dir_to_path(
                                &stack,
                                dir.clone().desc().dir_id(),
                                ChunkDownloadConfig::from(src),
                                down_dir.as_path(),
                            ){
                                Ok((task, dir_task_control)) => {
                                    for (file, path) in down_file_path {
                                        let _ = dir_task_control.add_file_path(file, path.as_path());
                                    }
                                    
                                    let mut tasks = peer.0.tasks.lock().unwrap();
                                    let add_task =  match tasks.add_task(&task_id.clone().as_str(), Arc::new(task)) {
                                        Ok(_) => {
                                            Ok((task_id.clone(), dir.clone()))
                                        },
                                        Err(e) => {
                                            Err(e)
                                        }
                                    }; 
                                    let mut dir_tasks = peer.0.dir_tasks.lock().unwrap();
                                    match dir_tasks.add_task(&task_id.clone().as_str(),Arc::new(dir_task_control)) {
                                        Ok(_) => {
                                            Ok((task_id.clone(), dir.clone()))
                                        },
                                        Err(e) => {
                                            Err(e)
                                        }
                                    }
                                }
                                Err(e) => {
                                    let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input dir object");
                                    log::error!("convert command to StartDownloadDirCommandReq failed, e={}", &e);
                                    Err(e)
                                }
                            };
                            Ok((task_id,dir.clone()))
                       
                        } else {
                            let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input dir object");
                            log::error!("convert command to StartDownloadDirCommandReq failed, e={}", &e);
                            Err(e)
                        }
                    };
                    StartDownloadDirCommandResp {
                        seq, 
                        result: ret
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }

    pub fn on_download_dir_state(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on download-file-state, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            // let stack = peer.get_stack();
            let resp = match DownloadDirStateCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to DownloadDirStateCommandReq failed, e={}", &e);
                    DownloadDirStateCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(c) => {
                    let task_id = c.session;
                    let tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.clone().as_str());
                    let dir_tasks = peer.0.dir_tasks.lock().unwrap();
                    let dir_task = dir_tasks.get_task(&task_id.clone().as_str()).unwrap();
                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(speed, progress) => {
                                    if progress == 100 {
                                        let _ = dir_task.task.finish();
                                    }
                                    "downloading"
                                },
                                TaskControlState::Finished(_) => {
                                    "finished"
                                },

                                TaskControlState::Paused => "paused",
                                _ => "unkown",
                            };
                            log::info!("on_download_file_state: session {} {}", task_id, state_str);
                            DownloadDirStateCommandResp {
                                seq, 
                                state: Ok(state)
                            }
                        },
                        None => {
                            log::error!("on_download_file_state: session {} not found", task_id);
                            DownloadDirStateCommandResp {
                                seq, 
                                state: Err(BuckyError::new(BuckyErrorCode::NotFound, "session not exists"))
                            }
                        }
                    }
                }
            };

            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });
    }
    
    pub fn on_get_system_info(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on get_system_info, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match GetSystemInfoLpcCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to InterestChunkLpcCommandReq failed, e={}", &e);
                    GetSystemInfoLpcCommandResp {
                        seq, 
                        result : 0,
                        cpu_usage: 0.0,
                        total_memory: 0,
                        used_memory: 0,
                        received_bytes: 0,
                        transmitted_bytes: 0,
                        ssd_disk_total: 0,
                        ssd_disk_avail:0,
                        hdd_disk_total: 0,
                        hdd_disk_avail: 0,
                    }
                },
                Ok(c) => {
                    let ret =  SYSTEM_INFO_MANAGER.get_system_info().await;
                    GetSystemInfoLpcCommandResp {
                        seq, 
                        result : 1,
                        cpu_usage: ret.cpu_usage,
                        total_memory: ret.total_memory,
                        used_memory: ret.used_memory,
                        received_bytes: ret.received_bytes,
                        transmitted_bytes: ret.transmitted_bytes,
                        ssd_disk_total: ret.ssd_disk_total,
                        ssd_disk_avail: ret.ssd_disk_avail,
                        hdd_disk_total: ret.hdd_disk_total,
                        hdd_disk_avail: ret.hdd_disk_avail,
                    }
                }
            };
            let mut lpc = lpc;
            let _ = lpc.send_command(LpcCommand::try_from(resp).unwrap()).await;
        });

    }

}