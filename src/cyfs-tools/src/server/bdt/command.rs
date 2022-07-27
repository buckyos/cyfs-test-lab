use crate::lib::{Lpc,LpcCommand};
use byteorder::{LittleEndian, ReadBytesExt};
use cyfs_base::{
    raw_encode::{RawDecode, RawEncode},
    *,
};
use rust_bdt::*;
use std::convert::TryFrom;
use std::path::PathBuf;
use std::str::FromStr;
use std::io::{Read, Write};
use rust_bdt::{ TaskControlState };


pub struct CreateLpcCommandReq {
    pub seq: u32,
    pub known_peers: Vec<Device>,
    pub sn: Vec<String>, 
    pub active_pn: Vec<String>, 
    pub passive_pn: Vec<String>, 
    pub addrs: Vec<String>,
    pub local: Option<String>, 
    pub chunk_cache: String
}

impl TryFrom<LpcCommand> for CreateLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let mut sn = Vec::new();
        match json.get("sn_files") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for f in files {
                        match f {
                            serde_json::Value::String(s) => {
                                if s.len() > 0 {
                                    sn.push(s.clone());
                                }
                            }
                            _ => {}
                        }
                    }
                },
                _ => {}
            },
            _ => {}
        };

        let mut active_pn = vec![];
        match json.get("active_pn_files") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for f in files {
                        match f {
                            serde_json::Value::String(s) => {
                                if s.len() > 0 {
                                    active_pn.push(s.clone());
                                }
                            },
                            _ => {}
                        }
                    }
                },
                _ => {}
            }, 
            _ => {}
        };

        let mut passive_pn = vec![];
        match json.get("passive_pn_files") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for f in files {
                        match f {
                            serde_json::Value::String(s) => {
                                if s.len() > 0 {
                                    passive_pn.push(s.clone());
                                }
                            },
                            _ => {}
                        }
                    }
                },
                _ => {}
            }, 
            _ => {}
        };

        let local = match json.get("local") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    if s.len() > 0 {
                        Some(s.clone())
                    } else {
                        None
                    }
                }
                _ => None,
            },
            _ => None,
        };

        let mut addrs = Vec::new();
        match json.get("addrInfo") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for f in files {
                        match f {
                            serde_json::Value::String(s) => {
                                addrs.push(s.clone());
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            },
            _ => {}
        }
        let mut buffer = value.as_buffer();
        let mut known_peers = Vec::new();
        while buffer.len() > 0 {
            let len = if buffer.len() >= 2 {
                let mut rdr = std::io::Cursor::new(buffer[0..2].to_vec());
                let len = rdr.read_u16::<LittleEndian>().unwrap() as usize;
                buffer = &buffer[2..];
                len as usize
            } else {
                return Err(BuckyError::new(
                    BuckyErrorCode::OutOfLimit,
                    "CreateLpcCommandReq buffer not enough 2 Byte",
                ));
            };

            if buffer.len() >= len {
                let (device, other) = Device::raw_decode(&buffer[0..len])?;
                assert!(other.len() == 0);
                buffer = &buffer[len..];
                known_peers.push(device);
            } else {
                let s = format!("CreateLpcCommandReq buffer not enough {} Byte", len);
                return Err(BuckyError::new(BuckyErrorCode::OutOfLimit, s.as_str()));
            }
        }

        match json.get("known_peer_files") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for f in files {
                        match f {
                            serde_json::Value::String(s) => {
                                if s.len() > 0 {
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
                                        log::error!("decode desc failed on create, path={:?}, e={}", path.as_str(), &e);
                                        e
                                    })?;
                                    log::debug!("parse create command active pn {}", device.desc().device_id());
                                    known_peers.push(device);
                                }
                            },
                            _ => {}
                        }
                    }
                },
                _ => {}
            }, 
            _ => {}
        };


        let chunk_cache = match json.get("chunk_cache") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    match s.as_str() {
                        "mem" => Ok("mem".to_string()), 
                        "file" => Ok("file".to_string()), 
                        _ => {
                            let err = BuckyError::new(BuckyErrorCode::InvalidParam, "chunk_cache expect \"mem\"/\"file\"");
                            log::error!("invalid chunk_cache value {}", err);
                            Err(err)
                        }
                    }
                }, 
                _ => {
                    let err = BuckyError::new(BuckyErrorCode::InvalidParam, "chunk_cache expect string");
                    log::error!("invalid chunk_cache value {}", err);
                    Err(err)
                }
            }, 
            _ => {
                Ok("mem".to_string())
            }
        }?;

        Ok(Self {
            seq: value.seq(),
            known_peers,
            sn,
            active_pn, 
            passive_pn,
            local,
            addrs,
            chunk_cache
        })
    }
}

