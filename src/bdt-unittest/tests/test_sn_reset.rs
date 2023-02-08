use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::{
    NamedDataCache, 
    TrackerCache
};
use cyfs_bdt::*;

use std::{
    str::FromStr, 
    path::{Path, PathBuf}, 
    io::{Read, Write}, 
    sync::{Mutex}, 
    time::{Duration, Instant},
    collections::{HashMap,hash_map,BTreeSet},
    convert::TryFrom,
    borrow::Cow,
    
};
use async_std::{
    sync::Arc, 
    task, 
    fs::File, 
    io::prelude::*,
    future, 
};
use actix_rt;
use std::*;

use bdt_unittest::*;
use bdt_utils::*;

#[cfg(test)]

mod tests {
    use std::fmt::format;

    use sha2::Sha512Trunc224;

    use super::*;

    #[tokio::test]
    async fn test_sn_mut_v3_reset_sn_list_001() {
        /**
        ```test_sn_mut_v2_reset_sn_list_001
        操作步骤
        (1)设置Device1 Area[44,0,0,1] Device2 Area[226,0,0,1]
        (2)Device1、Device2初始化SN List 设置SN1,协议栈在SN1上线
        (3)Device1、Device2 调用reset_sn_list [SN1,SN2,SN3],协议栈重新上线
        (4)Device1->Device2发起连接
        ```
         */
        run_test_async("test_sn_mut_v2_reset_sn_list_001", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let mut sns1 = Vec::new();
            let mut sns2 = Vec::new();
            let sn1 = load_file_by_path("lab\\sn-miner-zero.desc");
            let sn2 = load_file_by_path("lab\\sn-miner-cn.desc");
            let sn3 = load_file_by_path("lab\\sn-miner-un.desc");
            sns1.push(sn1.clone());
            sns2.push(sn2.clone());
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            let mut pns = Vec::new();
            let pn =load_file_by_path("lab\\pn-miner.desc");
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager =  BDTClientManager::new(PathBuf::from_str(LOG_PATH).unwrap(),PathBuf::from_str(LOG_PATH).unwrap(), 25000 as u16);
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74");
            eps1.push(ep);
            let req1 = CreateStackReq {
                peer_name: "device1".to_string(),
                sn: pathBuf_list_to_string(&sns1),
                active_pn: Vec::new(),
                passive_pn: Vec::new(),
                addrs: eps1.clone(),
                bdt_port: Some(30000),
                local: None,
                device_tag: None,
                chunk_cache: "file".to_string(),
                ep_type: None,
                ndn_event: None,
                ndn_event_target: None,
                sn_only: false,
                area: "44:0:0:1".to_string(),
            };
            let create1 = stack_manager.create_client(&req1).await;
            let (resp1,device1) = create1.unwrap();
            let mut device1 = device1.unwrap();
            let req2 = CreateStackReq {
                peer_name: "device2".to_string(),
                sn: pathBuf_list_to_string(&sns2),
                active_pn: Vec::new(),
                passive_pn: Vec::new(),
                addrs: eps1.clone(),
                bdt_port: Some(40000),
                local: None,
                device_tag: None,
                chunk_cache: "file".to_string(),
                ep_type: None,
                ndn_event: None,
                ndn_event_target: None,
                sn_only: false,
                area: "226:0:0:1".to_string(),
            };
            let create2 = stack_manager.create_client(&req2).await;
            let (resp2,device2) = create2.unwrap();
            let mut device2 = device2.unwrap();
            // (2) 启动监听
            let mut client1 = stack_manager.get_client("device1".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm_req1 = AutoAcceptReq{
                peer_name : "device1".to_string(),
                answer_size : 0
            };
            let confirm1= client1.auto_accept(0,&confirm_req1).await;
            let mut client2 = stack_manager.get_client("device2".clone());
            log::info!("client2 info : {}",client2.get_stack().local_device_id());
            let confirm_req2 = AutoAcceptReq{
                peer_name : "device2".to_string(),
                answer_size : 0
            };
            let confirm2 =client2.auto_accept(0,&confirm_req2).await;
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            let  sn_list = load_sn(&sns).await;
            let mut endpoints = Vec::new();
            endpoints.push(format!("L4udp192.168.100.74:50000"));
            let mut eps = Vec::new();
            for addr in endpoints.iter() {
                let ep = {
                    let s = format!("{}", addr);
                    Endpoint::from_str(s.as_str())
                        .map_err(|e| {
                            log::error!("parse ep failed, s={}, e={}", s, &e);
                            e
                        })
                        .unwrap()
                };
                log::info!("create device add ep: {}", &ep);
                eps.push(ep);
            }
            client1.get_stack().reset_endpoints(&eps);

            let ping1 = client1.get_stack().reset_sn_list(sn_list.clone()).wait_online().await;
            let ping2 = client2.get_stack().reset_sn_list(sn_list.clone()).wait_online().await;
            let _ = sleep(30).await;
            // (3.1) client1 连接 client2 首次连接
            {   
                // 构建 BuildTunnelParams
                let mut wan_addr = false;
                let mut remote_sn = device_list_to_deviceid(client2.get_stack().sn_client().ping().sn_list());
        
                let sn_id = remote_sn[0].clone();
                for sn in remote_sn.clone(){
                    log::info!("BuildTunnelParams remote_sn sn : {}",sn.object_id().to_string());
                }
                for sn in client1.get_stack().sn_client().ping().sn_list(){
                    log::info!("client1 sn : {}",sn.desc().object_id().to_string());
                }
                for sn in client2.get_stack().sn_client().ping().sn_list(){
                    log::info!("client2 sn : {}",sn.desc().object_id().to_string());
                }
                let param = BuildTunnelParams {
                    remote_const: device2.desc().clone(),
                    remote_sn:Some(remote_sn),
                    remote_desc: None
                };
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                // 发起连接
                let _ = match client1.get_stack().stream_manager().connect(0, Vec::new(),param.clone()).await{
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        stream_id =  stream.sequence().value();
                        log::info!("connect success time = {},sequence = {}",connect_time,stream_id.to_string());
                        LN_Stream = format!("{}",stream);
                        client1.add_stream(stream);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        panic!("bdt connect failed");
                        
                    }
                };
            }
            
            {   
                
                let mut con1 = client1.get_stream(LN_Stream.as_str());
                let mut con2 = client2.find_stream(stream_id.to_string().as_str()).unwrap();
                log::info!("connect1: {}",con1.get_stream());
                log::info!("connect2: {}",con2.get_stream());
                //RN 一个线程收数据
                let task1 = task::spawn(async move {
                    let recv = con2.recv_stream().await;
                });
                //stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con1.send_stream(10*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
        }).await
    }
    
}
