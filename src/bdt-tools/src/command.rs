use crate::lib::{LpcCommand};
use byteorder::{LittleEndian, ReadBytesExt};
use cyfs_base::{
    RawDecode, 
    RawEncode,
    *,
};
use std::{
    path::{PathBuf}, 
    ops::Range,
    collections::BTreeSet,
};
use std::convert::TryFrom;

use std::str::FromStr;
use std::io::{Read};
use cyfs_bdt::{ DownloadTaskState };
use serde::{Serialize};
#[derive(Serialize)]
pub struct FileInfo{
    pub name : String,
    pub file_id : String
}



pub struct CreateLpcCommandReq {
    pub seq: u32,
    pub known_peers: Vec<Device>,
    pub sn: Vec<String>, 
    pub active_pn: Vec<String>, 
    pub passive_pn: Vec<String>, 
    pub addrs: Vec<String>,
    pub bdt_port : Option<u32>,
    pub local: Option<String>, 
    pub device_tag : Option<String>, 
    pub chunk_cache: String,
    pub ep_type :  Option<String>,
    pub ndn_event : Option<String>,
    pub ndn_event_target : Option<DeviceId>,
    pub sn_only : bool,
    pub tcp_port_mapping : Option<Vec<(cyfs_base::Endpoint, u16)>>,
    
}

impl TryFrom<LpcCommand> for CreateLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let ep_type = match json.get("ep_type") {
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
        let ndn_event = match json.get("ndn_event") {
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
        let ndn_event_target = match json.get("ndn_event_target") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    if s.len() > 0 {
                        let deviceId = match cyfs_base::DeviceId::from_str(&s){
                            Ok(d) => {
                                Some(d)
                            },
                            Err(e)=>{
                                let errInfo = format!("CreateLpcCommandReq ndn_event_target decode to Device Id failed,err= {}", e);
                                return Err(BuckyError::new(BuckyErrorCode::OutOfLimit, errInfo.as_str()));
                            }
                        };
                        deviceId
                    } else {
                        None
                    }
                }
                _ => None,
            },
            _ => None,
        };
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
        let device_tag = match json.get("device_tag") {
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
        let bdt_port = match json.get("bdt_port") {
            Some(v) => match v {
                serde_json::Value::Number(n) =>{
                    Some(n.as_u64().unwrap() as u32)
                }
                _ => None,
            },
            _ => None,
        };
        
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

        let sn_only = match json.get("sn_only") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };
        let tcp_port_mapping = None;
        Ok(Self {
            seq: value.seq(),
            known_peers,
            sn,
            active_pn, 
            passive_pn,
            local,
            device_tag,
            addrs,
            bdt_port,
            chunk_cache,
            ep_type,
            ndn_event,
            ndn_event_target,
            sn_only,
            tcp_port_mapping
        })
    }
}

pub struct CreateLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub local: Option<Device>,
    pub ep_info : BTreeSet<cyfs_base::Endpoint>,
    pub ep_resp : Vec<cyfs_base::Endpoint>,
    pub online_time : u32,
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
        let mut ep_info = Vec::new();
        let mut ep_resp = Vec::new();
        for ep in value.ep_info {
            ep_info.push(format!("{}",ep)); 
        }
        for ep in value.ep_resp {
            ep_resp.push(format!("{}",ep)); 
        }
        let json = serde_json::json!({
            "name": "create_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "id": id.as_str(),
            "ep_info" : ep_info,
            "ep_resp" : ep_resp,
            "online_time" : value.online_time,
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
    pub question: bool,
    //TODO 这个字段暂时是空，的remote的sn的deviceid从device里面去获取
    pub sn_files: Vec<String>,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
    //是否首次接收数据
    pub accept_answer:bool,
    pub no_cache : bool,
}
pub struct ConnectLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub answer: Vec<u8>,
    pub time: u32,
    pub read_time : u32,
}

impl TryFrom<ConnectLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConnectLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "connect_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "time": value.time,
            "read_time":value.read_time,
            "answer" : String::from_utf8(value.answer).unwrap(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}
impl TryFrom<LpcCommand> for ConnectLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let (device, _other) = Device::raw_decode(&buffer)?;

        let json = value.as_json_value();

        let question = match json.get("question") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
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
        let accept_answer = match json.get("accept_answer") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };
        let no_cache = match json.get("no_cache") {
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
            accept_answer,
            no_cache
        })
    }
}
pub struct ConnectListLpcCommandReq {
    pub seq: u32,
    //LpcCommand的buffer里面
    pub remote_desc_list: Vec<Device>,
    //LpcCommand的json里面
    pub question: Vec<u8>,
    //TODO 这个字段暂时是空，的remote的sn的deviceid从device里面去获取
    pub sn_files: Vec<String>,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
    //是否首次接收数据
    pub accept_answer:bool,
}

