use crate::action_api::*;
use async_std::io::prelude::{ReadExt, WriteExt};
use async_std::net::TcpStream;
use async_std::sync::{Arc, Mutex};
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use cyfs_base::*;
use std::cmp::min;
use std::fmt::{Debug, Formatter};
use std::sync::atomic::AtomicU64;

#[derive(Clone)]
pub struct LpcCommand {
    pub seq: u32,
    pub buffer: Vec<u8>,
    pub action: LpcActionApi,
}

impl Debug for LpcCommand {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        if self.buffer.len() < 64 {
            write!(f, "json: {:?}, buffer: {:?}", self.action, self.buffer)
        } else {
            write!(
                f,
                "json: {:?}, buffer-len: {:?}",
                self.action,
                self.buffer.len()
            )
        }
    }
}

impl LpcCommand {
    pub fn new(seq: u32, buffer: Vec<u8>, action: LpcActionApi) -> Self {
        Self {
            seq,
            buffer,
            action,
        }
    }

    pub fn seq(&self) -> u32 {
        self.seq
    }

    pub fn as_buffer<'a>(&'a self) -> &'a [u8] {
        self.buffer.as_slice()
    }

    pub fn as_action(&self) -> &LpcActionApi {
        &self.action
    }
    pub fn as_request(&self) -> (u32, &LpcActionApi, &Vec<u8>) {
        (self.seq, &self.action, &self.buffer)
    }
    pub fn encode(&self) -> Result<Vec<u8>, BuckyError> {
        let json = serde_json::to_string(&self.action)?;
        let total_len = 4 + 4 + self.buffer.len() + json.as_bytes().len();
        let mut out = Vec::new();
        out.resize(total_len, 0u8);
        //buffer长度
        let mut wrt = Vec::new();
        let _ = wrt.write_u32::<LittleEndian>(self.seq);
        out[0..4].copy_from_slice(&wrt[0..4]);
        //buffer长度
        let mut wrt = Vec::new();
        let _ = wrt.write_u32::<LittleEndian>(self.buffer.len() as u32);
        out[4..8].copy_from_slice(&wrt[0..4]);

        let mut offset = 8 as usize;
        if self.buffer.len() > 0 {
            out[offset..offset + self.buffer.len()].copy_from_slice(self.buffer.as_slice());
            offset += self.buffer.len();
        }
        out[offset..].copy_from_slice(json.as_bytes());

        Ok(out)
    }

    pub fn decode(buffer: &[u8]) -> Result<Self, BuckyError> {
        let mut rdr = std::io::Cursor::new(buffer[0..8].to_vec());
        let seq = rdr.read_u32::<LittleEndian>().unwrap();
        let len = rdr.read_u32::<LittleEndian>().unwrap();
        let mut data = Vec::new();
        if len > 0 {
            data.resize(len as usize, 0u8);
            data[0..].copy_from_slice(&buffer[8..8 + len as usize]);
        }
        match serde_json::from_slice(&buffer[8 + len as usize..]) {
            Ok(action) => Ok(Self {
                seq,
                buffer: data,
                action,
            }),
            Err(err) => {
                log::error!("lpc action request decode fialed err = {:?}", err);
                let action = LpcActionApi::ErrorParams(ErrorParams {
                    result: 1,
                    msg: "lpc action params error".to_string(),
                });
                Ok(Self {
                    seq,
                    buffer: data,
                    action,
                })
            }
        }
    }
}

#[derive(Clone)]
pub struct Lpc {
    cache: Arc<Mutex<Vec<u8>>>,
    stream: TcpStream,
    last_recv_ping: Arc<Mutex<u64>>,
}
impl Lpc {
    pub async fn start(stream: TcpStream, client_name: String) -> Result<Self, BuckyError> {
        log::info!(
            "recv connect from remote,addr={}",
            stream.peer_addr().unwrap()
        );
        let mut lpc = Self {
            cache: Arc::new(Mutex::new(Vec::new())),
            stream: stream,
            last_recv_ping: Arc::new(Mutex::new(bucky_time_now())),
        };
        log::info!("resp Started client = {}",client_name.clone());
        let action: LpcActionApi = LpcActionApi::Started(Started { client_name });
        let _ = lpc
            .send_command(LpcCommand::new(0, Vec::new(), action))
            .await;
        Ok(lpc)
    }

