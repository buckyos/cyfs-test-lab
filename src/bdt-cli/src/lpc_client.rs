use async_std::net::TcpListener;
use async_std::prelude::*;
use async_std::{fs::File, future, io::prelude::*, sync::Arc, sync::Mutex, task};
use bdt_utils::*;
use cyfs_base::*;
use cyfs_bdt::*;
use cyfs_util::*;
use hyper::Body;
use std::net::Shutdown;
use std::str::FromStr;
use std::{path::PathBuf, time::Duration};
struct BDTCliImpl {
    pub bdt_stack_manager: Arc<Mutex<BDTStackManager>>,
    pub temp_dir: PathBuf, //工作目录
    pub service_path: PathBuf,
    pub address: String,
    pub upload_system_info: Arc<Mutex<bool>>,
    pub tcp_server_manager: Arc<Mutex<TcpClientManager>>,
}

#[derive(Clone)]
pub struct BDTCli(Arc<BDTCliImpl>);
impl BDTCli {
    pub fn new(address: String, temp_dir: PathBuf, service_path: PathBuf) -> Self {
        Self(Arc::new(BDTCliImpl {
            bdt_stack_manager: Arc::new(Mutex::new(BDTStackManager::new(
                temp_dir.clone(),
                service_path.clone(),
            ))),
            address,
            temp_dir,
            service_path,
            upload_system_info: Arc::new(Mutex::new(false)),
            tcp_server_manager: Arc::new(Mutex::new(TcpClientManager::new())),
        }))
    }

    pub async fn add_tcp_client(&self, name: String, address: String) -> SocketAddr {
        let listener = TcpListener::bind(address.as_str()).await.unwrap();
        let address_resp = listener.local_addr();
        self.0
            .tcp_server_manager
            .lock()
            .await
            .add_client(name, listener, address);
        address_resp.unwrap()
    }
    pub async fn get_tcp_client(&self, name: String) -> TcpClient {
        self.0
            .tcp_server_manager
            .lock()
            .await
            .get_client(name.as_str())
    }

    pub async fn get_bdt_client(&self, peer_name: &str) -> BDTClient {
        self.0.bdt_stack_manager.lock().await.get_client(peer_name)
    }
    pub async fn create_client(
        &mut self,
        req: &CreateStackReq,
    ) -> BuckyResult<(CreateStackResp, Option<Device>)> {
        self.0
            .bdt_stack_manager
            .lock()
            .await
            .create_client(&req)
            .await
    }
    pub fn get_address(&self) -> String {
        self.0.address.clone()
    }
    pub async fn is_upload_system_info(&self) -> bool {
        self.0.upload_system_info.lock().await.clone()
    }
    pub async fn set_upload_system_info(&self, run: bool) {
        let mut is_run = self.0.upload_system_info.lock().await;
        *is_run = run;
    }
    pub fn get_temp_dir(&self) -> PathBuf {
        self.0.temp_dir.clone()
    }
    pub async fn start_listener(&mut self, client_name: String) {
        let listener = TcpListener::bind(self.get_address().as_str())
            .await
            .unwrap();
        let mut incoming = listener.incoming();
        let client_name = client_name.clone();
        while let Some(stream) = incoming.next().await {
            let client_name = client_name.clone();
            let mut cli = self.clone();
            async_std::task::spawn(async move {
                log::info!("recv connection ,init lpc ");
                let stream = stream.unwrap();
                let mut lpc = Lpc::start(stream, client_name)
                    .await
                    .map_err(|e| {
                        log::error!("start lpc failed, e={}", &e);
                        e
                    })
                    .unwrap();
                // keep alive
                lpc.begin_heartbeat();
                let _ = cli.handler_request(lpc).await;
            });
        }
    }