impl TryFrom<LpcCommand> for ConnectListLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        
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
        let accept_answer = match json.get("accept_answer") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };
        let _ = match json.get("no_cache") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };
        let mut remote_desc_list: Vec<Device> = Vec::new();
        match json.get("remote_desc_list"){
            Some(v) => match v {
                serde_json::Value::Array(infos) =>{
                    for fileInfo in infos {
                        let device = match fileInfo.get("device_path") {
                            Some(v) => match v {
                                serde_json::Value::String(s) => {
                                    let device_path =  PathBuf::from_str(s.as_str()).unwrap();
                                    let mut file = std::fs::File::open(device_path.as_path()).unwrap();
                                    let mut buf = Vec::<u8>::new();
                                    let _ = file.read_to_end(&mut buf)?;
                                    let (device, _) = Device::raw_decode(buf.as_slice())?;
                                    device  
                                }
                                _ => {
                                    return Err(BuckyError::new(
                                        BuckyErrorCode::InvalidData,
                                        "chunk-id format err",
                                    ))
                                }
                            },
                            _ => return Err(BuckyError::new(BuckyErrorCode::NotFound, "remote_desc_list lost")),
                        };
                        remote_desc_list.push(device);
                        
                    }
                    Ok("success")
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "remote_desc_list format err",
                )),    
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        Ok(Self {
            seq: value.seq(),
            remote_desc_list: remote_desc_list,
            question,
            sn_files,
            known_eps,
            accept_answer,
            
        })
    }
}
pub struct ConnectRecord{
    pub device_id : String,
    pub stream_name: String,
    pub answer: String,
    pub time: u32,
}
pub struct ConnectListLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub records : Vec<ConnectRecord>,
}

impl TryFrom<ConnectListLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConnectListLpcCommandResp) -> Result<Self, Self::Error> {
        let mut records = "".to_string();
        for record in value.records{
            let data = format!("{}#{}#{}#{}$",record.device_id,record.stream_name,record.answer,record.time);
            records += &data;
        }
        let json = serde_json::json!({
            "name": "connect_list_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "records":  records
        });
        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct AutoAcceptStreamLpcCommandReq {
    pub seq: u32,
    pub answer_size: u64,
}
impl TryFrom<LpcCommand> for AutoAcceptStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let answer_size = match json.get("answer_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap(),
                _ => 0,
            },
            _ => 0,
        };
        Ok(Self {
            seq: value.seq(),
            answer_size,
        })
    }
}
pub struct AutoAcceptStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
}
impl TryFrom<AutoAcceptStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AutoAcceptStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "auto_accept_resp",
            "result": value.result,
            "msg": value.msg.as_str(),

        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct ListenerStreamLpcCommandReq {
    pub seq: u32,
    pub answer_size: u64,
}
impl TryFrom<LpcCommand> for ListenerStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();

        let answer_size = match json.get("answer_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap(),
                _ => {
                    return Err(BuckyError::new(
                        BuckyErrorCode::InvalidData,
                        "answer_size format err",
                    ))
                },
            },
            _ => {
                return Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "answer_size format err",
                ))
            },
        };
        Ok(Self {
            seq: value.seq(),
            answer_size,
        })
    }
}

pub struct ListenerStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
}
impl TryFrom<ListenerStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ListenerStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "listener_stream_resp",
            "result": value.result,
            "msg": value.msg.as_str(),

        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct ListenerStreamEventLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub confirm_time : u64,
    pub recv_time : u64,
    pub recv_total_time : u64,
    pub send_time : u64,
    pub send_total_time : u64,
    pub send_hash : HashValue,
    pub recv_hash : HashValue,
}
impl TryFrom<ListenerStreamEventLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ListenerStreamEventLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "listener_stream_event_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "confirm_time" : value.confirm_time,
            "recv_time" : value.recv_time,
            "send_time" : value.send_time,
            "recv_total_time" : value.recv_total_time,
            "send_total_time" : value.send_total_time,
            "send_hash" : hex::encode(value.send_hash.as_slice()),
            "recv_hash" : hex::encode(value.recv_hash.as_slice()),
        });
        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct ConnectSendStreamLpcCommandReq {
    pub seq: u32,
    //LpcCommand的buffer里面
    pub remote: Device,
    //LpcCommand的json里面
    pub question_size: u64,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
}

impl TryFrom<LpcCommand> for ConnectSendStreamLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let (device, _other) = Device::raw_decode(&buffer)?;

        let json = value.as_json_value();

        let question_size =match json.get("question_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap(),
                _ => {
                    return Err(BuckyError::new(
                        BuckyErrorCode::InvalidData,
                        "question_size format err",
                    ))
                },
            },
            _ => {
                return Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "question_size format err",
                ))
            },
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
            remote: device,
            question_size,
            known_eps,
        })
    }
}

pub struct ConnectSendStreamResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub send_hash: HashValue,
    pub recv_hash: HashValue,
    pub connect_time: u64,
    pub send_time : u64,
    pub send_total_time : u64,
    pub recv_time : u64,
    pub recv_total_time : u64,
}

impl TryFrom<ConnectSendStreamResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConnectSendStreamResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "connect_send_stream_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "send_hash" :  hex::encode(value.send_hash.as_slice()),
            "recv_hash" :  hex::encode(value.recv_hash.as_slice()),
            "connect_time": value.connect_time,
            "send_total_time":value.send_total_time,
            "send_time":value.send_time,
            "recv_time":value.recv_time,
            "recv_total_time":value.recv_total_time,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}




// pub struct AcceptStreamLpcCommandReq {

