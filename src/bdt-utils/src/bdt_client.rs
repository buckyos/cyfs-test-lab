use crate::action_api::*;
use crate::bdt_ndn::*;
use crate::bdt_stream::*;
use crate::lpc::*;
use crate::tool::*;
use async_std::prelude::*;
use async_std::{future, stream::StreamExt, sync::Arc, task};
use cyfs_base::*;
use cyfs_bdt::*;
use std::str::FromStr;
use std::{path::PathBuf, sync::Mutex, time::Duration};
pub struct BDTClientImpl {
    pub stack: Arc<Mutex<StackGuard>>,
    pub acceptor: Arc<Mutex<StreamListenerGuard>>,
    pub chunk_store: Arc<Mutex<TrackedChunkStore>>,
    pub stream_tasks: Arc<Mutex<StreamMap>>,
    pub lpc: Arc<Mutex<Option<Lpc>>>,
    pub temp_dir: PathBuf,     //工作目录
    pub service_path: PathBuf, // 服务所在目录
    pub file_tasks: Arc<Mutex<FileTaskMap>>,
    //pub  dir_tasks: Arc<Mutex<DirTaskMap>>,
    pub answer_size: Mutex<u64>,
    pub question_size: Mutex<u64>,
}
#[derive(Clone)]
pub struct BDTClient(Arc<BDTClientImpl>);
impl BDTClient {
    pub fn new(
        stack: StackGuard,
        acceptor: StreamListenerGuard,
        chunk_store: TrackedChunkStore,
        temp_dir: PathBuf,
        service_path: PathBuf,
    ) -> Self {
        let file_task_map = FileTaskMap::new();
        //let dir_task_map = DirTaskMap::new();
        //dir_tasks : Arc::new(Mutex::new(dir_task_map)),
        let stream_task_map = StreamMap::new();
        Self(Arc::new(BDTClientImpl {
            stack: Arc::new(Mutex::new(stack)),
            acceptor: Arc::new(Mutex::new(acceptor)),
            chunk_store: Arc::new(Mutex::new(chunk_store)),
            stream_tasks: Arc::new(Mutex::new(stream_task_map)),
            lpc: Arc::new(Mutex::new(None)),
            temp_dir: temp_dir,
            service_path: service_path,
            file_tasks: Arc::new(Mutex::new(file_task_map)),
            answer_size: Mutex::new(0),
            question_size: Mutex::new(0),
        }))
    }
    pub fn get_lpc(&self) -> Option<Lpc> {
        self.0.lpc.lock().unwrap().clone()
    }
    pub fn set_lpc(&self, lpc_new: Lpc) {
        let mut lpc_self = self.0.lpc.lock().unwrap();
        *lpc_self = Some(lpc_new);
    }
    pub fn get_acceptor(&self) -> StreamListenerGuard {
        self.0.acceptor.lock().unwrap().clone()
    }
    pub fn get_stack(&self) -> StackGuard {
        self.0.stack.lock().unwrap().clone()
    }
    pub fn get_chunk_store(&self) -> TrackedChunkStore {
        self.0.chunk_store.lock().unwrap().clone()
    }
    pub fn get_stream(&self, stream_name: &str) -> BDTConnection {
        self.0.stream_tasks.lock().unwrap().get_task(stream_name)
    }
    pub fn find_stream(&self, stream_id: &str) -> Option<BDTConnection> {
        self.0.stream_tasks.lock().unwrap().find_task(stream_id)
    }
    pub fn add_stream(&self, stream: StreamGuard) -> BDTConnection {
        let stream_name = format!("{}", stream);
        let _ = self
            .0
            .stream_tasks
            .lock()
            .unwrap()
            .add_task(stream_name.as_str(), stream);
        self.0
            .stream_tasks
            .lock()
            .unwrap()
            .get_task(stream_name.as_str())
    }
    pub fn cache_stream(&self, stream_name: &str, stream: StreamGuard) {
        let _ = self
            .0
            .stream_tasks
            .lock()
            .unwrap()
            .add_task(stream_name, stream);
    }

