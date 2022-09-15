use cyfs_bdt::{Stack, StackGuard, StreamListenerGuard, BuildTunnelParams, TempSeqGenerator, StreamGuard,
     DownloadTask, DownloadTaskControl, TaskControlState, StackOpenParams, ChunkDownloadConfig};

use cyfs_base::{self, *};
use std::hash::Hash;
use std::str::FromStr;
use std::path::{Path, PathBuf};
use crate::server::bdt::command::{*};
use std::io::{Read, Write};
use std::sync::{Mutex};
//use futures::StreamExt;
use crate::lib::{*};
// mod lib;
use crate::lib::{Lpc,LpcCommand};
//use auto_test_util::{LpcCommand, Lpc};
use std::convert::TryFrom;
use rand::{Rng};
use crate::server::bdt::connection::TestConnection;
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

//
async fn chunk_check(mut reader: impl BufRead + Unpin, chunkid: ChunkId) -> BuckyResult<ChunkState> {
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
    peer_name : String
}
#[derive(Clone)]
pub struct Peer(Arc<PeerImpl>);

impl Peer {
    pub fn new(peer_name:String,temp_dir: String)->Self {
        let task_map = TaskMap::new();
        Self(Arc::new(PeerImpl {
            lazy_components: None, 
            stream_name_gen: TempSeqGenerator::new(), 
            stream_manager: Mutex::new(Vec::new()),
            temp_dir: PathBuf::from_str(temp_dir.as_str()).unwrap(),
            tasks: Arc::new(Mutex::new(task_map)),
            peer_name,
        }))
    }