pub struct CreateLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub local: Option<Device>,
}

impl TryFrom<CreateLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CreateLpcCommandResp) -> Result<Self, Self::Error> {
        let mut buffer = [0u8; 4096];
        let (count, id) = match &value.local {
            Some(d) => {
                let enc_buff = &mut buffer[0..];
                let enc_buff = d.raw_encode(enc_buff, &None)?;
                (4096 - enc_buff.len(), format!("{}", d.desc().device_id()))
            }
            None => (0, String::new()),
        };

        let json = serde_json::json!({
            "name": "create_resp",
            "result": value.result,
            "id": id.as_str(),
        });

        log::debug!(
            "convert CreateLpcCommandResp to LpcCommand, local: {:?}",
            &buffer[0..count]
        );
        Ok(LpcCommand::new(value.seq, buffer[0..count].to_vec(), json))
    }
}

pub struct ConnectLpcCommandReq {
    pub seq: u32,
    //LpcCommand的buffer里面
    pub remote_desc: Device,
    //LpcCommand的json里面
    pub question: Vec<u8>,
    //TODO 这个字段暂时是空，的remote的sn的deviceid从device里面去获取
    pub sn_files: Vec<String>,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
}

impl TryFrom<LpcCommand> for ConnectLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let (device, _other) = Device::raw_decode(&buffer)?;

        let json = value.as_json_value();

        let question = match json.get("question") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.as_bytes().to_vec(),
                _ => Vec::new(),
            },
            _ => Vec::new(),
        };

        let mut sn_files = Vec::new();
        match json.get("sn_files") {
            Some(v) => match v {
                serde_json::Value::Array(files) => {
                    for file in files {
                        match file {
                            serde_json::Value::String(s) => {
                                if s.len() > 0 {
                                    sn_files.push(s.clone());
                                }
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            },
            _ => {}
        };

        let known_eps = match json.get("known_eps") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };

        Ok(Self {
            seq: value.seq(),
            remote_desc: device,
            question,
            sn_files,
            known_eps,
        })
    }
}

pub struct ConnectLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
    pub time: u32,
}

impl TryFrom<ConnectLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConnectLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "connect_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
            "time": value.time,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct AutoAcceptStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
}
impl TryFrom<AutoAcceptStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AutoAcceptStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "auto_accept_resp",
            "result": value.result,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct AcceptStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub question: Vec<u8>,
    pub stream_name: String,
}
impl TryFrom<AcceptStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AcceptStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "accept_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
            "question": String::from_utf8(value.question).unwrap(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct ConfirmStreamLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
    pub answer: Vec<u8>,
}
impl TryFrom<LpcCommand> for ConfirmStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let answer = match json.get("answer") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.as_bytes().to_vec(),
                _ => Vec::new(),
            },
            _ => Vec::new(),
        };

        let stream_name = match json.get("stream_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            },
            _ => String::new(),
        };
        Ok(Self {
            seq: value.seq(),
            answer,
            stream_name,
        })
    }
}