    pub fn set_answer(&self, answer_size: u64) {
        let mut answer_self = self.0.answer_size.lock().unwrap();
        *answer_self = answer_size;
    }
    pub fn get_answer(&self) -> u64 {
        self.0.answer_size.lock().unwrap().clone()
    }
    pub fn set_question(&self, question_size: u64) {
        let mut question_self = self.0.question_size.lock().unwrap();
        *question_self = question_size;
    }
    pub fn get_question(&self) -> u64 {
        self.0.question_size.lock().unwrap().clone()
    }
    pub async fn auto_accept(&mut self, seq: u32, req: &AutoAcceptReq) -> AutoAcceptResp {
        log::info!("BDTClient run auto_accept, req={:?}", &req);
        // listener bdt connect
        let answer_size = req.answer_size;
        self.set_answer(answer_size);
        let peer_name = req.peer_name.clone().clone();
        let bdt_client = self.clone();
        task::spawn(async move {
            let peer_name = peer_name.clone();
            let acceptor = bdt_client.get_acceptor();
            let mut incoming = acceptor.incoming();
            loop {
                let peer_name = peer_name.clone();
                let _ = match incoming.next().await {
                    Some(stream) => {
                        let bdt_client = bdt_client.clone();
                        task::spawn(async move {
                            let begin_time =
                                system_time_to_bucky_time(&std::time::SystemTime::now());
                            let answer_size = bdt_client.get_answer() as usize;
                            let resp = match stream {
                                Ok(pre_stream) => {
                                    let question = pre_stream.question;
                                    let begin_calculate =
                                        system_time_to_bucky_time(&std::time::SystemTime::now());
                                    let recv_hash = hash_data(&question);
                                    log::info!(
                                        "accept question succ,  hash = {}",
                                        recv_hash.clone()
                                    );
                                    log::info!(
                                        "pre ready answer data , answer_size = {}",
                                        answer_size
                                    );
                                    let mut answer = Vec::new();
                                    if answer_size > 0 {
                                        log::info!("create random answer data");
                                        answer.resize(answer_size, 0u8);
                                        random_data(answer[0..answer_size].as_mut());
                                    }
                                    let send_hash = hash_data(&answer);
                                    let calculate_time =
                                        system_time_to_bucky_time(&std::time::SystemTime::now())
                                            - begin_calculate;
                                    match pre_stream.stream.confirm(&answer).await {
                                        Err(err) => {
                                            log::error!("confirm err, err={}", err);
                                            ConfirmStreamEvent {
                                                peer_name: peer_name.clone(),
                                                result: err.code().as_u16(),
                                                msg: err.msg().to_string(),
                                                stream_name: "".to_string(),
                                                send_hash,
                                                recv_hash,
                                                calculate_time,
                                                confirm_time: 0,
                                            }
                                        }
                                        Ok(_) => {
                                            let confirm_time = system_time_to_bucky_time(
                                                &std::time::SystemTime::now(),
                                            ) - begin_time;
                                            let conn = bdt_client.add_stream(pre_stream.stream);
                                            log::info!(
                                                "### confirm succ, name={},answer hash = {},confirm_time = &{}&",
                                                conn.get_name(),
                                                send_hash.clone(),
                                                confirm_time
                                            );
                                            ConfirmStreamEvent {
                                                peer_name: peer_name.clone(),
                                                result: 0,
                                                msg: "success".to_string(),
                                                stream_name: conn.get_name(),
                                                send_hash,
                                                recv_hash,
                                                calculate_time,
                                                confirm_time,
                                            }
                                        }
                                    }
                                }
                                Err(err) => {
                                    log::error!("accept question err ={}", err);
                                    ConfirmStreamEvent {
                                        peer_name: peer_name.clone(),
                                        result: 1,
                                        msg: "not match stream".to_string(),
                                        stream_name: "".to_string(),
                                        send_hash: HashValue::default(),
                                        recv_hash: HashValue::default(),
                                        calculate_time: 0,
                                        confirm_time: 0,
                                    }
                                }
                            };

                            let _ = match bdt_client.get_lpc() {
                                Some(lpc) => {
                                    let mut lpc = lpc.clone();
                                    let _ = lpc
                                        .send_command(LpcCommand::new(
                                            seq,
                                            Vec::new(),
                                            LpcActionApi::ConfirmStreamEvent(resp),
                                        ))
                                        .await;
                                }
                                None => {
                                    log::info!("not lpc client")
                                }
                            };
                        });
                    }
                    _ => {
                        log::error!("bdt incoming.next() is None");
                        let resp = ConfirmStreamEvent {
                            peer_name: peer_name.clone(),
                            result: 1,
                            msg: "bdt incoming.next() is None".to_string(),
                            stream_name: "".to_string(),
                            send_hash: HashValue::default(),
                            recv_hash: HashValue::default(),
                            calculate_time: 0,
                            confirm_time: 0,
                        };
                        let _ = match bdt_client.get_lpc() {
                            Some(lpc) => {
                                let mut lpc = lpc.clone();
                                let _ = lpc
                                    .send_command(LpcCommand::new(
                                        seq,
                                        Vec::new(),
                                        LpcActionApi::ConfirmStreamEvent(resp),
                                    ))
                                    .await;
                            }
                            None => {
                                log::info!("not lpc client")
                            }
                        };
                    }
                };
            }
        });
        let resp = AutoAcceptResp {
            peer_name: req.peer_name.clone().clone(),
            result: 0,
            msg: "success".to_string(),
        };
        resp
    }
    pub async fn connect(&mut self, remote: &Device, req: &ConnectReq) -> ConnectResp {
        log::info!("BDTClient connect, req={:?}", &req);
        //let (remote_desc, _other) = Device::raw_decode(buffer).unwrap();
        let req = req.clone();
        let question_size = req.question_size as usize;
        //let peer_name = req.peer_name.clone().clone();
        let remote_sn = match &req.remote_sn.len() {
            0 => None,
            _ => Some(string_to_deviceid_list(&req.remote_sn)),
        };
        let remote_device = match req.driect {
            true => Some(remote.clone()),
            false => None,
        };
        // （1）解析请求参数
        let param = BuildTunnelParams {
            remote_const: remote.desc().clone(),
            remote_sn,
            remote_desc: remote_device,
        };
        // 构造FastQA 请求数据
        // FastQA 最大answer为 25KB
        let begin_set = system_time_to_bucky_time(&std::time::SystemTime::now());
        let mut answer = [0; 25 * 1024];
        let mut question = Vec::new();
        if question_size > 0 {
            log::info!("random question data ,len = {}", question_size);
            random_data(question[0..question_size].as_mut());
        }
        let send_hash = hash_data(&question);
        let mut calculate_time =
            system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set;
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        //(3)发起连接
        let resp = match self
            .get_stack()
            .stream_manager()
            .connect(0, question, param)
            .await
        {
            Ok(mut stream) => {
                let connect_time =
                    system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                let name = format!("{}", stream.clone());
                log::info!(
                    "### connect remote success, time = &{}&,name = {}",
                    connect_time,
                    name.clone()
                );
                // let mut len = 0;
                // 接收answer
                let mut recv_hash = HashValue::default();

                // 读取answer 数据 超时 20s
                match req.accept_answer {
                    true => {
                        match future::timeout(Duration::from_secs(20), stream.read(&mut answer))
                            .await
                        {
                            Ok(result) => {
                                let len = result.unwrap();
                                let begin_read =
                                    system_time_to_bucky_time(&std::time::SystemTime::now());
                                recv_hash = hash_data(&answer[..len]);
                                calculate_time = calculate_time
                                    + system_time_to_bucky_time(&std::time::SystemTime::now())
                                    - begin_read;
                                log::info!(
                                    "Read answer success,len={} content={:?}",
                                    len,
                                    recv_hash.clone()
                                );
                                let conn = self.add_stream(stream);
                                let total_time =
                                    system_time_to_bucky_time(&std::time::SystemTime::now())
                                        - begin_set;
                                ConnectResp {
                                    result: 0 as u16,
                                    peer_name: req.peer_name.clone(),
                                    msg: "success".to_string(),
                                    stream_name: conn.get_name().clone(),
                                    send_hash,
                                    recv_hash,
                                    connect_time,
                                    calculate_time,
                                    total_time,
                                }
                            }
                            Err(err) => {
                                log::error!(
                                    "Read answer faild,timeout 20s stream = {},err = {}",
                                    name,
                                    err
                                );
                                ConnectResp {
                                    result: BuckyErrorCode::Timeout.as_u16(),
                                    peer_name: req.peer_name.clone(),
                                    msg: "Read answer timeout".to_string(),
                                    stream_name: String::new(),
                                    send_hash: HashValue::default(),
                                    recv_hash: HashValue::default(),
                                    connect_time: 0,
                                    calculate_time: 0,
                                    total_time: 0,
                                }
                            }
                        }
                    }
                    false => {
                        let conn = self.add_stream(stream);
                        let total_time =
                            system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set;
                        ConnectResp {
                            result: 0 as u16,
                            peer_name: req.peer_name.clone(),
                            msg: "success".to_string(),
                            stream_name: conn.get_name().clone(),
                            send_hash,
                            recv_hash: HashValue::default(),
                            connect_time,
                            calculate_time,
                            total_time,
                        }
                    }
                }
            }
            Err(e) => {
                log::error!("connect failed, e={}", &e);
                ConnectResp {
                    result: e.code().as_u16(),
                    peer_name: req.peer_name.clone(),
                    msg: e.msg().to_string(),
                    stream_name: String::new(),
                    send_hash: HashValue::default(),
                    recv_hash: HashValue::default(),
                    connect_time: 0,
                    calculate_time: 0,
                    total_time: 0,
                }
            }
        };
        resp
    }