    pub fn on_create(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on create, c={:?}", &c);
        let seq = c.seq();
        let c = CreateLpcCommandReq::try_from(c).map_err(|e| {
            log::error!("convert command to CreateLpcCommandReq failed, e={}", &e);
            e
        });
        let peer = self.clone();
        task::spawn(async move {
            let resp = match peer.create(c.unwrap()).await {
                Err(e) => {
                    log::error!("create stack failed, e={}", &e);
                    CreateLpcCommandResp {
                        seq, 
                        result: e.code().as_u16(),
                        local: None,
                    }
                },
                Ok(_) => {
                    let local = peer.get_stack().local();
                    log::info!("on create succ, local: {}", local.desc().device_id());
                    CreateLpcCommandResp {
                        seq, 
                        result: 0 as u16,
                        local: Some(local),
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
                    match stack.stream_manager().connect(0, c.question, param).await {
                        Ok(stream) => {
                            let conn = peer.add_stream(stream);
                            ConnectLpcCommandResp {
                                seq, 
                                result: 0 as u16,
                                stream_name: conn.get_name().clone(),
                                time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) / 1000) as u32,
                            }
                        },
                        Err(e) => {
                            log::error!("connect failed, e={}", &e);
                            ConnectLpcCommandResp {
                                seq, 
                                result: e.code().as_u16(),
                                stream_name: String::new(),
                                time: 0,
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
            task::spawn(async move {
                let acceptor = peer.get_acceptor();
                let mut incoming = acceptor.incoming();
                loop {
                    let pre_stream = incoming.next().await.unwrap().unwrap();
                    let _ = pre_stream.stream.confirm(b"".as_ref()).await;
                    let conn = peer.add_stream(pre_stream.stream);
    
                    log::info!("confirm succ, name={}", conn.get_name());
                    let notify = ConfirmStreamLpcCommandResp {
                        seq, 
                        result: 0 as u16,
                        stream_name: conn.get_name().clone(),
                    };
                    let _ = lpc.send_command(LpcCommand::try_from(notify).unwrap()).await;
                }
            });
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
                                        stream_name: c.stream_name,
                                    }
                                },
                                Ok(_) => {
                                    log::info!("confirm succ, name={}", &c.stream_name);
                                    ConfirmStreamLpcCommandResp {
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
                                        time: ((system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time) / 1000) as u32,
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
                        chunk_id: Default::default()
                    }
                },
                Ok(c) => {
                    match ChunkId::calculate(c.content.as_slice()).await {
                        Ok(chunk_id) => {
                            match stack.ndn().chunk_manager().put(&chunk_id, c.content).await {
                                Ok(_) => {
                                    SetChunkLpcCommandResp {
                                        seq, 
                                        result: 0 as u16,
                                        chunk_id
                                    }
                                },
                                Err(e) => {
                                    log::error!("set-chunk failed, e={}", &e);
                                    SetChunkLpcCommandResp {
                                        seq, 
                                        result: e.code().as_u16(),
                                        chunk_id
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("set-chunk failed for calculate chunk-id failed, err: {:?}", e);
                            SetChunkLpcCommandResp {
                                seq, 
                                result: e.code().as_u16(),
                                chunk_id: Default::default()
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
                    let ret = cyfs_bdt::download::download_chunk(&stack, 
                        c.chunk_id.clone(), 
                        ChunkDownloadConfig::force_stream(remote_id), 
                        None);
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
                    match stack.ndn().chunk_manager().get(&c.chunk_id).await {
                        Ok((reader)) => {
                            match chunk_check(reader, c.chunk_id).await {
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
                                    let _ = stack.ndn().chunk_manager().put(&chunkid, buf).await;
                                    chunkids.push(chunkid);
                                    break;
                                } else {
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    let _ = stack.ndn().chunk_manager().put(&chunkid, buf).await;
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

                        let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                        log::info!("sender: task_id {}", &task_id);
                        Ok((task_id, file.clone()))
                    } else {
                        if let Some(file) = c.file.as_ref() {
                            let task = cyfs_bdt::download::download_file_to_path(&stack, 
                                file.clone(), 
                                ChunkDownloadConfig::force_stream(c.default_hub), 
                                c.path.as_path()).await.unwrap();
                                                        
                            let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                            log::info!("recver: task_id {}", &task_id);
                            let mut tasks = peer.0.tasks.lock().unwrap();
                            tasks.add_task(&task_id.as_str(), task).unwrap();

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
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
            let resp = match StartTransSessionCommandReq::try_from(c) {
                Err(e) => {
                    log::error!("convert command to StartTransSessionCommandReq failed, e={}", &e);
                    GetTransSessionStateCommandResp {
                        seq, 
                        state: Err(e)
                    }
                },
                Ok(c) => {
                    GetTransSessionStateCommandResp {
                        seq, 
                        state: Ok(TaskControlState::Downloading(0)),
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
            let stack = peer.get_stack();
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
                    let mut tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.as_str());

                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(_) => "downloading",
                                TaskControlState::Finished => "finished",
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

    fn get_acceptor(&self) -> StreamListenerGuard {
        self.0.lazy_components.as_ref().unwrap().acceptor.clone()
    }

    fn temp_dir(&self) -> &Path {
        self.0.temp_dir.as_path()
    }

    fn add_stream(&self, stream: StreamGuard) -> TestConnection {
        let name = format!("{}", self.0.stream_name_gen.generate().value());
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
                let exe_folder = std::env::current_exe().unwrap().parent().unwrap().to_path_buf();
                let s = format!("{}.desc", v.as_str());
                let local_desc_path = exe_folder.join(s.as_str());
                let path = format!("{:?}", &local_desc_path);
                let mut file = std::fs::File::open(local_desc_path).map_err(|e| {
                    log::error!("open peer desc failed on create, path={:?}, e={}", path.as_str(), &e);
                    e
                })?;
                let mut buf = Vec::<u8>::new();
                let _ = file.read_to_end(&mut buf)?;
                let (device, _) = Device::raw_decode(buf.as_slice())?;

                let s = format!("{}.key", v.as_str());
                let private_key_path = exe_folder.join(s.as_str());
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
            "mem" => {params.config.ndn.chunk.cache_dir = PathBuf::from_str("memory").unwrap();}, 
            _ => unreachable!()
        }
        params.known_device = Some(c.known_peers);
        params.known_sn = Some(sns);
        params.active_pn = Some(active_pn);
        params.passive_pn = Some(passive_pn);

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

    //
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
                    }
                },
                Ok(c) => {
                    let ret = if c.path.as_path().exists() {
                        let chunkids = {
                            let chunk_size: usize = c.chunk_size_mb * 1024 * 1024;
                            let mut chunkids = Vec::new();
                            let mut file = File::open(c.path.as_path()).await.unwrap();
                            loop {
                                let mut buf = vec![0u8; chunk_size];
                                let len = file.read(&mut buf).await.unwrap();
                                if len < chunk_size {
                                    buf.truncate(len);    
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    let _ = stack.ndn().chunk_manager().put(&chunkid, buf).await;
                                    chunkids.push(chunkid);
                                    break;
                                } else {
                                    let hash = hash_data(&buf[..]);
                                    let chunkid = ChunkId::new(&hash, buf.len() as u32);
                                    let _ = stack.ndn().chunk_manager().put(&chunkid, buf).await;
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

                        let task_id = task_id_gen(c.path.to_str().unwrap().to_string());
                        log::info!("sender: task_id {}", &task_id);
                        Ok((task_id, file.clone()))
                    } else {
                        let e = BuckyError::new(BuckyErrorCode::InvalidParam, "should input the send file");
                        log::error!("convert command to StartSendFileCommandReq failed, e={}", &e);
                        Err(e)
                    };

                    StartSendFileCommandResp {
                        seq, 
                        result: ret,
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
                            match tasks.add_task(&task_id.as_str(), task) {
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
    
    pub fn on_download_file_state(&self, c: LpcCommand, lpc: Lpc) {
        log::info!("on download-file-state, c={:?}", &c);
        let seq = c.seq();
        let peer = self.clone();
        async_std::task::spawn(async move {
            let stack = peer.get_stack();
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
                    let mut tasks = peer.0.tasks.lock().unwrap();
                    let task = tasks.get_task_state(&task_id.as_str());

                    match task {
                        Some(state) => {
                            let state_str = match state {
                                TaskControlState::Downloading(_) => "downloading",
                                TaskControlState::Finished => "finished",
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
}