// }
// impl TryFrom<LpcCommand> for AcceptStreamLpcCommandReq {
//     type Error = BuckyError;
//     fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
//         Ok(Self)
//     }
// }
pub struct AcceptStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub question: Vec<u8>,
    pub stream_name: String,
}
impl TryFrom<AcceptStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AcceptStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "accept_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
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


pub struct SetAnswerLpcCommandReq {
    pub seq: u32,
    pub answer_size: u64,
}
impl TryFrom<LpcCommand> for SetAnswerLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let answer_size = match json.get("answer_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap(),
                _ => 0,
            },
            _ => 0,
        };
        let buffer = value.as_buffer();
        Ok(Self {
            seq: value.seq(),
            answer_size,
        })
    }
}

pub struct SetAnswerLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
}
impl TryFrom<SetAnswerLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SetAnswerLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "set_answer_resp",
            "result": value.result,
            "msg": value.msg.as_str(),

        });
        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct SetQuestionLpcCommandReq {
    pub seq: u32,
    pub question_size: u64,
}
impl TryFrom<LpcCommand> for SetQuestionLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let question_size = match json.get("question_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap(),
                _ => 0,
            },
            _ => 0,
        };
        let buffer = value.as_buffer();
        Ok(Self {
            seq: value.seq(),
            question_size,
        })
    }
}

pub struct SetQuestionLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
}
impl TryFrom<SetQuestionLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SetQuestionLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "set_qustion_resp",
            "result": value.result,
            "msg": value.msg.as_str(),

        });
        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct ConfirmStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub send_hash : HashValue,
    pub recv_hash : HashValue,
    pub calculate_time : u64,
    pub confirm_time : u64,
}
impl TryFrom<ConfirmStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ConfirmStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "confirm_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "confirm_time" : value.confirm_time,
            "calculate_time" : value.calculate_time,
            "recv_hash" : hex::encode(value.recv_hash.as_slice()),
            "send_hash" : hex::encode(value.recv_hash.as_slice()),
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
    pub msg: String,
    pub stream_name: String,
}
impl TryFrom<CloseStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CloseStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "close_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
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
    pub msg: String,
    pub stream_name: String,
}
impl TryFrom<ResetStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: ResetStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "reset_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
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
    pub msg: String,
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
            "msg": value.msg.as_str(),
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
    pub msg: String,
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
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "hash": hex::encode(value.hash.as_slice()),
            "file_size": value.file_size,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct SetChunkLpcCommandReq {
    pub seq: u32,
    pub path : PathBuf,
    pub chunk_id: ChunkId,
    pub chunk_size : usize,
}

impl TryFrom<LpcCommand> for SetChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let chunk_id = match json.get("chunk_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let chunk_id = ChunkId::from_str(s).unwrap();
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
        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10*1024*1024),
        }?;
        Ok(Self {
            seq: value.seq(),
            path,
            chunk_id,
            chunk_size : chunk_size as usize,
        })
    }
}

pub struct SetChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub chunk_id: ChunkId,
    pub set_time : u32,
}

impl TryFrom<SetChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SetChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "set-chunk-resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "chunk_id": value.chunk_id.to_string(),
            "set_time" : value.set_time,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}
pub struct CalculateChunkLpcCommandReq {
    pub seq: u32,
    pub path : PathBuf,
    pub chunk_size : usize,
}

impl TryFrom<LpcCommand> for CalculateChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
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
        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10),
        }?;
        Ok(Self {
            seq: value.seq(),
            path,
            chunk_size : chunk_size as usize
        })
    }
}
pub struct CalculateChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub chunk_id: ChunkId,
    pub calculate_time : u32,
}

impl TryFrom<CalculateChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CalculateChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "calculate-chunk-resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "chunk_id": value.chunk_id.to_string(),
            "calculate_time" : value.calculate_time,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}
pub struct TrackChunkLpcCommandReq {
    pub seq: u32,
    pub path : PathBuf,
    pub chunk_size : usize,
}

impl TryFrom<LpcCommand> for TrackChunkLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
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
        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10),
        }?;
        Ok(Self {
            seq: value.seq(),
            path,
            chunk_size : chunk_size as usize
        })
    }
}

pub struct TrackChunkLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub chunk_id: ChunkId,
    pub calculate_time : u32,
    pub set_time : u32,
}

impl TryFrom<TrackChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: TrackChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "calculate-chunk-resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "chunk_id": value.chunk_id.to_string(),
            "calculate_time" : value.calculate_time,
            "set_time" : value.set_time,
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
                    let chunk_id = ChunkId::from_str(s).unwrap();
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
    pub msg: String,
}

