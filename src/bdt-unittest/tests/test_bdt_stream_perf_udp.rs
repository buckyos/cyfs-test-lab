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
use bdt_unittest::bdt_client::*;
use bdt_unittest::config::*;
async fn create_stack_udp(port:usize)->(StackGuard,StreamListenerGuard){
    let mut sns = Vec::new();
    let sn = PathBuf::from_str(SN_Lab.clone()).unwrap();
    sns.push(sn);
    let sn_list = load_sn(sns).await;
    let mut pns = Vec::new();
    let pn = PathBuf::from_str(PN_Lab.clone()).unwrap();
    pns.push(pn);
    let pn_list = load_pn(pns).await;
    let mut eps1 = Vec::new();
    let ep = format!("L4udp192.168.100.74:{}",port);
    eps1.push(ep);
    let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
    let (device,key) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),None).await;
    let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
    // 已知Device 列表
    params.known_device = None; //
    params.known_sn = Some(sn_list.clone());
    params.active_pn = Some(pn_list.clone());
    params.passive_pn = Some(pn_list.clone());
    params.config.interface.udp.sn_only = false;
    params.tcp_port_mapping = None;
    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
    let stack = Stack::open(
        device.clone(), 
        key, 
        params).await;
    if let Err(e) = stack.clone(){
        log::error!("init bdt stack error: {}", e);
    }
    let  stack = stack.unwrap();   
    let  acceptor = stack.stream_manager().listen(0).unwrap();
    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
        Err(err) => {
            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
            1000
        },
        Ok(_) => {
            log::info!("sn online success {}", device.desc().device_id());
            0
        }
    };
    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
    (stack,acceptor)
}


#[cfg(test)]
mod tests {
    use super::*;
    

    #[actix_rt::test]
    async fn test_bdt_perf_stream_udp_001() {
        #[cfg(debug_assertions)]
        let log_default_level = "debug";
    
        #[cfg(not(debug_assertions))]
        let log_default_level = "debug";
    
        let log_dir : String = "E:\\git_test\\cyfs-test-lab\\deploy\\log".to_string();
        #[cfg(debug_assertions)]
        //let log_default_level = "info";
        cyfs_debug::CyfsLoggerBuilder::new_app("bdt-unittest")
            .level("info")
            .console("warn")
            .directory(log_dir.clone())
            .build()
            .unwrap()
            .start();
        //panic异常捕获
        cyfs_debug::PanicBuilder::new("bdt-unittest", "bdt-unittest")
            .exit_on_panic(true)
            .build()
            .start();
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP SN_Call 内网打洞流程 
         */
        run_test_async("test_stream_udp_connect_001", async{
            // 前置条件:
            // (1) 创建BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let (device1,key1) = stack_manager.load_test_stack("device3_L4udp",Some(SN_list()),None).await;
            let (device2,key2) = stack_manager.load_test_stack("device4_L4udp",Some(SN_list()),None).await;
            // (2) BDT协议栈启动监听
            let client1 = stack_manager.get_client("device3_L4udp".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device4_L4udp".clone());
            let confirm2 =client2.auto_accept();
            // (3.1) client1 连接 client2 首次连接
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            {   
                // 构建 BuildTunnelParams
                let mut wan_addr = false;
                let remote_sn = match device2.body().as_ref() {
                    None => {
                        Vec::new()
                    },
                    Some(b) => {
                        b.content().sn_list().clone()
                    },
                };
                let param = BuildTunnelParams {
                    remote_const: device2.desc().clone(),
                    remote_sn,
                    remote_desc: if wan_addr {
                        Some(device2.clone())
                    } else {
                        None
                    }
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
                        LN_Stream = format!("{}{}",device2.desc().object_id().to_string(),stream_id.to_string());
                        client1.cache_stream(LN_Stream.as_str(), stream.clone());
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (3.2) client1 -> client2 发送数据
            {   
                
                let mut con1 = client1.get_stream(LN_Stream.as_str());
                let RN_Stream = format!("{}{}",device1.desc().object_id().to_string(),stream_id.clone());
                let mut con2 = client2.get_stream(RN_Stream.as_str());
                log::info!("connect1: {}",con1.get_stream());
                log::info!("connect2: {}",con2.get_stream());
                //RN 一个线程收数据
                let task1 = task::spawn(async move {
                    let recv = con2.recv_data().await;
                });
                stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con1.send_data(100*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
            // (3.3) client2 -> client1 发送数据
            {   
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all().await;
            stack_manager.sleep(10).await;
        }).await;
        
    }
}