    pub async fn send_stream(&mut self, req: &SendStreamReq) -> SendStreamResp {
        let mut conn = self.get_stream(req.stream_name.clone().as_str());
        let conn_state = format!("{}", conn.get_stream().state());
        log::info!("check StreamState = {}", conn_state);
        if conn_state == "# StreamState::Closing" || conn_state == "StreamState::Closed" {
            SendStreamResp {
                result: 1,
                msg: "StreamState::Closeing".to_string(),
                peer_name: req.peer_name.clone(),
                stream_name: req.stream_name.clone(),
                time: 0,
                hash: HashValue::default(),
            }
        } else {
            let resp = match conn.send_stream(req.size).await {
                Err(e) => {
                    log::error!("send failed, name={}, e={}", &req.stream_name, &e);
                    SendStreamResp {
                        peer_name: req.peer_name.clone(),
                        result: e.code().as_u16(),
                        msg: e.msg().to_string(),
                        stream_name: req.stream_name.clone(),
                        time: 0,
                        hash: HashValue::default(),
                    }
                }
                Ok((hash, send_time)) => {
                    log::info!("send succ, name={}", &req.stream_name);
                    SendStreamResp {
                        peer_name: req.peer_name.clone(),
                        result: 0 as u16,
                        msg: "success".to_string(),
                        stream_name: req.stream_name.clone(),
                        time: send_time as u32,
                        hash,
                    }
                }
            };
            resp
        }
    }