pub struct ConfirmStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
}
impl TryFrom<ConfirmStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConfirmStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "confirm_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct CloseStreamLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
    pub which: std::net::Shutdown,
}
impl TryFrom<LpcCommand> for CloseStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let stream_name = match json.get("stream_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            },
            _ => String::new(),
        };
        let which = match json.get("which") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    if s == &String::from("read") {
                        std::net::Shutdown::Read
                    } else if s == &String::from("both") {
                        std::net::Shutdown::Both
                    } else {
                        std::net::Shutdown::Write
                    }
                }
                _ => std::net::Shutdown::Write,
            },
            _ => std::net::Shutdown::Write,
        };
        Ok(Self {
            seq: value.seq(),
            stream_name,
            which,
        })
    }
}
pub struct CloseStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
}
impl TryFrom<CloseStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CloseStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "close_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct ResetStreamLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
}
impl TryFrom<LpcCommand> for ResetStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let stream_name = match json.get("stream_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            },
            _ => String::new(),
        };
        Ok(Self {
            seq: value.seq(),
            stream_name,
        })
    }
}
pub struct ResetStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
}
impl TryFrom<ResetStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ResetStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "reset_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct SendLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
    pub size: u64,
}
impl TryFrom<LpcCommand> for SendLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let stream_name = match json.get("stream_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            },
            _ => String::new(),
        };

        let size = match json.get("size") {
            Some(v) => match v {
                serde_json::Value::Number(s) => s.as_u64().unwrap(),
                _ => 0,
            },
            _ => 0,
        };

        Ok(Self {
            seq: value.seq(),
            stream_name,
            size,
        })
    }
}

pub struct SendLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
    pub time: u32,
    pub hash: HashValue,
}
impl TryFrom<SendLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SendLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "send_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
            "time": value.time,
            "hash": hex::encode(value.hash.as_slice())
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct RecvLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
}
impl TryFrom<LpcCommand> for RecvLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let stream_name = match json.get("stream_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => s.clone(),
                _ => String::new(),
            },
            _ => String::new(),
        };
        Ok(Self {
            seq: value.seq(),
            stream_name,
        })
    }
}

pub struct RecvLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub stream_name: String,
    pub file_size: u64,
    pub hash: HashValue,
}
impl TryFrom<RecvLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: RecvLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "recv_resp",
            "result": value.result,
            "stream_name": value.stream_name.as_str(),
            "hash": hex::encode(value.hash.as_slice()),
            "file_size": value.file_size,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct SetChunkLpcCommandReq {
    pub seq: u32,
    pub content: Vec<u8>,
}

impl TryFrom<LpcCommand> for SetChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();

        Ok(Self {
            seq: value.seq(),
            content: Vec::from(buffer),
        })
    }
}

pub struct SetChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub chunk_id: ChunkId,
}

impl TryFrom<SetChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SetChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "set-chunk-resp",
            "result": value.result,
            "chunk_id": hex::encode(value.chunk_id.as_slice()),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct InterestChunkLpcCommandReq {
    pub seq: u32,
    //LpcCommand的buffer里面
    pub remote: Device,
    pub chunk_id: ChunkId,
}

impl TryFrom<LpcCommand> for InterestChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let (remote, _other) = Device::raw_decode(&buffer)?;

        let json = value.as_json_value();

        let chunk_id = match json.get("chunk_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let chunk_id: Vec<u8> = hex::decode(s).unwrap();
                    let (chunk_id, _) = ChunkId::raw_decode(chunk_id.as_slice())?;
                    chunk_id
                }
                _ => {
                    return Err(BuckyError::new(
                        BuckyErrorCode::InvalidData,
                        "chunk-id format err",
                    ))
                }
            },
            _ => return Err(BuckyError::new(BuckyErrorCode::NotFound, "chunk-id lost")),
        };

        Ok(Self {
            seq: value.seq(),
            remote,
            chunk_id,
        })
    }
}

pub struct InterestChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
}

impl TryFrom<InterestChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: InterestChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "interest-chunk-resp",
            "result": value.result,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct CheckChunkLpcCommandReq {
    pub seq: u32,
    pub chunk_id: ChunkId,
}

impl TryFrom<LpcCommand> for CheckChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let chunk_id = match json.get("chunk_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let chunk_id: Vec<u8> = hex::decode(s).unwrap();
                    let (chunk_id, _) = ChunkId::raw_decode(chunk_id.as_slice())?;
                    chunk_id
                }
                _ => {
                    return Err(BuckyError::new(
                        BuckyErrorCode::InvalidData,
                        "chunk-id format err",
                    ))
                }
            },
            _ => return Err(BuckyError::new(BuckyErrorCode::NotFound, "chunk-id lost")),
        };

        Ok(Self {
            seq: value.seq(),
            chunk_id,
        })
    }
}