    pub async fn handler_request(&mut self, lpc: Lpc) {
        log::info!("#### begin handler lpc request");
        let mut cli = self.clone();
        let mut lpc = lpc.clone();
        loop {
            let mut lpc = lpc.clone();
            let _ = match lpc.recv_command().await {
                Ok(c) => {
                    let seq = c.seq();
                    let buffer = c.as_buffer();
                    let _ = match c.as_action() {
                        // 工具控制指令
                        LpcActionApi::PingReq(req) => {
                            log::info!("#### recv ping from lpc seq={:?},req ={:?}", seq, req);
                            let _ = lpc.reset_last_recv_ping();
                        }
                        LpcActionApi::Started(req) => {
                            log::info!("#### recv rep Started,remote lpc client is running,seq={:?}, Started info = {:?}",seq,req);
                        }
                        LpcActionApi::CloseLpc(req) => {
                            log::info!("#### recv rep Close loacl lpc connecttion seq={:?}", seq);
                            let _ = lpc.close().await;
                            return;
                        }
                        LpcActionApi::UploadSystemInfoReq(req) => {
                            let _ = cli.on_upload_system_info(lpc, seq, req).await;
                        }
                        LpcActionApi::Exit(req) => {
                            log::info!("#### lpc server exit ");
                            std::process::exit(2);
                        }
                        LpcActionApi::ErrorParams(req) => {
                            let _ = cli.on_resp_error_actiom(lpc, seq, buffer, req).await;
                        }
                        // BDT 测试请求指令
                        LpcActionApi::CreateStackReq(req) => {
                            log::info!("#### CreateStackReq");
                            let _ = cli.on_create_stack(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::AutoAcceptReq(req) => {
                            let _ = cli.on_auto_accept(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::ConnectReq(req) => {
                            let _ = cli.on_connect(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::ConnectMutReq(req) => {
                            let _ = cli.on_connect_mut(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::SendStreamReq(req) => {
                            let _ = cli.on_send_stream(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::RecvStreamReq(req) => {
                            let _ = cli.on_recv_stream(lpc, seq, buffer, req).await;
                        }
                        // TCP 测试客户端
                        LpcActionApi::CreateTcpServerReq(req) => {
                            let _ = cli.on_create_tcp_server(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::TcpConnectReq(req) => {
                            let _ = cli.on_tcp_connect(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::TcpStreamSendReq(req) => {
                            let _ = cli.on_tcp_send_stream(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::TcpStreamRecvReq(req) => {
                            let _ = cli.on_tcp_recv_stream(lpc, seq, buffer, req).await;
                        }
                        LpcActionApi::TcpStreamListenerReq(req) => {
                            let _ = cli.on_listener_tcp_stream(lpc, seq, buffer, req).await;
                        }
                        _ => {
                            log::error!("recv unkonwn command");
                            let _ = cli.on_resp_unknown_command(lpc, seq).await;
                        }
                    };
                }
                Err(err) => {
                    log::error!("lpc recv command failed, e={}", &err);
                    break;
                }
            };
        }
    }
    pub async fn on_create_stack(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &CreateStackReq,
    ) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        task::spawn(async move {
            let mut lpc = lpc;
            let (resp, buffer) = match cli.create_client(&req).await {
                Ok((resp, loacl)) => match loacl {
                    Some(device) => (resp, device.to_vec().unwrap()),
                    None => (resp, Vec::new()),
                },
                Err(err) => (
                    CreateStackResp {
                        result: err.code().as_u16(),
                        msg: err.msg().to_string(),
                        peer_name: req.peer_name,
                        device_id: "".to_string(),
                        online_time: 0,
                        online_sn: Vec::new(),
                        ep_info: Vec::new(),
                        ep_resp: Vec::new(),
                    },
                    Vec::new(),
                ),
            };
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    buffer,
                    LpcActionApi::CreateStackResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_auto_accept(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &AutoAcceptReq) {
        log::info!("on_auto_accept, req={:?}", &req);

        let req = req.clone();
        let peer_name = req.peer_name.clone();
        let mut bdt_client = self.get_bdt_client(peer_name.as_str()).await;
        task::spawn(async move {
            // listener bdt connect
            let mut lpc = lpc;
            bdt_client.set_lpc(lpc.clone());
            let resp = bdt_client.auto_accept(seq, &req).await;
            let resp = match resp {
                Ok(resp) => resp,
                Err(err) => AutoAcceptResp {
                    peer_name: peer_name.clone(),
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                },
            };

            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::AutoAcceptResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_connect(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &ConnectReq) {
        log::info!("on_connect, req={:?}", &req);
        let (remote, _other) = Device::raw_decode(buffer).unwrap();
        let mut cli = self.clone();
        let (remote_desc, _other) = Device::raw_decode(buffer).unwrap();
        let peer_name = req.peer_name.clone();
        let req = req.clone();
        let mut bdt_client = cli.get_bdt_client(peer_name.as_str()).await;
        task::spawn(async move {
            let resp = match bdt_client.connect(&remote_desc, &req).await {
                Ok(resp) => resp,
                Err(err) => ConnectResp {
                    result: err.code().as_u16(),
                    peer_name: req.peer_name,
                    msg: err.msg().to_string(),
                    stream_name: String::new(),
                    send_hash: HashValue::default(),
                    recv_hash: HashValue::default(),
                    connect_time: 0,
                    calculate_time: 0,
                    total_time: 0,
                },
            };
            let mut lpc = lpc;
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::ConnectResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_send_stream(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &SendStreamReq) {
        log::info!("on_send_stream, req={:?}", &req);
        let (remote, _other) = Device::raw_decode(buffer).unwrap();
        let mut cli = self.clone();
        let peer_name = req.peer_name.clone();
        let req = req.clone();
        let mut bdt_client = cli.get_bdt_client(peer_name.as_str()).await;
        task::spawn(async move {
            let resp = match bdt_client.send_stream(&req).await {
                Ok(resp) => resp,
                Err(err) => SendStreamResp {
                    peer_name: req.peer_name.clone(),
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    stream_name: req.stream_name.clone(),
                    time: 0,
                    hash: HashValue::default(),
                },
            };
            let mut lpc = lpc;
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::SendStreamResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_recv_stream(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &RecvStreamReq) {
        log::info!("on_recv_stream, req={:?}", &req);
        let (remote, _other) = Device::raw_decode(buffer).unwrap();
        let mut cli = self.clone();
        let peer_name = req.peer_name.clone();
        let req = req.clone();
        let mut bdt_client = cli.get_bdt_client(peer_name.as_str()).await;
        task::spawn(async move {
            let resp = match bdt_client.recv_stream(&req).await {
                Ok(resp) => resp,
                Err(err) => RecvStreamResp {
                    peer_name: req.peer_name.clone(),
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    stream_name: req.stream_name.clone(),
                    file_size: 0,
                    hash: HashValue::default(),
                },
            };
            let mut lpc = lpc;
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::RecvStreamResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_upload_system_info(&mut self, lpc: Lpc, seq: u32, req: &UploadSystemInfoReq) {
        let mut req = req.clone();
        let cli = self.clone();
        if (cli.is_upload_system_info().await == false) {
            self.set_upload_system_info(true).await;

            task::spawn(async move {
                let url = "http://192.168.200.175:5000/api/base/system_info/report";
                while cli.is_upload_system_info().await {
                    let ret = SYSTEM_INFO_MANAGER.get_system_info().await;
                    let sys_info = BDTTestSystemInfo {
                        name: req.agent_name.clone(),
                        testcase_id: req.testcase_id.clone(),
                        cpu_usage: ret.cpu_usage,
                        total_memory: ret.total_memory,
                        used_memory: ret.used_memory,
                        received_bytes: ret.received_bytes,
                        transmitted_bytes: ret.transmitted_bytes,
                        ssd_disk_total: ret.ssd_disk_total,
                        ssd_disk_avail: ret.ssd_disk_avail,
                        hdd_disk_total: ret.hdd_disk_total,
                        hdd_disk_avail: ret.hdd_disk_avail,
                    };
                    let json_body = serde_json::to_vec(&sys_info).unwrap();
                    //log::info!("start upload_system_info to server {:#?} ",json_body.clone());
                    let get_json = request_json_post(url.clone(), Body::from(json_body))
                        .await
                        .unwrap();
                    log::trace!("report bdt agent perf result = {:#?}", get_json.data);
                    async_std::task::sleep(Duration::from_millis(req.interval.clone())).await;
                }
                log::info!("stop report bdt agent perf");
            });
        }

        let resp = UploadSystemInfoResp {
            result: 0,
            msg: "success".to_string(),
        };
        let mut lpc = lpc;
        let _ = lpc
            .send_command(LpcCommand::new(
                seq,
                Vec::new(),
                LpcActionApi::UploadSystemInfoResp(resp),
            ))
            .await;
    }
    pub async fn on_connect_mut(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &ConnectMutReq) {
        log::info!("on_connect_mut, req={:?}", &req);
        let (remote, _other) = Device::raw_decode(buffer).unwrap();
        let (remote_desc, _other) = Device::raw_decode(buffer).unwrap();
        let conn_req: ConnectReq = ConnectReq {
            peer_name: req.peer_name.clone(),
            question_size: req.question_size,
            remote_sn: req.remote_sn.clone(),
            known_eps: req.known_eps,
            driect: req.driect,
            accept_answer: req.accept_answer,
        };
        let mut conn_sum = req.conn_sum;
        let mut cli = self.clone();
        task::spawn(async move {
            // 原子引用计数 统计连接时间
            let mut list: Arc<Mutex<Vec<u64>>> = Arc::new(Mutex::new(Vec::new()));
            // 创建子线程池
            let mut handler_list = Vec::new();
            while conn_sum > 0 {
                conn_sum = conn_sum - 1;
                let conn_req = conn_req.clone();
                let cli = cli.clone();
                let remote_desc = remote_desc.clone();
                let mut lpc = lpc.clone();
                let mut list_now = Arc::clone(&list);
                // 创建连接子线程
                handler_list.push(task::spawn(async move {
                    let conn_req = conn_req;
                    let peer_name = conn_req.peer_name.clone();
                    let mut bdt_client = cli.get_bdt_client(peer_name.as_str()).await;
                    let connect_time = match bdt_client.connect(&remote_desc, &conn_req).await {
                        Ok(resp) => resp.connect_time,
                        Err(err) => {
                            // 连接时间为0 的标记为连接失败
                            log::error!("connect failed err = {}", err);
                            0
                        }
                    };
                    let mut list_new = list_now.lock().await;
                    (*list_new).push(connect_time);
                }));
            }
            // 等待子线程全部完成
            for handler in handler_list {
                let _ = handler.await;
            }
            let resp: ConnectMutResp = ConnectMutResp {
                peer_name: conn_req.peer_name,
                result: 0,
                msg: "connect finished".to_string(),
                list: list.lock().await.clone(),
            };
            let mut lpc = lpc;
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::ConnectMutResp(resp),
                ))
                .await;
        });
    }
    pub async fn on_resp_error_actiom(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &ErrorParams,
    ) {
        let mut lpc = lpc;
        let _ = lpc
            .send_command(LpcCommand::new(
                seq,
                Vec::new(),
                LpcActionApi::ErrorParams(req.clone()),
            ))
            .await;
    }
    pub async fn on_resp_unknown_command(&mut self, lpc: Lpc, seq: u32) {
        let resp = Unkonwn {
            result: 1,
            msg: "recv unknown command".to_string(),
        };
        let mut lpc = lpc;
        let _ = lpc
            .send_command(LpcCommand::new(
                seq,
                Vec::new(),
                LpcActionApi::Unkonwn(resp),
            ))
            .await;
    }

    pub async fn on_create_tcp_server(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &CreateTcpServerReq,
    ) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        let mut lpc = lpc;
        task::spawn(async move {
            let mut req = req.clone();
            let address = format!("{}:{}", req.address,req.port);
            let address = cli.add_tcp_client(req.name.clone(), address).await;
            let mut client = cli.get_tcp_client(req.name.clone()).await;
            let mut lpc1 = lpc.clone();
            task::spawn(async move {
                client.start_listener(Some(lpc1), Some(seq)).await;
            });
            let resp = CreateTcpServerResp {
                result: 0,
                msg: "success".to_string(),
                address: address.to_string(),
            };

            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::CreateTcpServerResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_tcp_connect(&mut self, lpc: Lpc, seq: u32, buffer: &[u8], req: &TcpConnectReq) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        let mut lpc = lpc;
        task::spawn(async move {
            let mut client = cli.get_tcp_client(req.name).await;
            let resp = match client.connect(req.address).await {
                Ok((stream_name, connect_time)) => TcpConnectResp {
                    result: 0,
                    msg: "success".to_string(),
                    stream_name,
                    connect_time,
                },
                Err(err) => TcpConnectResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    stream_name: "ERROR".to_string(),
                    connect_time: 0,
                },
            };
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::TcpConnectResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_tcp_send_stream(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &TcpStreamSendReq,
    ) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        let mut lpc = lpc;
        task::spawn(async move {
            let mut client = cli.get_tcp_client(req.name).await;
            let resp = match client.send_stream(req.stream_name, req.file_szie).await {
                Ok((hash, send_time,sequence_id)) => TcpStreamSendResp {
                    result: 0,
                    msg: "success".to_string(),
                    send_time,
                    sequence_id,
                    hash,
                },
                Err(err) => TcpStreamSendResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    hash: HashValue::default(),
                    send_time: 0,
                    sequence_id : 0
                },
            };
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::TcpStreamSendResp(resp),
                ))
                .await;
        });
    }

    pub async fn on_tcp_recv_stream(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &TcpStreamRecvReq,
    ) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        let mut lpc = lpc;
        task::spawn(async move {
            let mut req = req.clone();
            let mut client = cli.get_tcp_client(req.name).await;
            let resp = match client.recv_stream(req.stream_name).await {
                Ok((file_size, recv_time, hash,sequence_id)) => TcpStreamRecvResp {
                    result: 0,
                    msg: "success".to_string(),
                    recv_time,
                    file_size,
                    hash,
                    sequence_id
                },
                Err(err) => TcpStreamRecvResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    recv_time: 0,
                    file_size: 0,
                    hash: HashValue::default(),
                    sequence_id : 0,
                },
            };
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::TcpStreamRecvResp(resp),
                ))
                .await;
        });
    }
    pub async fn on_listener_tcp_stream(
        &mut self,
        lpc: Lpc,
        seq: u32,
        buffer: &[u8],
        req: &TcpStreamListenerReq,
    ) {
        log::info!("on create bdt stack, req={:?}", &req);
        let mut cli = self.clone();
        let mut req = req.clone();
        let mut lpc = lpc;
        task::spawn(async move {
            let mut req = req.clone();
            let mut client = cli.get_tcp_client(req.name).await;
            let resp = match client.listener_recv_stream(req.stream_name,Some(seq),Some(lpc.clone())).await {
                Ok(()) => TcpStreamListenerResp {
                    result: 0,
                    msg: "success".to_string(),
                },
                Err(err) => TcpStreamListenerResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                },
            };
            let _ = lpc
                .send_command(LpcCommand::new(
                    seq,
                    Vec::new(),
                    LpcActionApi::TcpStreamListenerResp(resp),
                ))
                .await;
        });
    }
}