impl TryFrom<InterestChunkLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: InterestChunkLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "interest-chunk-resp",
            "result": value.result,
            "msg": value.msg.as_str(),
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct InterestChunkListLpcCommandReq {
    pub seq: u32,
    pub task_name : String,
    pub remote: Device,
    pub chunk_list: Vec<ChunkId>,
}
impl TryFrom<LpcCommand> for InterestChunkListLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let (remote, _other) = Device::raw_decode(&buffer)?;

        let json = value.as_json_value();
        let task_name = match json.get("task_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "task_name format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "task_name lost")),
        }?;
        let mut chunk_list: Vec<ChunkId> = Vec::new();
        match json.get("chunk_list"){
            Some(v) => match v {
                serde_json::Value::Array(infos) =>{
                    for fileInfo in infos {
                        let chunk_id = match fileInfo.get("chunk_id") {
                            Some(v) => match v {
                                serde_json::Value::String(s) => {
                                    let chunk_id = ChunkId::from_str(s).unwrap();
                                    chunk_id
                                    
                                }
                                _ => {
                                    return Err(BuckyError::new(
                                        BuckyErrorCode::InvalidData,
                                        "chunk-id format err",
                                    ))
                                }
                            },
                            _ => return Err(BuckyError::new(BuckyErrorCode::NotFound, "chunk_list lost")),
                        };
                        chunk_list.push(chunk_id);
                        
                    }
                    Ok("success")
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_list format err",
                )),    
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        

        Ok(Self {
            seq: value.seq(),
            task_name,
            remote,
            chunk_list,
        })
    }
}

pub struct InterestChunkListCommandResp {
    pub seq: u32,
    pub result: BuckyResult<String>,
}

impl TryFrom<InterestChunkListCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: InterestChunkListCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok(session) => {
                let json = serde_json::json!({
                    "name": "interest-chunk-list-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "interest-chunk-list-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}  

pub struct CheckChunkListCommandReq {
    pub seq: u32,
    pub session: String,
}

impl TryFrom<LpcCommand> for CheckChunkListCommandReq {
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
pub struct CheckChunkListCommandResp {
    pub seq: u32,
    pub state: BuckyResult<DownloadTaskState>,
}

impl TryFrom<CheckChunkListCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CheckChunkListCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "check-chunk-list-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    DownloadTaskState::Downloading(speed,progress) => format!("Downloading({},{})", speed,progress),
                    // DownloadTaskState::Finished(speed) => format!("Finished({})", speed),
                    DownloadTaskState::Finished => format!("Finished"),
                    DownloadTaskState::Paused => String::from("Paused"),
                    DownloadTaskState::Error(errorCode)=>format!("Err({})", errorCode),
                }
            }),
            Err(err) => serde_json::json!({
                "name": "check-chunk-list-resp",
                "result": err.code().as_u16(),
            }),
        };
        Ok(LpcCommand::new(value.seq, vec![], json))
    }
}




pub struct GetSystemInfoLpcCommandReq {
    pub seq: u32,
}
impl TryFrom<LpcCommand> for GetSystemInfoLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        // let json = value.as_json_value();
        Ok(Self {
            seq: value.seq()
        })
    }
}
pub struct GetSystemInfoLpcCommandResp {
    pub seq: u32,
    pub result: u64,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    // 每个刷新周期之间的传输的bytes
    pub received_bytes: u64,
    pub transmitted_bytes: u64,

    // SSD硬盘容量和可用容量，包括Unknown
    pub ssd_disk_total: u64,
    pub ssd_disk_avail: u64,

    // HDD硬盘容量和可用容量
    pub hdd_disk_total: u64,
    pub hdd_disk_avail: u64,
}

impl TryFrom<GetSystemInfoLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: GetSystemInfoLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "get-system-info-resp",
            "result" : value.result,
            "cpu_usage": value.cpu_usage,
            "total_memory": value.total_memory,
            "used_memory": value.used_memory,
            "received_bytes": value.received_bytes,
            "transmitted_bytes": value.transmitted_bytes,
            "ssd_disk_total": value.ssd_disk_total,
            "ssd_disk_avail": value.ssd_disk_avail,
            "hdd_disk_total": value.hdd_disk_total,
            "hdd_disk_avail": value.hdd_disk_avail,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct UploadSystemInfoLpcCommandReq {
    pub seq: u32,
    pub agent_name : String,
    pub testcaseId : String,
    pub interval : u64,
}
impl TryFrom<LpcCommand> for UploadSystemInfoLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let interval = match json.get("interval") {
            Some(v) => match v {
                serde_json::Value::Number(s) => s.as_u64().unwrap(),
                _ => 2000,
            },
            _ => 2000,
        };
        let agent_name = match json.get("agent_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "agent_name format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "name lost")),
        }?;
        let testcaseId = match json.get("testcaseId") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "testcaseId format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "testcaseId lost")),
        }?;
        Ok(Self {
            seq: value.seq(),
            agent_name,
            testcaseId,
            interval,
        })
    }
}
pub struct UploadSystemInfoLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
}
impl TryFrom<UploadSystemInfoLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: UploadSystemInfoLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "upload_system_info_resp",
            "result": value.result,
            "msg": value.msg.as_str(),

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
                    let chunk_id = ChunkId::from_str(s).unwrap();
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
    pub msg: String,
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
            "msg": value.msg.as_str(),
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
                        if let serde_json::Value::Bool(_b) = b {
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
    pub state: BuckyResult<DownloadTaskState>,
}

impl TryFrom<GetTransSessionStateCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: GetTransSessionStateCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "get-trans-session-state-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    DownloadTaskState::Downloading(speed,progress) => format!("OnAir({},{})", speed,progress),
                    DownloadTaskState::Finished => String::from("Ready"),
                    DownloadTaskState::Paused => String::from("Pending"),
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
    pub chunk_size: usize,
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

        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10),
        }?;

        Ok(Self {
            seq: value.seq(),
            path,
            chunk_size: chunk_size as usize,
        })
    }
}

