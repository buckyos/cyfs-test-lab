use crate::lpc::*;
use crate::{action_api::*, sleep, tool::*};
use async_std::io::prelude::{ReadExt, WriteExt};
use async_std::net::Ipv4Addr;
use async_std::net::TcpListener;
use async_std::net::TcpStream;
use async_std::prelude::*;
use async_std::{fs::File, future, io::prelude::*, sync::Arc, sync::Mutex, task};
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use cyfs_base::*;
use std::cmp::min;
use std::collections::{hash_map, HashMap};
use std::fmt::{Debug, Formatter};
use std::str::FromStr;
use std::sync::atomic::AtomicU64;

const PIECE_SIZE: usize = 1024 * 1024;
const FILE_SIZE_LEN: usize = 16;

#[derive(Clone)]
pub struct TcpClientManager {
    tcp_server_map: HashMap<String, TcpClient>,
}
impl TcpClientManager {
    pub fn new() -> Self {
        Self {
            tcp_server_map: HashMap::new(),
        }
    }
    pub fn add_client(
        &mut self,
        name: String,
        listener: TcpListener,
        address: String,
    ) -> BuckyResult<()> {
        match self.tcp_server_map.entry(name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = TcpClient::new(listener, address);
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!("tcp client name already exists: {}", name,);

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }
    pub fn get_client(&self, name: &str) -> TcpClient {
        log::info!("get tcp server client  {}", name.clone());
        self.tcp_server_map.get(name).map(|v| v).unwrap().clone()
    }
}

pub struct TcpClientImpl {
    address: String,
    listener: Arc<Mutex<TcpListener>>,
    stream_map: Arc<Mutex<HashMap<String, TcpStream>>>,
    lpc: Arc<Mutex<Option<Lpc>>>,
}
#[derive(Clone)]
pub struct TcpClient(Arc<TcpClientImpl>);
impl TcpClient {
    pub fn new(listener: TcpListener, address: String) -> Self {
        Self(Arc::new(TcpClientImpl {
            address,
            listener: Arc::new(Mutex::new(listener)),
            stream_map: Arc::new(Mutex::new(HashMap::new())),
            lpc: Arc::new(Mutex::new(None)),
        }))
    }
    pub async fn get_lpc(&self) -> Option<Lpc> {
        self.0.lpc.lock().await.clone()
    }
    pub async fn set_lpc(&self, lpc_new: Option<Lpc> ) {
        let mut lpc_self = self.0.lpc.lock().await;
        *lpc_self = lpc_new;
    }
    pub async fn add_stream(&mut self, stream_name: String, stream: &TcpStream) {
        self.0
            .stream_map
            .lock()
            .await
            .insert(stream_name, stream.clone());
    }
    pub async fn get_stream(&mut self, stream_name: String) -> TcpStream {
        self.0
            .stream_map
            .lock()
            .await
            .get(stream_name.as_str())
            .map(|v| v)
            .unwrap()
            .clone()
    }

    pub async fn start_listener(&mut self, lpc: Option<Lpc>, seq: Option<u32>) {
        let listener = self.0.listener.lock().await;
        let mut incoming = listener.incoming();
       
        let mut cli = self.clone();
        cli.set_lpc(lpc).await;
        while let Some(stream) = incoming.next().await {
            let mut cli = cli.clone();
            async_std::task::spawn(async move {
                let stream = stream.unwrap();
                let stream_name = format!(
                    "{}_{}",
                    stream.peer_addr().unwrap(),
                    stream.local_addr().unwrap()
                );
                //stream.set_nodelay(nodelay);
                log::info!("recv tcp connection {}", stream_name.clone());
                cli.add_stream(stream_name.clone(), &stream).await;

                let _ = match cli.get_lpc().await{
                    Some(lpc) => {
                        let resp = ListenerTcpConnectEvent {
                            result: 0,
                            msg: "success".to_string(),
                            stream_name,
                        };
                        let mut lpc = lpc;
                        let _ = lpc
                            .send_command(LpcCommand::new(
                                seq.unwrap(),
                                Vec::new(),
                                LpcActionApi::ListenerTcpConnectEvent(resp),
                            ))
                            .await;
                    }
                    None => {
                        log::info!("recv tcp connection,not lpc server");
                    }
                };
            });
        }
    }
    pub async fn connect(&mut self, remote: String) -> BuckyResult<(String, u64)> {
        log::info!("tcp connect to remote {}", remote.clone());
        let addr = SocketAddr::from_str(remote.as_str()).unwrap();
        let begin_connect = system_time_to_bucky_time(&std::time::SystemTime::now());
        match TcpStream::connect(addr.clone()).await {
            Ok(stream) => {
                let connect_time =
                    system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_connect;
                let stream_name = format!(
                    "{}_{}",
                    stream.local_addr().unwrap(),
                    stream.peer_addr().unwrap()
                );
                self.add_stream(stream_name.clone(), &stream).await;
                Ok((stream_name, connect_time))
            }
            Err(err) => Err(BuckyError::new(
                BuckyErrorCode::Failed,
                "tcp connect failed",
            )),
        }
    }