    pub async fn recv_stream(&mut self, req: &RecvStreamReq) -> RecvStreamResp {
        let mut conn = self.get_stream(req.stream_name.as_str());
        let resp = match conn.recv_stream().await {
            Err(e) => {
                log::error!("recv failed, name={}, e={}", &req.stream_name, &e);
                RecvStreamResp {
                    peer_name: req.peer_name.clone(),
                    result: e.code().as_u16(),
                    msg: e.msg().to_string(),
                    stream_name: req.stream_name.clone(),
                    file_size: 0,
                    hash: HashValue::default(),
                }
            }
            Ok((file_size, _recv_time, hash)) => {
                log::info!("recv succ, name={}", &req.stream_name);
                RecvStreamResp {
                    peer_name: req.peer_name.clone(),
                    result: 0 as u16,
                    msg: "success".to_string(),
                    stream_name: req.stream_name.clone(),
                    file_size,
                    hash,
                }
            }
        };
        resp
    }

    pub fn shutdown(&mut self, req: &ShutdownReq) -> ShutdownResp {
        let mut conn = self.get_stream(req.stream_name.as_str());
        let resp = match conn.shutdown(req.shutdown_type.as_str()) {
            Ok(_) => {
                log::info!("{} shutdown success", req.stream_name);
                ShutdownResp {
                    result: 0,
                    msg: "success".to_string(),
                }
            }
            Err(err) => {
                log::error!("{} shutdown fail,error = {}", req.stream_name, err);
                ShutdownResp {
                    result: 0,
                    msg: err.to_string(),
                }
            }
        };
        resp
    }