pub struct CheckChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub state: ChunkState,
}

impl TryFrom<CheckChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CheckChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let state = match value.state {
            ChunkState::Unknown => "Unknown",
            ChunkState::NotFound => "NotFound",
            ChunkState::Pending => "Pending",
            ChunkState::OnAir => "OnAir",
            ChunkState::Ready => "Ready",
            ChunkState::Ignore => "Ignore",
        };

        let json = serde_json::json!({
            "name": "check-chunk-resp",
            "result": value.result,
            "state": state
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct AddDeviceCommandReq {
    pub seq: u32,
    pub device: Device,
}

impl TryFrom<LpcCommand> for AddDeviceCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let device = if value.as_buffer().len() > 0 {
            let (device, _) = Device::raw_decode(value.as_buffer())?;
            Ok(device)
        } else {
            Err(BuckyError::new(
                BuckyErrorCode::InvalidInput,
                "device buffer lost",
            ))
        }?;

        Ok(Self {
            seq: value.seq(),
            device,
        })
    }
}

pub struct AddDeviceCommandResp {
    pub seq: u32,
    pub result: BuckyResult<()>,
}

impl TryFrom<AddDeviceCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AddDeviceCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        let result = match value.result {
            Ok(_) => BuckyErrorCode::Ok.as_u16(),
            Err(err) => err.code().as_u16(),
        };

        Ok(LpcCommand::new(
            seq,
            vec![],
            serde_json::json!({
                "name": "add-device-resp",
                "result": result,
            }),
        ))
    }
}

pub struct CreateFileSessionCommandReq {
    pub seq: u32,
    pub default_hub: DeviceId,
    // 文件在用例里面生成
    pub path: PathBuf,
    pub file: Option<File>,
}

impl TryFrom<LpcCommand> for CreateFileSessionCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let path = match json.get("path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;

        let default_hub = match json.get("default_hub") {
            Some(v) => match v {
                serde_json::Value::String(s) => DeviceId::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "default_hub format err",
                )),
            },
            _ => Err(BuckyError::new(
                BuckyErrorCode::NotFound,
                "default_hub-id lost",
            )),
        }?;

        let file = if value.as_buffer().len() > 0 {
            let (file, _) = File::raw_decode(value.as_buffer())?;
            Some(file)
        } else {
            None
        };

        Ok(Self {
            seq: value.seq(),
            default_hub,
            path,
            file,
        })
    }
}

pub struct CreateFileSessionCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
}

impl TryFrom<CreateFileSessionCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CreateFileSessionCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session, file)) => {
                let json = serde_json::json!({
                    "name": "create-file-session-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                let buf_len = file.raw_measure(&None)?;
                let mut buf = vec![0u8; buf_len];
                let _ = file.raw_encode(buf.as_mut_slice(), &None)?;
                Ok(LpcCommand::new(seq, buf, json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "create-file-session-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}

pub struct StartTransSessionCommandReq {
    pub seq: u32,
    pub session: u32,
    pub options: Option<u32>
}

impl TryFrom<LpcCommand> for StartTransSessionCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let session = 0;

        let options = match json.get("options") {
            Some(v) => {
                if let serde_json::Value::Object(json) = v {
                    let options = 0;
                    if let Some(b) = json.get("enable_upload") {
                        if let serde_json::Value::Bool(b) = b {
                        }
                    }
                    Ok(Some(options))
                } else { 
                    Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "session format err"))
                } 
            }, 
            None => Ok(None)
        }?;

        Ok(Self {
            seq: value.seq(),
            session,
            options
        })
    }
}

pub struct GetTransSessionStateCommandReq {
    pub seq: u32,
    pub session: String,
}

impl TryFrom<LpcCommand> for GetTransSessionStateCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let session = match json.get("session") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "session format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "session lost")),
        }?;

        Ok(Self {
            seq: value.seq(),
            session,
        })
    }
}

pub struct GetTransSessionStateCommandResp {
    pub seq: u32,
    pub state: BuckyResult<TaskControlState>,
}