pub struct StartSendFileCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
    pub set_time : u32,
    pub calculate_time : u32,
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
                    "set_time" : value.set_time,
                    "calculate_time" : value.calculate_time,
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

pub struct CalculateFileCommandReq {
    pub seq: u32,
    pub path: PathBuf,
    pub chunk_size: usize,
}

impl TryFrom<LpcCommand> for CalculateFileCommandReq {
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

        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10),
        }?;

        Ok(Self {
            seq: value.seq(),
            path,
            chunk_size: chunk_size as usize,
        })
    }
}
pub struct CalculateFileCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
    pub calculate_time : u32,
}

impl TryFrom<CalculateFileCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CalculateFileCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session, file)) => {
                let json = serde_json::json!({
                    "name": "start-send-file-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "ObjectId": session.to_string(),
                    "calculate_time" : value.calculate_time,
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

pub struct SetFileCommandReq {
    pub seq: u32,
    pub path: PathBuf,
    pub file: Option<File>,
}

impl TryFrom<LpcCommand> for SetFileCommandReq {
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
        let file = if value.as_buffer().len() > 0 {
            let (file, _) = File::raw_decode(value.as_buffer())?;
            Some(file)
        } else {
            None
        };
        
        Ok(Self {
            seq: value.seq(),
            path,
            file,
        })
    }
}

pub struct SetFileCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
    pub set_time : u32,
}

impl TryFrom<SetFileCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SetFileCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session, file)) => {
                let json = serde_json::json!({
                    "name": "start-send-file-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "ObjectId": session.to_string(),
                    "set_time" : value.set_time,
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
    pub remotes: Vec<DeviceId>,
    pub group : Option<String>,
    pub referer :Option<String>,
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
        let mut remotes : Vec<DeviceId> = Vec::new();
        let _ = match json.get("remotes") {
            Some(v) => match v {
                serde_json::Value::Array(infos) => {
                    for device in infos {
                        let _ = match device{
                            serde_json::Value::String(s)=>{
                                let ret = DeviceId::from_str(s.as_str());
                                if ret.is_err() {
                                    log::error!("remote deviceId must be base58 String");
                                } else {
                                    remotes.push(ret.unwrap());
                                   log::info!("Read remote deviceId success");
                                }
                            },
                            _ =>{
                                log::error!("remote deviceId must be base58 String");
                            }
                        };
                        
                    }         
                },
                _ => {
                    log::error!("remote deviceId must be base58 String");
                },
            },
            _ =>{
                log::error!("remote deviceId must be base58 String");
            },
        };
        let group = match json.get("group") {
            Some(v) => match v {
                serde_json::Value::String(s) => Some(s.to_string()),
                _ => None,
            },
            _ => None,
        };
        let referer = match json.get("referer") {
            Some(v) => match v {
                serde_json::Value::String(s) => Some(s.to_string()),
                _ => None,
            },
            _ => None,
        };
        let file = if value.as_buffer().len() > 0 {
            let (file, _) = File::raw_decode(value.as_buffer())?;
            Some(file)
        } else {
            None
        };

        Ok(Self {
            seq: value.seq(),
            remotes,
            group,
            referer,
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


pub struct CreateDownloadGroupCommandReq {
    pub seq: u32,
    pub path: String, 
    pub remotes: Vec<DeviceId>,
    pub context: Option<String>
}

impl TryFrom<LpcCommand> for CreateDownloadGroupCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();
        let path = match json.get("path") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.to_string()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        let mut remotes : Vec<DeviceId> = Vec::new();
        let _ = match json.get("remotes") {
            Some(v) => match v {
                serde_json::Value::Array(infos) => {
                    for device in infos {
                        let _ = match device{
                            serde_json::Value::String(s)=>{
                                let ret = DeviceId::from_str(s.as_str());
                                if ret.is_err() {
                                    log::error!("remote deviceId must be base58 String");
                                } else {
                                    remotes.push(ret.unwrap());
                                   log::info!("Read remote deviceId success");
                                }
                            },
                            _ =>{
                                log::error!("remote deviceId must be base58 String");
                            }
                        };
                        
                    }         
                },
                _ => {
                    log::error!("remote deviceId must be base58 String");
                },
            },
            _ =>{
                log::error!("remote deviceId must be base58 String");
            },
        };
        let context = match json.get("context") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    Some(s.to_string())
                },
                _ => None,
            },
            _ => None,
        };

        Ok(Self {
            seq: value.seq(),
            path,
            remotes,
            context,
        })
    }
}
pub struct CreateDownloadGroupCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String)>,
}

impl TryFrom<CreateDownloadGroupCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CreateDownloadGroupCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session)) => {
                let json = serde_json::json!({
                    "name": "create-download-group-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                Ok(LpcCommand::new(seq,vec![], json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "create-download-group-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}

pub struct CreateUploadGroupCommandReq {
    pub seq: u32,
    pub path: String, 
}

impl TryFrom<LpcCommand> for CreateUploadGroupCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();
        let path = match json.get("path") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.to_string()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        Ok(Self {
            seq: value.seq(),
            path
        })
    }
}
pub struct CreateUploadGroupCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String)>,
}

