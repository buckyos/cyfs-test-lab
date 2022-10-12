use cyfs_base::*;
use async_std::sync::{Arc, Mutex};
use async_std::net::{TcpStream};
use async_std::io::prelude::{ReadExt, WriteExt};
use byteorder::{LittleEndian, WriteBytesExt, ReadBytesExt};
use std::cmp::{min};
use std::fmt::{Debug, Formatter};

pub struct LpcCommand { 
    seq: u32, 
    buffer: Vec<u8>,
    json_value: serde_json::Value,
}

impl Debug for LpcCommand {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        if self.buffer.len() < 64 {
            write!(f, "json: {:?}, buffer: {:?}", self.json_value, self.buffer)
        } else {
            write!(f, "json: {:?}, buffer-len: {:?}", self.json_value, self.buffer.len())
        }
    }
}

impl LpcCommand {
    pub fn new(seq: u32, buffer: Vec<u8>, json: serde_json::Value) -> Self {
        Self {
            seq, 
            buffer,
            json_value: json,
        }
    }

    pub fn seq(&self) -> u32 {
        self.seq
    }

    pub fn get_name(&self)->Option<String> {
        match self.json_value.get("name") {
            Some(v) => {
                match v {
                    serde_json::Value::String(s) => Some(s.clone()),
                    _ => None,
                }
            },
            None => None,
        }
    }
    pub fn get_peer_name(&self)->String {
        match self.json_value.get("peerName") {
            Some(v) => {
                match v {
                    serde_json::Value::String(s) => s.clone(),
                    _ => "Default".to_string(),
                }
            },
            None => "Default".to_string(),
        }
    }
    pub fn as_buffer<'a>(&'a self) -> &'a [u8] {
        self.buffer.as_slice()
    }

    pub fn as_json_value(&self) -> &serde_json::Value {
        &self.json_value
    }

    pub fn encode(&self) -> Result<Vec<u8>, BuckyError> {
        let json = serde_json::to_string(&self.json_value)?;
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

        Ok(Self {
            seq, 
            buffer: data,
            json_value: serde_json::from_slice(&buffer[8 + len as usize..])?
        })
    }
}

#[derive(Clone)]
pub struct Lpc{
    cache: Arc<Mutex<Vec<u8>>>,
    stream: TcpStream,
}

impl Lpc {
    pub async fn start(addr: std::net::SocketAddr, peer_name: String) -> Result<Self, BuckyError> {
        log::info!("connect to remote,addr={}", &addr);
        let stream = TcpStream::connect(addr.clone()).await.map_err(|e| {
            log::error!("connect failed, e={}", &e);
            e
        })?;

        let mut lpc = Self{
            cache: Arc::new(Mutex::new(Vec::new())),
            stream,
        };
        let json = serde_json::json!({
            "name": "started",
            "peer_name": peer_name.as_str()
        });
        let _ = lpc.send_command(LpcCommand::new(0, Vec::new(), json)).await;
        Ok(lpc)
    }

    pub fn begin_heartbeat(&self) {
        let mut lpc = self.clone();
        async_std::task::spawn(async move {
            loop {
                let json = serde_json::json!({
                    "name": "ping",
                });
                let _ = lpc.send_command(LpcCommand::new(0, Vec::new(), json)).await;

                async_std::task::sleep(std::time::Duration::new(10, 0)).await;
            }
        });
    }

    pub async fn recv_command(&mut self) -> Result<LpcCommand, BuckyError> {
        let mut c = self.cache.lock().await;
        loop {
            let cache = Self::ensure_enough_data(&mut self.stream, &mut *c, 4).await.map_err(|e| {
                log::error!("Lpc recv len failed, e={}", &e);
                e
            })?;

            let mut rdr = std::io::Cursor::new(cache[0..4].to_vec());
            let len = rdr.read_u32::<LittleEndian>().unwrap() as usize;

            *c = cache.split_off(4);
            let cache = Self::ensure_enough_data(&mut self.stream, &mut *c, len).await.map_err(|e| {
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
            log::error!("Lpc encode lpc command failed when send command,c={:?}, e={}", &c, &e);
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

    async fn ensure_enough_data<'a>(stream: &mut TcpStream, cache: &'a mut Vec<u8>, min_len: usize)->Result<&'a mut Vec<u8>, BuckyError> {
        let mut len = if cache.len() >= min_len {
            0
        } else {
            min_len - cache.len()
        };
        while len > 0 {
            let mut buffer = [0 as u8; 1024];
            let n = stream.read(buffer[0..min(len, 1024)].as_mut()).await?;
            if n == 0 {
                return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "remote close"));
            }
            len -= n;
            cache.extend_from_slice(buffer[0..n].as_ref());
        }
        Ok(cache)
    }
}


#[test]
fn test_lpc_command() {
    let c = LpcCommand {
        seq: 0, 
        buffer: vec![1,2,3],
        json_value: serde_json::json!({ "city": "London", "street": "10 Downing Street" }),
    };
    println!("c={:?}", &c);
    let s = serde_json::to_vec(&c.json_value).unwrap();
    let str = serde_json::to_string(&c.json_value).unwrap();
    println!("str={}", str);

    let v1: serde_json::Value = serde_json::from_slice(s.as_slice()).unwrap();
    println!("v1={:?}", &v1);

    let bufer = c.encode().unwrap();
    let c1 = LpcCommand::decode(bufer.as_ref()).unwrap();
    println!("c1={:?}", &c1);
}