impl TryFrom<GetTransSessionStateCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: GetTransSessionStateCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "get-trans-session-state-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    TaskControlState::Downloading(speed) => format!("OnAir({})", speed),
                    TaskControlState::Finished => String::from("Ready"),
                    TaskControlState::Paused => String::from("Pending"),
                    _ => String::from("unkown"),
                }
            }),
            Err(err) => serde_json::json!({
                "name": "get-trans-session-state-resp",
                "result": err.code().as_u16(),
            }),
        };
        Ok(LpcCommand::new(value.seq, vec![], json))
    }
}

//
pub struct StartSendFileCommandReq {
    pub seq: u32,
    pub path: PathBuf,
    pub chunk_size_mb: usize,
}

impl TryFrom<LpcCommand> for StartSendFileCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let path = match json.get("path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;

        let chunk_size_mb = match json.get("chunk_size_mb") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size_mb format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size_mb format err",
                )),
            },
            _ => Ok(10),
        }?;

        Ok(Self {
            seq: value.seq(),
            path,
            chunk_size_mb: chunk_size_mb as usize,
        })
    }
}

pub struct StartSendFileCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
}

impl TryFrom<StartSendFileCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: StartSendFileCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session, file)) => {
                let json = serde_json::json!({
                    "name": "start-send-file-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                let buf_len = file.raw_measure(&None)?;
                let mut buf = vec![0u8; buf_len];
                let _ = file.raw_encode(buf.as_mut_slice(), &None)?;
                Ok(LpcCommand::new(seq, buf, json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "start-send-file-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}

pub struct StartDownloadFileCommandReq {
    pub seq: u32,
    pub peer_id: DeviceId,
    pub second_peer_id: Option<DeviceId>,
    pub path: PathBuf,
    pub file: Option<File>,
}

impl TryFrom<LpcCommand> for StartDownloadFileCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let path = match json.get("path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;

        let peer_id = match json.get("peer_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => DeviceId::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "peer_id format err",
                )),
            },
            _ => Err(BuckyError::new(
                BuckyErrorCode::NotFound,
                "peer_id-id lost",
            )),
        }?;
        
        let second_peer_id = match json.get("second_peer_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let ret = DeviceId::from_str(s.as_str());
                    if ret.is_err() {
                        Err(BuckyError::new(
                            BuckyErrorCode::InvalidData,
                            "path format err",
                        ))
                    } else {
                        Ok(Some(ret.unwrap()))
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "second_peer_id format err",
                )),
            },
            _ => Ok(None),
        }?;

        let file = if value.as_buffer().len() > 0 {
            let (file, _) = File::raw_decode(value.as_buffer())?;
            Some(file)
        } else {
            None
        };

        Ok(Self {
            seq: value.seq(),
            peer_id,
            second_peer_id,
            path,
            file,
        })
    }
}

pub struct StartDownloadFileCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
}

impl TryFrom<StartDownloadFileCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: StartDownloadFileCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session, file)) => {
                let json = serde_json::json!({
                    "name": "start-download-file-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                let buf_len = file.raw_measure(&None)?;
                let mut buf = vec![0u8; buf_len];
                let _ = file.raw_encode(buf.as_mut_slice(), &None)?;
                Ok(LpcCommand::new(seq, buf, json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "start-download-file-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}

pub struct DownloadFileStateCommandReq {
    pub seq: u32,
    pub session: String,
}

impl TryFrom<LpcCommand> for DownloadFileStateCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();

        let session = match json.get("session") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "session format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "session lost")),
        }?;

        Ok(Self {
            seq: value.seq(),
            session,
        })
    }
}
pub struct DownloadFileStateCommandResp {
    pub seq: u32,
    pub state: BuckyResult<TaskControlState>,
}

impl TryFrom<DownloadFileStateCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: DownloadFileStateCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "download-file-state-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    TaskControlState::Downloading(speed) => format!("OnAir({})", speed),
                    TaskControlState::Finished => String::from("Ready"),
                    TaskControlState::Paused => String::from("Pending"),
                    _ => String::from("unkown"),
                }
            }),
            Err(err) => serde_json::json!({
                "name": "download-file-state-resp",
                "result": err.code().as_u16(),
            }),
        };
        Ok(LpcCommand::new(value.seq, vec![], json))
    }
}