impl TryFrom<CreateUploadGroupCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: CreateUploadGroupCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session)) => {
                let json = serde_json::json!({
                    "name": "create-upload-group-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session": session.to_string(),
                });
                Ok(LpcCommand::new(seq,vec![], json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "create-upload-group-resp",
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
    pub state: BuckyResult<DownloadTaskState>,
}

impl TryFrom<DownloadFileStateCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: DownloadFileStateCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "download-file-state-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    DownloadTaskState::Downloading(speed,progress) => format!("Downloading({},{})", speed,progress),
                    //DownloadTaskState::Finished(speed) => format!("Finished({})",speed),
                    DownloadTaskState::Finished => format!("Finished"),
                    DownloadTaskState::Paused => String::from("Paused"),
                    DownloadTaskState::Error(errorCode)=>format!("Err({})", errorCode),
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

pub struct StartDownloadFileQWithRangesCommandReq {
    pub seq: u32,
    pub peer_id: DeviceId,
    pub second_peer_id: Option<DeviceId>,
    pub path: PathBuf,
    pub ranges: Option<Vec<Range<u64>>>,
    pub file: Option<File>,
}

impl TryFrom<LpcCommand> for StartDownloadFileQWithRangesCommandReq {
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
        let mut ranges:Vec<Range<u64>> =Vec::new();
        match json.get("ranges"){
            Some(v) => match v {
                serde_json::Value::Array(infos) =>{
                    for fileInfo in infos {
                        let begin =match fileInfo.get("begin"){
                            Some(v) => match v {
                                serde_json::Value::Number(n) => {
                                    match n.as_u64() {
                                        Some(i) => {
                                            Ok(i)
                                        },
                                        None => {
                                            Err(BuckyError::new(
                                                BuckyErrorCode::InvalidData,
                                                "begin format err",
                                            ))
                                        }
                                    }
                                },
                                _ => Err(BuckyError::new(
                                    BuckyErrorCode::InvalidData,
                                    "dir_map format err",
                                )),  
                            },
                            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
                        }?;
                        let end =match fileInfo.get("end"){
                            Some(v) => match v {
                                serde_json::Value::Number(n) => {
                                    match n.as_u64() {
                                        Some(i) => {
                                            Ok(i)
                                        },
                                        None => {
                                            Err(BuckyError::new(
                                                BuckyErrorCode::InvalidData,
                                                "end format err",
                                            ))
                                        }
                                    }
                                },
                                _ => Err(BuckyError::new(
                                    BuckyErrorCode::InvalidData,
                                    "dir_map format err",
                                )),  
                            },
                            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
                        }?;
                        ranges.push(begin..end);
                    }
                    Ok("success")
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_map format err",
                )),    
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        let ranges_opt = Some(ranges);
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
            ranges:ranges_opt,
            file,
        })
    }
}

pub struct StartDownloadFileWithRangesCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String, File)>,
}

impl TryFrom<StartDownloadFileWithRangesCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: StartDownloadFileWithRangesCommandResp) -> BuckyResult<Self> {
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



pub struct StartSendDirCommandReq {
    pub seq: u32,
    pub path: PathBuf,
    pub dir_object_path : PathBuf,
    pub chunk_size: usize,
}

impl TryFrom<LpcCommand> for StartSendDirCommandReq {
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
        let dir_object_path = match json.get("dir_object_path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "dir_object_path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_object_path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "dir_object_path lost")),
        }?;

        let chunk_size = match json.get("chunk_size") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "chunk_size format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "chunk_size format err",
                )),
            },
            _ => Ok(10),
        }?;

        Ok(Self {
            seq: value.seq(),
            path,
            dir_object_path,
            chunk_size: chunk_size as usize,
        })
    }
}

pub struct StartSendDirCommandResp {
    pub seq: u32,
    //pub dir_object_path: PathBuf,
    pub result: BuckyResult<(String,PathBuf,cyfs_base::Dir,Vec<FileInfo>)>,
}