    pub fn begin_heartbeat(&self) {
        let mut lpc = self.clone();
        async_std::task::spawn(async move {
            let mut last_recv_ping = lpc.get_last_recv_ping().await;
            let now = bucky_time_now();
            while now - last_recv_ping < 5 * 60 * 1000_000 {
                log::info!("lpc send PingResp");
                let action: LpcActionApi = LpcActionApi::PingResp(PingResp {});
                let mut lpc = lpc.clone();
                match lpc.send_command(LpcCommand::new(0, Vec::new(), action)).await {
                    Ok(_)=>{
                        async_std::task::sleep(std::time::Duration::new(5, 0)).await;
                    },
                    Err(err)=>{
                        log::error!("send PingResp error,not send ping");
                        break;
                    }   
                }
                
            }
            log::error!("not recv lpc ping 5 min,exit process!");
            std::process::exit(0);
        });
    }

    pub async fn reset_last_recv_ping(&self) {
        let mut last_recv_ping = self.last_recv_ping.lock().await;
        *last_recv_ping = bucky_time_now();
    }
    pub async fn get_last_recv_ping(&self) -> u64 {
        let last_recv_ping = *self.last_recv_ping.lock().await;
        last_recv_ping
    }
    pub async fn close(&self) {
        self.stream.shutdown(std::net::Shutdown::Both);
    }

    pub async fn recv_command(&mut self) -> Result<LpcCommand, BuckyError> {
        let mut c = self.cache.lock().await;
        loop {
            let cache = Self::ensure_enough_data(&mut self.stream, &mut *c, 4)
                .await
                .map_err(|e| {
                    log::error!("Lpc recv len failed, e={}", &e);
                    e
                })?;

            let mut rdr = std::io::Cursor::new(cache[0..4].to_vec());
            let len = rdr.read_u32::<LittleEndian>().unwrap() as usize;

            *c = cache.split_off(4);
            let cache = Self::ensure_enough_data(&mut self.stream, &mut *c, len)
                .await
                .map_err(|e| {
                    log::error!("Lpc recv command data failed, e={}", &e);
                    e
                })?;
            let command = LpcCommand::decode(&cache[0..len]).map_err(|e| {
                log::error!("Lpc decode command failed, e={}", &e);
                e
            })?;
            *c = cache.split_off(len);

            break Ok(command);
        }
    }

    pub async fn send_command(&mut self, c: LpcCommand) -> Result<(), BuckyError> {
        let buffer = c.encode().map_err(|e| {
            log::error!(
                "Lpc encode lpc command failed when send command,c={:?}, e={}",
                &c,
                &e
            );
            e
        })?;

        let mut wrt = Vec::new();
        let _ = wrt.write_u32::<LittleEndian>(buffer.len() as u32);
        wrt.extend_from_slice(buffer.as_slice());

        Ok(self.stream.write_all(wrt.as_slice()).await.map_err(|e| {
            log::error!("Lpc send command data failed,c={:?}, e={}", &c, &e);
            e
        })?)
    }

    async fn ensure_enough_data<'a>(
        stream: &mut TcpStream,
        cache: &'a mut Vec<u8>,
        min_len: usize,
    ) -> Result<&'a mut Vec<u8>, BuckyError> {
        let mut len = if cache.len() >= min_len {
            0
        } else {
            min_len - cache.len()
        };
        while len > 0 {
            let mut buffer = [0 as u8; 1024];
            let n = stream.read(buffer[0..min(len, 1024)].as_mut()).await?;
            if n == 0 {
                return Err(BuckyError::new(
                    BuckyErrorCode::ConnectionReset,
                    "remote close",
                ));
            }
            len -= n;
            cache.extend_from_slice(buffer[0..n].as_ref());
        }
        Ok(cache)
    }
}
