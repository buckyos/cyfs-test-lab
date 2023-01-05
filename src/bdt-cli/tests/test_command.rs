use async_std::{fs::File, future, io::prelude::*, sync::Arc, task};
use cyfs_base::*;
use cyfs_bdt::*;
use cyfs_util::*;
use bdt_utils::*;
use std::str::FromStr;
use std::{
    path::{PathBuf},
    sync::Mutex,
};
use async_std::net::TcpListener;
use async_std::prelude::*;
use std::net::Shutdown;
use bdt_cli::*;
use async_std::net::Ipv4Addr;
use async_std::net::TcpStream;

#[test]
fn test_lpc_command() {
    let action1: LpcActionApi = LpcActionApi::Started(StartedLpcActionApi { peer_name: "lizhihong".to_string() });
    let action2 : LpcActionApi = LpcActionApi::Exit(ExitLpcActionApi { });
    let action3 : LpcActionApi = LpcActionApi::PingReq(PingReqLpcActionApi {  });
    let mut sn = Vec::new();
    let mut active_pn = Vec::new();
    let mut passive_pn = Vec::new();
    let mut addrs = Vec::new();
    let action4 : LpcActionApi = LpcActionApi::CreateStack(CreateStackReqLpcActionApi { peer_name: "lizhihong".to_string(), sn, active_pn, passive_pn, addrs, bdt_port: Some(50000), local: Some("lizhihong".to_string()), device_tag: Some("lizhihong".to_string()), chunk_cache: "file".to_string(), ep_type: Some("WAN".to_string()), ndn_event: None, ndn_event_target: None, sn_only: false, area: "226:1:1:1".to_string() });
    let command_str5 = r#"{"CreateStack":{"peer_name":"lizhihong","sn":[],"active_pn":[],"passive_pn":[],"addrs":[],"device_tag":"lizhihong","chunk_cache":"file","ep_type":"WAN","ndn_event":null,"ndn_event_target":null,"sn_only":false,"area":"226:1:1:1"}}"#;
    let action5: LpcActionApi = serde_json::from_str(command_str5).unwrap();
    let mut command_list : Vec<LpcCommand> = Vec::new();
    let c1 = LpcCommand {
        seq: 0,
        buffer: vec![1, 2, 3],
        action:action1,
    };
    let c2 = LpcCommand {
        seq: 1,
        buffer: vec![1, 2, 3],
        action:action2,
    };
    let c3 = LpcCommand {
        seq: 2,
        buffer: vec![1, 2, 3],
        action:action3,
    };
    let c4 = LpcCommand {
        seq: 3,
        buffer: vec![1, 2, 3],
        action:action4,
    };
    let c5 = LpcCommand {
        seq: 4,
        buffer: vec![1, 2, 3],
        action:action5,
    };
    command_list.push(c1.clone());
    command_list.push(c2.clone());
    command_list.push(c3.clone());
    command_list.push(c4.clone());
    command_list.push(c1);
    command_list.push(c2);
    command_list.push(c3);
    command_list.push(c4);
    command_list.push(c5);
    
    for  c in command_list{
        //println!("c={:?}", &c);
        let s = serde_json::to_vec(&c.action).unwrap();
        let str = serde_json::to_string(&c.action).unwrap();
        let v1: serde_json::Value = serde_json::from_slice(s.as_slice()).unwrap();
        //println!("v={:?}", &v1);
        println!("req command str={}", v1);
        let bufer = c.encode().unwrap();
        let c1 = LpcCommand::decode(bufer.as_ref()).unwrap();
        //println!("c={:?}", &c1);
        match c1.as_action().clone() {
            LpcActionApi::PingReq(req) =>{
                println!("req PingReq = {:?}",req);
            },
            LpcActionApi::Started(req) =>{
                println!("req Started = {:?}",req);
            },
            LpcActionApi::Exit(req) =>{
                println!("req Close = {:?}",req);
            },
            LpcActionApi::CreateStack(req) =>{
                println!("req CreateStack = {:?}",req);
            },
            _ =>{
                println!("req unkonwn");
            }
        }
    }
    
    
}


#[tokio::test]
async fn test_lpc_run() {
    let addr =  SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 22222 as u16);
    let stream = TcpStream::connect(addr.clone()).await.map_err(|e| {
        log::error!("connect failed, e={}", &e);
        e
    }).unwrap();
    let peer_name = random_str(10).await;
    let mut lpc = Lpc::start(
        stream,
        peer_name,
    )
    .await
    .map_err(|e| {
        log::error!("start lpc failed, e={}", &e);
        e
    }).unwrap();
    // keep alive
    lpc.begin_heartbeat();
    
    let action1: LpcActionApi = LpcActionApi::Started(StartedLpcActionApi {  peer_name: "lizhihong".to_string() });
    let action2 : LpcActionApi = LpcActionApi::Exit(ExitLpcActionApi { });
    let action3 : LpcActionApi = LpcActionApi::PingReq(PingReqLpcActionApi {});
    let mut sn = Vec::new();
    let mut active_pn = Vec::new();
    let mut passive_pn = Vec::new();
    let mut addrs = Vec::new();
    let action4 : LpcActionApi = LpcActionApi::CreateStack(CreateStackReqLpcActionApi { name: "create".to_string(), peer_name: "lizhihong".to_string(), sn, active_pn, passive_pn, addrs, bdt_port: Some(50000), local: Some("lizhihong".to_string()), device_tag: Some("lizhihong".to_string()), chunk_cache: "file".to_string(), ep_type: Some("WAN".to_string()), ndn_event: None, ndn_event_target: None, sn_only: false, area: "226:1:1:1".to_string() });
    let command_str5 = r#"{"CreateStack":{"peer_name":"lizhihong","sn":[],"active_pn":[],"passive_pn":[],"addrs":[],"device_tag":"lizhihong","chunk_cache":"file","ep_type":"WAN","ndn_event":null,"ndn_event_target":null,"sn_only":false,"area":"226:1:1:1"}}"#;
    let action5: LpcActionApi = serde_json::from_str(command_str5).unwrap();
    let mut command_list : Vec<LpcCommand> = Vec::new();
    let c1 = LpcCommand {
        seq: 0,
        buffer: vec![1, 2, 3],
        action:action1,
    };
    let c2 = LpcCommand {
        seq: 1,
        buffer: vec![1, 2, 3],
        action:action2,
    };
    let c3 = LpcCommand {
        seq: 2,
        buffer: vec![1, 2, 3],
        action:action3,
    };
    let c4 = LpcCommand {
        seq: 3,
        buffer: vec![1, 2, 3],
        action:action4,
    };
    let c5 = LpcCommand {
        seq: 4,
        buffer: vec![1, 2, 3],
        action:action5,
    };
    lpc.send_command(c1).await;
    lpc.send_command(c5).await;
    
}