impl TryFrom<StartSendDirCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: StartSendDirCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session,dir_object_path,dir,dir_map)) => {
                let json = serde_json::json!({
                    "name": "start-send-dir-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "dir_object_path" : dir_object_path.to_str().unwrap().to_string(),   
                    "session": session.to_string(),
                    "dir_id" :dir.desc().calculate_id().to_string(),
                    "dir_map" :  dir_map
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "start-send-dir-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}






pub struct StartDownloadDirCommandReq {
    pub seq: u32,
    pub peer_id: DeviceId,
    pub second_peer_id: Option<DeviceId>,
    pub path: PathBuf,
    //pub dir_name : String,
    pub dir_object_path: PathBuf,
    pub dir: Option<cyfs_base::Dir>,
    pub dir_map : Vec<FileInfo>
    
}


impl TryFrom<LpcCommand> for StartDownloadDirCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> BuckyResult<Self> {
        let json = value.as_json_value();
        let mut path = match json.get("path") {
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
        let dir_name = match json.get("dir_name") {
            Some(v) => match v {
                serde_json::Value::String(s) => Ok(s.clone()),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_name format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "dir_name lost")),
        }?;
        path = path.join(dir_name);
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
        let dir_object_path = match json.get("dir_object_path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "dir_object_path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_object_path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
        }?;
        let mut dir_map:Vec<FileInfo> =Vec::new();
        match json.get("dir_map"){
            Some(v) => match v {
                serde_json::Value::Array(infos) =>{
                    for fileInfo in infos {
                        let name =match fileInfo.get("name"){
                            Some(v) => match v {
                                serde_json::Value::String(s) =>  Ok(s.clone()),
                                _ => Err(BuckyError::new(
                                    BuckyErrorCode::InvalidData,
                                    "dir_map format err",
                                )),
                            },
                            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
                        }?;
                        let file_id =match fileInfo.get("file_id"){
                            Some(v) => match v {
                                serde_json::Value::String(s) => Ok(s.clone()),
                                _ => Err(BuckyError::new(
                                    BuckyErrorCode::InvalidData,
                                    "dir_map format err",
                                )),
                            },
                            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
                        }?;
                        dir_map.push(FileInfo{
                            name:name,
                            file_id :file_id
                        });
                        
                    }
                    Ok("success")
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_map format err",
                )),    
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "path lost")),
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

        let dir = match json.get("dir_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let entry = dir_object_path.clone().join("dir_obj").join(s);
                    let mut file = std::fs::File::open(entry.clone()).unwrap();
                    let mut buf = Vec::<u8>::new();
                    let _ = file.read_to_end(&mut buf).map_err(|e| {
                        log::error!("read dir object failed , e={}", &e);
                        e
                    });
                    let (dir_obj,_) = cyfs_base::Dir::raw_decode(buf.as_slice()).unwrap();
                    log::info!("get dir obj from local cache {}",entry.display());
                    Ok(Some(dir_obj))
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "dir_id format err",
                )),
            },
            _ => Ok(None),
        }?;


        Ok(Self {
            seq: value.seq(),
            peer_id,
            second_peer_id,
            path,
            dir_object_path,
            dir,
            dir_map
        })
    }

}

pub struct StartDownloadDirCommandResp {
    pub seq: u32,
    pub result: BuckyResult<(String,cyfs_base::Dir)>,
}

impl TryFrom<StartDownloadDirCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: StartDownloadDirCommandResp) -> BuckyResult<Self> {
        let seq = value.seq;
        match value.result {
            Ok((session,dir)) => {
                let json = serde_json::json!({
                    "name": "start-download-dir-resp",
                    "result": BuckyErrorCode::Ok.as_u16(),
                    "session" : session.to_string(),
                });
                let buf_len = dir.raw_measure(&None)?;
                let mut buf = vec![0u8; buf_len];
                let _ = dir.raw_encode(buf.as_mut_slice(), &None)?;
                Ok(LpcCommand::new(seq, buf, json))
            }
            Err(err) => {
                let json = serde_json::json!({
                    "name": "start-download-dir-resp",
                    "result": err.code().as_u16(),
                });
                Ok(LpcCommand::new(seq, vec![], json))
            }
        }
    }
}



pub struct DownloadDirStateCommandReq {
    pub seq: u32,
    pub session: String,
}