    pub async fn reset_endpoints(&mut self, endpoints: Vec<Endpoint>) -> BuckyResult<String> {
        let ping_client = self.get_stack().reset_endpoints(&endpoints).await;
        match future::timeout(Duration::from_secs(20), ping_client.wait_online()).await {
            Ok(state) => Ok(state.unwrap().to_string()),
            Err(err) => {
                log::error!("reset_endpoints err ={}", err);
                Err(BuckyError::new(
                    BuckyErrorCode::Timeout,
                    "reset_endpoints wait online timeout",
                ))
            }
        }
    }
    pub async fn reset_sn_list(&mut self, sn_list: Vec<Device>) -> BuckyResult<String> {
        match future::timeout(
            Duration::from_secs(20),
            self.get_stack().reset_sn_list(sn_list).wait_online(),
        )
        .await
        {
            Ok(state) => Ok(state.unwrap().to_string()),
            Err(err) => {
                log::error!("reset_sn_list err ={}", err);
                Err(BuckyError::new(
                    BuckyErrorCode::Timeout,
                    "reset_sn_list wait online timeout",
                ))
            }
        }
    }
    pub async fn reset_stack(
        &mut self,
        sn_list: Option<Vec<Device>>,
        endpoints: Option<Vec<Endpoint>>,
    ) -> BuckyResult<String> {
        let _ = match sn_list {
            Some(sns) => {
                let _ = match self.reset_sn_list(sns).await {
                    Ok(_) => {
                        log::info!("reset_sn_list run success");
                    }
                    Err(err) => return Err(err),
                };
            }
            None => {}
        };
        let _ = match endpoints {
            Some(eps) => {
                let _ = match self.reset_endpoints(eps).await {
                    Ok(_) => {
                        log::info!("reset_endpoints run success");
                    }
                    Err(err) => return Err(err),
                };
            }
            None => {}
        };
        Ok("success".to_string())
    }
    pub async fn calculate_chunk(&mut self, req: &SendStreamReq) -> BuckyResult<()> {
        Ok(())
    }
    pub async fn set_chunk(&mut self, req: &SendStreamReq) -> BuckyResult<()> {
        Ok(())
    }
    pub async fn track_chunk(&mut self, req: &TrackChunkReq) -> TrackChunkResp {
        log::info!("bdt client track_chunk, req={:?}", &req);
        let stack = self.get_stack();
        let chunk_store = self.get_chunk_store();
        let resp = match calculate_chunk(req.path.clone(), req.chunk_size).await {
            Ok((chunk_id, calculate_time, buf)) => {
                let dir = cyfs_util::get_named_data_root(
                    self.get_stack().local_device_id().to_string().as_str(),
                );
                let path = dir.join(chunk_id.to_string().as_str());
                let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                match chunk_store.chunk_writer(&chunk_id, path).await {
                    Ok(writer) => match writer.write(async_std::io::Cursor::new(buf)).await {
                        Ok(_) => {
                            let set_time = (system_time_to_bucky_time(&std::time::SystemTime::now())
                                - begin_set_time) as u32;

                            let chunk_exists =
                                stack.ndn().chunk_manager().store().exists(&chunk_id).await;
                            log::info!("chunk is exists {}", chunk_exists);
                            TrackChunkResp {
                                peer_name: req.peer_name.clone(),
                                result: 0 as u16,
                                msg: "success".to_string(),
                                chunk_id: chunk_id.clone(),
                                calculate_time: calculate_time,
                                set_time: set_time,
                            }
                        }
                        Err(e) => {
                            log::error!("set-chunk failed, e={}", &e);
                            TrackChunkResp {
                                peer_name: req.peer_name.clone(),
                                result: e.code().as_u16(),
                                msg: e.msg().to_string(),
                                chunk_id: chunk_id.clone(),
                                calculate_time: 0,
                                set_time: 0,
                            }
                        }
                    },
                    Err(e) => {
                        log::error!("chunk store write chunkfailed, e={}", &e);
                        TrackChunkResp {
                            peer_name: req.peer_name.clone(),
                            result: e.code().as_u16(),
                            msg: e.msg().to_string(),
                            chunk_id: chunk_id.clone(),
                            calculate_time: 0,
                            set_time: 0,
                        }
                    }
                }
            }
            Err(err) => TrackChunkResp {
                peer_name: req.peer_name.clone(),
                result: err.code().as_u16(),
                msg: err.msg().to_string(),
                chunk_id: ChunkId::default(),
                calculate_time: 0,
                set_time: 0,
            },
        };
        resp
    }
    pub async fn interest_chunk(
        &mut self,
        req: &InterestChunkReq,
        remote: &Device,
    ) -> InterestChunkResp {
        let stack = self.get_stack();
        let chunk_store = self.get_chunk_store();
        let remote_id = remote.desc().device_id();
        stack.device_cache().add(&remote_id, &remote);
        // 设置chunk 保存目录
        let save_path = match req.save_path.clone() {
            Some(path_str) => PathBuf::from_str(path_str.as_str()).unwrap(),
            None => cyfs_util::get_named_data_root(stack.local_device_id().to_string().as_str()),
        };
        let path = save_path.join(req.chunk_id.to_string().as_str());
        let context =
            SampleDownloadContext::desc_streams("".to_string(), vec![remote.desc().clone()]);
        let resp = match download_chunk(&stack, req.chunk_id.clone(), None, context).await {
            Ok((_, reader)) => match chunk_store.chunk_writer(&req.chunk_id, path).await {
                Ok(writer) => match writer.write(reader).await {
                    Ok(_) => InterestChunkResp {
                        peer_name: req.peer_name.clone(),
                        result: 0 as u16,
                        msg: "success".to_string(),
                    },
                    Err(e) => {
                        log::error!("interest-chunk write failed, e={}", &e);
                        InterestChunkResp {
                            peer_name: req.peer_name.clone(),
                            result: e.code().as_u16(),
                            msg: e.msg().to_string(),
                        }
                    }
                },
                Err(e) => {
                    log::error!("interest-chunk write failed, e={}", &e);
                    InterestChunkResp {
                        peer_name: req.peer_name.clone(),
                        result: e.code().as_u16(),
                        msg: e.msg().to_string(),
                    }
                }
            },
            Err(e) => {
                log::error!("download chunk failed, e={}", &e);
                InterestChunkResp {
                    peer_name: req.peer_name.clone(),
                    result: e.code().as_u16(),
                    msg: e.msg().to_string(),
                }
            }
        };
        resp
    }
    pub async fn check_chunk(&mut self, req: &CheckChunkReq) -> CheckChunkResp {
        let stack = self.get_stack();
        let resp = match stack.ndn().chunk_manager().store().get(&req.chunk_id).await {
            Ok(mut reader) => match chunk_check(reader.as_mut(), req.chunk_id.clone()).await {
                Ok(state) => CheckChunkResp {
                    peer_name: req.peer_name.clone(),
                    result: 0,
                    msg: "success".to_string(),
                    state,
                },
                Err(e) => {
                    log::error!("get chunk state failed, e={}", &e);
                    CheckChunkResp {
                        peer_name: req.peer_name.clone(),
                        result: e.code().as_u16(),
                        msg: e.msg().to_string(),
                        state: ChunkState::NotFound,
                    }
                }
            },
            Err(e) => {
                log::error!("get chunk failed, e={}", &e);
                CheckChunkResp {
                    peer_name: req.peer_name.clone(),
                    result: e.code().as_u16(),
                    msg: e.msg().to_string(),
                    state: ChunkState::NotFound,
                }
            }
        };
        resp
    }

