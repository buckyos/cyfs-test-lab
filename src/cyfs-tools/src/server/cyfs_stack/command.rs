use crate::lib::{Lpc,LpcCommand};
use byteorder::{LittleEndian, ReadBytesExt};
use cyfs_base::{
    {RawDecode, RawEncode},
    *,
};
use cyfs_bdt::*;
use std::convert::TryFrom;
use std::path::PathBuf;
use std::str::FromStr;
use std::io::{Read, Write};
use cyfs_bdt::{ TaskControlState };



pub struct SendCommandLpcCommandReq {
    pub seq: u32,
    pub name : String,
    pub system : String,
    pub input_buff : Vec<u8>,
    //LpcCommand的json里面
    pub input_str: String,
    //LpcCommand的json里面
    pub input_num: u32,
}

impl TryFrom<LpcCommand> for SendCommandLpcCommandReq {
    type Error = BuckyError;
    fn try_from(value: LpcCommand) -> Result<Self, Self::Error> {
        let buffer = value.as_buffer();
        let json = value.as_json_value();
        let input_str = match json.get("input_str") {
            Some(v) => match v {
                serde_json::Value::String(s) => String::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "input_str format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "input_str format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "input_str lost")),
        }?;
        let name = match json.get("name") {
            Some(v) => match v {
                serde_json::Value::String(s) => String::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "input_str format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "input_str format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "input_str lost")),
        }?;
        let system = match json.get("system") {
            Some(v) => match v {
                serde_json::Value::String(s) => String::from_str(s.as_str()).map_err(|_err| {
                    BuckyError::new(BuckyErrorCode::InvalidData, "input_str format err")
                }),
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "input_str format err",
                )),
            },
            _ => Err(BuckyError::new(BuckyErrorCode::NotFound, "input_str lost")),
        }?;
        let input_num = match json.get("input_num") {
            Some(v) => match v {
                serde_json::Value::Number(n) => {
                    match n.as_i64() {
                        Some(i) => {
                            Ok(i)
                        },
                        None => {
                            Err(BuckyError::new(
                                BuckyErrorCode::InvalidData,
                                "input_num format err",
                            ))
                        }
                    }
                },
                _ => Err(BuckyError::new(
                    BuckyErrorCode::InvalidData,
                    "input_num format err",
                )),
            },
            _ => Ok(10),
        }?;
        Ok(Self{
            seq: value.seq(),
            input_buff:buffer.to_vec(),
            name,
            system,
            input_str:input_str,
            input_num: input_num as u32,
        })
        
    }
}

pub struct SendCommandLpcCommandResp {
    pub seq: u32,
    pub peer_name : String,
    pub name : String,
    pub system : String,
    pub result: u16,
    pub time: u32,
    pub output_buff : Vec<u8>,
    //LpcCommand的json里面
    pub output_str: String,
    //LpcCommand的json里面
    pub output_num: u32,
}

impl TryFrom<SendCommandLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: SendCommandLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "sendCommand_resp",
            "system" : "cyfs-stack",
            "result": value.result,
            "output_str": value.output_str.as_str(),
            "output_num": value.output_num,
            "time": value.time,
            "peer_name" : value.peer_name.as_str(),
        });
        let buff = value.output_buff;
        Ok(LpcCommand::new(value.seq, buff, json))
    }
}

pub struct EventCommandLpcCommandResp {
    pub seq: u32,
    pub peer_name : String,
    pub name : String,
    pub system : String,
    pub result: u16,
    pub time: u32,
    pub output_buff : Vec<u8>,
    //LpcCommand的json里面
    pub output_str: String,
    //LpcCommand的json里面
    pub output_num: u32,
}

impl TryFrom<EventCommandLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: EventCommandLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "startEvent_resp",
            "system" : "cyfs-stack",
            "result": value.result,
            "output_str": value.output_str.as_str(),
            "output_num": value.output_num,
            "time": value.time,
            "peer_name" : value.peer_name.as_str(),
        });
        let buff = value.output_buff;
        Ok(LpcCommand::new(value.seq, buff, json))
    }
}