impl TryFrom<LpcCommand> for DownloadDirStateCommandReq {
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

pub struct DownloadDirStateCommandResp {
    pub seq: u32,
    pub state: BuckyResult<DownloadTaskState>,
}

impl TryFrom<DownloadDirStateCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: DownloadDirStateCommandResp) -> BuckyResult<Self> {
        let json = match value.state {
            Ok(state) => serde_json::json!({
                "name": "download-dir-state-resp",
                "result": BuckyErrorCode::Ok.as_u16(),
                "state": match state {
                    DownloadTaskState::Downloading(speed,progress) => format!("Downloading({},{})", speed,progress),
                    //DownloadTaskState::Finished(speed) => format!("Finished({})", speed),
                    DownloadTaskState::Finished => format!("Finished"),
                    DownloadTaskState::Paused => String::from("Paused"),
                    DownloadTaskState::Error(errorCode)=>format!("Err({})", errorCode),
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




pub struct SendObjectLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
    pub obj_path:PathBuf ,
    pub obj_type : u64 ,
}
impl TryFrom<LpcCommand> for SendObjectLpcCommandReq {
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
        let obj_type = match json.get("obj_type") {
            Some(v) => match v {
                serde_json::Value::Number(s) => s.as_u64().unwrap(),
                _ => 0,
            },
            _ => 0,
        };

        let obj_path = match json.get("obj_path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "obj_path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "obj_path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "obj_path lost")),
        }?;

        Ok(Self {
            seq: value.seq(),
            stream_name,
            obj_path,
            obj_type
        })
    }
}

pub struct SendObjectLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub time: u32,
    pub hash: HashValue,
}
impl TryFrom<SendObjectLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SendObjectLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "send_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "time": value.time,
            "hash": hex::encode(value.hash.as_slice())
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct RecvObjectLpcCommandReq {
    pub seq: u32,
    pub stream_name: String,
    pub obj_path:PathBuf,
    pub file_name : Option<String>,
}
impl TryFrom<LpcCommand> for RecvObjectLpcCommandReq {
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
        let file_name = match json.get("file_name") {
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
        let obj_path = match json.get("obj_path") {
            Some(v) => match v {
                serde_json::Value::String(s) => PathBuf::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "obj_path format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "obj_path format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "obj_path lost")),
        }?;
        Ok(Self {
            seq: value.seq(),
            stream_name,
            obj_path,
            file_name
        })
    }
}

pub struct RecvObjectLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub file_size: u64,
    pub hash: HashValue,
    pub object_id : String,
}
impl TryFrom<RecvObjectLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: RecvObjectLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "recv_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "stream_name": value.stream_name.as_str(),
            "hash": hex::encode(value.hash.as_slice()),
            "file_size": value.file_size,
            "object_id" : value.object_id,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct SendDatagramLpcCommandReq {
    pub seq: u32,
    pub remote_id: cyfs_base::DeviceId,
    pub content: Vec<u8>, //发送具体数据内容
    pub sequence : Option<u64>, //sequence 如果为空，BDT会使用当前系统时间,local time now + sequence
    pub create_time : Option<u64>, // local time now +  create_time
    pub send_time : Option<u64>, // local time now +  send_time
    pub author_id : Option<cyfs_base::DeviceId>,
    pub plaintext : bool, // 是否加密 1加密 0不加密
    pub reservedVPort : u64, // Channel = 1, Dht = 2, Debug = 3 。默认Debug

}
impl TryFrom<LpcCommand> for SendDatagramLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
        let buffer = value.as_buffer();
        let remote_id = match json.get("remote_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => DeviceId::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "remote_id format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "remote_id format err",
                )),
            },
            _ => Err(BuckyError::new(
                BuckyErrorCode::NotFound,
                "remote_id lost",
            )),
        }?;
        let ts = cyfs_base::bucky_time_now();
        let sequence = match json.get("sequence") {
            Some(v) => match v {
                serde_json::Value::Number(s) => Some(ts  + s.as_u64().unwrap()),
                _ => None,
            },
            _ => None,
        };
        let create_time = match json.get("create_time") {
            Some(v) => match v {
                serde_json::Value::Number(s) => Some(ts + s.as_u64().unwrap()),
                _ => None,
            },
            _ => None,
        };
        let send_time = match json.get("send_time") {
            Some(v) => match v {
                serde_json::Value::Number(s) => Some(ts + s.as_u64().unwrap()),
                _ => None,
            },
            _ => None,
        };
        let author_id = match json.get("author_id") {
            Some(v) => match v {
                serde_json::Value::String(s) => {
                    let ret = DeviceId::from_str(s.as_str());
                    if ret.is_err() {
                        Err(BuckyError::new(
                            BuckyErrorCode::InvalidData,
                            "author_id format err",
                        ))
                    } else {
                        Ok(Some(ret.unwrap()))
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "author_id format err",
                )),
            },
            _ => Ok(None),
        }?;
        let plaintext = match json.get("plaintext") {
            Some(v) => match v {
                serde_json::Value::Number(n) => n.as_u64().unwrap() == 1,
                _ => false,
            },
            _ => false,
        };
        let reservedVPort = match json.get("reservedVPort") {
            Some(v) => match v {
                serde_json::Value::Number(s) => s.as_u64().unwrap(),
                _ => 3,
            },
            _ => 3,
        };
        Ok(Self {
            seq: value.seq(),
            remote_id,
            content: Vec::from(buffer),
            sequence,
            create_time,
            send_time,
            author_id,
            plaintext,
            reservedVPort
        })
    }
}

pub struct SendDatagramLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub hash: HashValue, //计算内容的hash
    pub time : u32,
    pub create_time : Option<u64>, // local time now +  create_time
    pub send_time : Option<u64>, // local time now +  send_time
}

impl TryFrom<SendDatagramLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SendDatagramLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "send_datagram_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "time": value.time,
            "create_time" : value.create_time,
            "send_time" : value.send_time,
            "hash": hex::encode(value.hash.as_slice())
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub struct RecvDatagramMonitorLpcCommandReq {
    pub seq: u32,
    pub timeout : u64,// 监听接收数据，没收到退出
}

impl TryFrom<LpcCommand> for RecvDatagramMonitorLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let json = value.as_json_value();
       
        let timeout = match json.get("timeout") {
            Some(v) => match v {
                serde_json::Value::Number(s) => s.as_u64().unwrap(),
                _ => 30*1000,
            },
            _ => 30*1000,
        };
        Ok(Self {
            seq: value.seq(),
            timeout
        })
    }
}

pub struct RecvDatagramMonitorLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,

}


impl TryFrom<RecvDatagramMonitorLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: RecvDatagramMonitorLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "recv_datagram_monitor_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
        });
        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}

pub struct RecvDatagramLpcCommandResp {
    pub seq: u32,
    pub result: u16,
    pub msg: String,
    pub content: Vec<u8>, //接收具体数据内容
    pub remote_id:  Option<cyfs_base::DeviceId>,//对端device Id
    pub sequence : u64, //连接的id
    pub hash: HashValue, //计算内容的hash
}


impl TryFrom<RecvDatagramLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: RecvDatagramLpcCommandResp) -> Result<Self, Self::Error> {
        let device_id = match value.remote_id {
            Some(v)=> v.to_string(),
            None => "".to_string(),
        };
        let json = serde_json::json!({
            "name": "recv_datagram_resp",
            "result": value.result,
            "msg": value.msg.as_str(),
            "hash": hex::encode(value.hash.as_slice()),
            "sequence" : value.sequence,
            "remote_id" : device_id,
        });
        Ok(LpcCommand::new(value.seq, value.content, json))
    }
}