    pub async fn send_stream(
        &mut self,
        stream_name: String,
        size: u64,
    ) -> Result<(HashValue, u64, u64), BuckyError> {
        if (size < 8) {
            log::warn!(
                "bdt tool send data piece szie = {},must be more than 8 bytes",
                size
            );
        }
        let mut hashs = Vec::<HashValue>::new();
        let mut send_buffer = Vec::new();
        send_buffer.resize(PIECE_SIZE, 0u8);
        let mut gen_count = PIECE_SIZE;
        let mut size_need_to_send = size;
        if gen_count as u64 > size_need_to_send {
            gen_count = size_need_to_send as usize;
        }
        // 构造请求头部协议，设置发送数据长度 0-8 代表长度
        send_buffer[0..8].copy_from_slice(&size_need_to_send.to_be_bytes());
        //8-16 代表sequence id,用来做唯一标识，socket四元组有nat会不一样
        let sequence_id = bucky_time_now();
        send_buffer[8..16].copy_from_slice(&sequence_id.to_be_bytes());
        // 生成测试数据 计算hash
        random_data(send_buffer[16..].as_mut());
        let hash = hash_data(&send_buffer[0..gen_count]);
        hashs.push(hash);
        log::info!("########## hash {}", hash);
        let begin_send = system_time_to_bucky_time(&std::time::SystemTime::now());
        let mut tcp_stream = self.get_stream(stream_name).await;
        loop {
            log::info!("bdt tool send data piece szie = {}", gen_count);
            let result_err = tcp_stream
                .write_all(&send_buffer[0..gen_count])
                .await
                .map_err(|e| {
                    log::error!("send file failed, e={}", &e);
                    e
                });

            let _ = match result_err {
                Err(_) => break,
                Ok(_) => {}
            };
            //size_need_to_send减去发送的数据
            size_need_to_send -= gen_count as u64;
            //size_need_to_send 为 0 退出循环
            if size_need_to_send == 0 {
                break;
            }
            gen_count = PIECE_SIZE;
            if gen_count as u64 > size_need_to_send {
                gen_count = size_need_to_send as usize;
                let hash_end = hash_data(&send_buffer[0..gen_count as usize]);
                hashs.push(hash_end);
                log::info!("########## hash {}", hash_end);
            } else {
                hashs.push(hash.clone());
                log::info!("########## hash {}", hash);
            }
        }
        let send_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_send;

        if size_need_to_send > 0 {
            return Err(BuckyError::new(
                BuckyErrorCode::ConnectionReset,
                "remote close",
            ));
        }
        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());

        log::info!("send file finish, size ={} ,hash={:?}", size, &hash);