    pub async fn publish_file(&mut self, req: &PublishFileReq) -> (PublishFileResp, Option<File>) {
        log::info!("bdt client publish_file, req={:?}", &req);
        let chunk_store = self.get_chunk_store();
        let resp = match calculate_file(req.path.clone(), req.chunk_size).await {
            Ok((file, calculate_time, path)) => {
                let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                // 将文件信息存入tracker
                chunk_store
                    .track_file_in_path(file.clone(), path.clone())
                    .await
                    .unwrap();
                let set_time = (system_time_to_bucky_time(&std::time::SystemTime::now())
                    - begin_set_time) as u32;
                (
                    PublishFileResp {
                        peer_name: req.peer_name.clone(),
                        result: 0,
                        file_id: file.desc().file_id(),
                        msg: "success".to_string(),
                        calculate_time,
                        set_time,
                    },
                    Some(file),
                )
            }
            Err(err) => (
                PublishFileResp {
                    peer_name: req.peer_name.clone(),
                    result: err.code().as_u16(),
                    file_id: FileId::default(),
                    msg: err.msg().to_string(),
                    calculate_time: 0,
                    set_time: 0,
                },
                None,
            ),
        };
        resp
    }
    pub async fn download_file(&mut self, req: &DownloadFileReq, file: &File) -> DownloadFileResp {
        log::info!("bdt client download_file, req={:?}", &req);
        let stack = self.get_stack();
        let chunk_store = self.get_chunk_store();
        let save_path = PathBuf::from_str(req.path.as_str()).unwrap();
        // 创建context
        let context = SampleDownloadContext::id_streams(&stack, "".to_string(), &req.remotes)
            .await
            .unwrap();
        // 创建文件下载任务
        let (task_path, reader) = download_file(&stack, file.clone(), req.group.clone(), context)
            .await
            .unwrap();
        // 将文件写入磁盘
        let writer = chunk_store.file_writer(&file, save_path).await.unwrap();
        async_std::task::spawn(async move {
            let _ = writer.write(reader).await.unwrap();
        });
        // 获取下载task
        let download_file_task = stack
            .ndn()
            .root_task()
            .download()
            .sub_task(task_path.as_str())
            .unwrap();
        log::info!("recver: task_id {}", &task_path);
        let _ = self
            .0
            .file_tasks
            .lock()
            .unwrap()
            .add_task(task_path.as_str(), Arc::new(download_file_task));
        DownloadFileResp {
            peer_name: req.peer_name.clone(),
            result: 0,
            msg: "success".to_string(),
            session: task_path,
        }
    }

    pub async fn get_download_task_state(
        &mut self,
        req: &DownloadFileStateReq,
    ) -> DownloadFileStateResp {
        log::info!("bdt client get_download_task_state, req={:?}", &req);
        let resp = match self
            .0
            .file_tasks
            .lock()
            .unwrap()
            .get_task_state(&req.session.as_str())
        {
            Some((state, cur_speed, transfered)) => {
                let state = match state {
                    NdnTaskState::Running => "Running".to_string(),
                    NdnTaskState::Finished => "Finished".to_string(),
                    NdnTaskState::Paused => "Paused".to_string(),
                    NdnTaskState::Error(err) => {
                        format!("Error({:?})", err.msg())
                    }
                };
                DownloadFileStateResp {
                    peer_name: req.peer_name.clone(),
                    result: 0,
                    msg: "success".to_string(),
                    state,
                    cur_speed,
                    transfered,
                }
            }
            None => DownloadFileStateResp {
                peer_name: req.peer_name.clone(),
                result: 1,
                msg: "session is not found".to_string(),
                state: "Not Found".to_string(),
                cur_speed: 0,
                transfered: 0,
            },
        };
        resp
    }
}