        Ok((hash, send_time, sequence_id))
    }
    pub async fn recv_stream(
        &mut self,
        stream_name: String,
    ) -> Result<(u64, u64, HashValue, u64), BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut recv_buffer = Vec::new();
        recv_buffer.resize(PIECE_SIZE, 0u8);
        let mut piece_recv: usize = 0;
        let mut file_size: u64 = 0;
        let mut sequence_id: u64 = 0;
        let mut total_recv: u64 = 0;
        // let mut recv_time = 0;
        let begin_recv = system_time_to_bucky_time(&std::time::SystemTime::now());
        let mut tcp_stream = self.get_stream(stream_name).await;
        let recv_time = loop {
            let len = tcp_stream
                .read(recv_buffer[piece_recv..].as_mut())
                .await
                .map_err(|e| {
                    log::error!("recv failed, e={}", &e);
                    e
                })?;
            log::info!("bdt tool recv data piece szie = {}", len);
            if len == 0 {
                log::error!("remote close");
                return Err(BuckyError::new(
                    BuckyErrorCode::ConnectionReset,
                    "remote close",
                ));
            }
            piece_recv += len;
            total_recv += len as u64;

            if file_size == 0 {
                if piece_recv < FILE_SIZE_LEN {
                    continue;
                }
                // 解析 stream 的头部数据 接收数据长度 stream序列号
                let mut len_bytes = [0u8; 8];
                let mut sequence_bytes = [0u8; 8];
                len_bytes.copy_from_slice(&recv_buffer[0..8]);
                sequence_bytes.copy_from_slice(&recv_buffer[8..16]);
                file_size = u64::from_be_bytes(len_bytes);
                sequence_id = u64::from_be_bytes(sequence_bytes);
                log::info!(
                    "=====================================pre recv stream,file_size={}",
                    file_size
                );
                if file_size > 100 * 1024 * 1024 * 1024 {
                    return Err(BuckyError::new(
                        BuckyErrorCode::ConnectionReset,
                        "error file_size",
                    ));
                }
            }
            if file_size > 0 {
                if total_recv == file_size || piece_recv == PIECE_SIZE {
                    let recv_hash = hash_data(&recv_buffer[0..piece_recv].as_ref());
                    hashs.push(recv_hash);
                }

                if total_recv == file_size {
                    log::info!("=====================================recv finish");
                    let recv_time =
                        system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_recv;
                    break recv_time;
                }
            }
            if piece_recv == PIECE_SIZE {
                piece_recv = 0;
            }
        };

        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());
        log::info!("recv file finish,szie = {} hash={:?}", file_size, &hash);
        Ok((file_size, recv_time, hash, sequence_id))
    }
    pub async fn listener_recv_stream(
        &mut self,
        stream_name: String,
        seq: Option<u32>,
        lpc: Option<Lpc>,
    ) -> Result<(), BuckyError> {
        let mut client = self.clone();
        let stream_name = stream_name.clone();
        let lpc = lpc.clone();
        async_std::task::spawn(async move {
            loop {
                let stream_name = stream_name.clone();
                let resp = match client.recv_stream(stream_name.clone()).await {
                    Ok((file_size, recv_time, hash, sequence_id)) => TcpStreamListenerEvent {
                        result: 0,
                        msg: "success".to_string(),
                        stream_name,
                        file_size,
                        hash,
                        sequence_id,
                        recv_time,
                    },
                    Err(err) => TcpStreamListenerEvent {
                        result: err.code().as_u16(),
                        msg: err.msg().to_string(),
                        stream_name,
                        file_size: 0,
                        hash: HashValue::default(),
                        sequence_id: 0,
                        recv_time: 0,
                    },
                };
                let _ = match lpc.clone() {
                    Some(lpc) => {
                        let mut lpc = lpc;
                        let _ = lpc
                            .send_command(LpcCommand::new(
                                seq.unwrap(),
                                Vec::new(),
                                LpcActionApi::TcpStreamListenerEvent(resp.clone()),
                            ))
                            .await;
                    }
                    None => {
                        log::info!("recv tcp connection,not lpc server");
                    }
                };
                if(resp.result>0){
                    break;
                }
            }
        });
        Ok(())
    }
}

#[tokio::test]
async fn test_tcp() {
    let mut manager = TcpClientManager::new();
    let address1 = format!("0.0.0.0:{}", 22223);
    let listener1 = TcpListener::bind(address1.as_str()).await.unwrap();
    let test1 = manager.add_client("lizhihong1".to_string(), listener1, address1);
    let address2 = format!("0.0.0.0:{}", 22224);
    let listener2 = TcpListener::bind(address2.as_str()).await.unwrap();
    let test1 = manager.add_client("lizhihong2".to_string(), listener2, address2);
    let mut client1 = manager.get_client("lizhihong1");
    let mut client2 = manager.get_client("lizhihong2");
    async_std::task::spawn(async move {
        let mut client1 = client1.clone();
        let mut client2 = client2.clone();
        let run = client1.start_listener(None, None).await;
        let run = client2.start_listener(None, None).await;
    });

    sleep(5).await;
    let remote = "192.168.100.74:22224".to_string();
    let mut client1 = manager.get_client("lizhihong1");
    let mut client2 = manager.get_client("lizhihong2");
    let _ = match client1.connect(remote.clone()).await {
        Ok((stream_name, connect_time)) => {
            println!("connect result = {} {}", stream_name.clone(), connect_time);
            let stream_name_test = stream_name.clone();
            async_std::task::spawn(async move {
                let _ = match client2.recv_stream(stream_name_test.clone()).await {
                    Ok((file_size, recv_time, hash,sequence_id)) => {
                        println!("recv stream {}", hash.to_string());
                    }
                    Err(err) => {}
                };
            });
            let _ = match client1.send_stream(stream_name, 100 * 1024).await {
                Ok((hash, send_time,sequence_id)) => {
                    println!("send stream {}", hash.to_string());
                }
                Err(err) => {}
            };
        }
        Err(err) => {
            println!("connect result = {} ", err);
        }
    };
}
