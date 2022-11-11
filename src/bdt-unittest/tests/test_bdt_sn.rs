use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::{
    NamedDataCache, 
    TrackerCache
};
use cyfs_bdt::{
    Stack, 
    StackGuard, 
    StreamListenerGuard, 
    BuildTunnelParams, 
    TempSeqGenerator, 
    StreamGuard,
    DownloadTask, 
    DownloadTaskState, 
    StackOpenParams, 
    SingleDownloadContext, 
    local_chunk_store::LocalChunkWriter,
    local_chunk_store::LocalChunkListWriter,
    local_chunk_store::LocalChunkReader,
    mem_tracker::MemTracker,
    mem_chunk_store::MemChunkStore,
};

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

#[cfg(test)]

mod tests {
    use std::fmt::format;

    use super::*;
    #[tokio::test]
    async fn test_sn_online_001() {
        // 测试SN 上线简单流程
        run_test_async("", async{
            // 0. 使用BDT协议栈 需要使用cyfs-base 创建 Device 对象和PrivateKey,如何创建参照用例test_create_device
            // 1. 加载创建BDT 协议栈需要的本地Device信息，以及SN 、PN信息
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device,key) = load_device(device_path,"device1".to_string()).await;
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            // 2. 加载BDT Stack 启动配置
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
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
        }).await
        
    }
    #[tokio::test]
    
    async fn test_sn_online_002() {
        // 测试SN 绑定多个地址上线流程
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L4tcp192.168.100.74:30000".to_string());
            eps1.push("L4udp192.168.100.74:30001".to_string());
            eps1.push("L4tcp192.168.100.74:30002".to_string());
            eps1.push("L4udp192.168.100.74:30003".to_string());
            eps1.push("L4tcp192.168.100.74:30004".to_string());
            eps1.push("L4udp192.168.100.74:30005".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
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
        }).await
        
    }
    #[tokio::test]
    async fn test_sn_online_003() {
        // 测试SN 只绑定了虚拟网卡上线失败超时问题
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L4udp172.28.240.1:30003".to_string());
            eps1.push("L4udp10.8.0.6:30005".to_string());
            eps1.push("L4udp192.168.231.1:30007".to_string());
            //eps1.push("L4udp192.168.100.74:30001".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }


    #[tokio::test]
    async fn test_sn_online_004() {
        // 测试SN 绑定了多个网卡，只有一个网卡可以上线成功
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L4udp172.28.240.1:30003".to_string());
            eps1.push("L4udp10.8.0.6:30005".to_string());
            eps1.push("L4udp192.168.231.1:30007".to_string());
            eps1.push("L4udp192.168.100.74:30001".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }
    #[tokio::test]
    async fn test_sn_online_005() {
        // 测试SN 绑定了多个网卡，只有一个网卡可以上线成功
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            let mut port = 30000;
            while port< 30100  {
                port = port + 1;
                let ep = format!("L4udp192.168.100.74:{}",port);
                eps1.push(ep);
                
            }
            
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }

    #[tokio::test]
    async fn test_sn_online_006() {
        // 测试SN  IPv6 SN 上线绑定一个地址
        run_test_async("", async {
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L6udp[::]:30003".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }
    #[tokio::test]
    async fn test_sn_online_007() {
        // 测试SN  IPv6 SN 上线 多个地址
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L6udp[::]:30003".to_string());
            eps1.push("L6udp[::]:30004".to_string());
            eps1.push("L6udp[::]:30005".to_string());
            eps1.push("L6udp[::]:30006".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }
    #[tokio::test]
    async fn test_sn_online_008() {
        // 测试SN  IPV4/IPv6  相同端口上线
        // 模拟先断网，然后再上线
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            eps1.push("L6udp[::]:30003".to_string());
            eps1.push("L4udp192.168.100.74:30001".to_string());
            eps1.push("L4udp192.168.100.74:30002".to_string());
            eps1.push("L4udp192.168.100.74:30003".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
        }).await
        
    }

    #[tokio::test]
    async fn test_sn_online_009() {
        // 测试SN  IPV4/IPv6  相同端口上线
        // 模拟先断网，然后再上线
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut eps1 = Vec::new();
            //eps1.push("L6udp[::]:30003".to_string());
            eps1.push("L4udp192.168.100.74:30001".to_string());
           // eps1.push("L4udp192.168.100.74:30002".to_string());
            //eps1.push("L4udp192.168.100.74:30003".to_string());
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
            let stack = stack.unwrap();   
            let acceptor = stack.stream_manager().listen(0).unwrap();
            let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                Err(err) => {
                    log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                    1000
                },
                Ok(_) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            let mut sleep = 60;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
        }).await
    }
    #[tokio::test]
    async fn test_sn_online_0010() {
        // 测试SN  IPV4/IPv6  相同端口上线
        // 模拟先断网，然后再上线
        run_test_async("", async{
            let mut sum = 1000; 
            while sum>0 {
                sum = sum -1;
                async_std::task::spawn(async move {
                    let mut sns = Vec::new();
                    let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
                    sns.push(sn);
                    let  sn_list = load_sn(sns).await;
                    let mut pns = Vec::new();
                    let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
                    pns.push(pn);
                    let  pn_list = load_pn(pns).await;
                    let mut eps1 = Vec::new();
                    let port = 60000 - sum;
                    let ep = format!("L4udp192.168.100.74:{}",port);
                    eps1.push(ep.to_string());
                   // eps1.push("L4udp192.168.100.74:30002".to_string());
                    //eps1.push("L4udp192.168.100.74:30003".to_string());
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
                    let stack = stack.unwrap();   
                    let acceptor = stack.stream_manager().listen(0).unwrap();
                    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            0
                        }
                    };
                    let mut sleep = 60;
                    while sleep>0  {
                        sleep = sleep -1;
                        async_std::task::sleep(Duration::from_millis(1000)).await;
                    };
                });
                
            }
            
            let mut sleep = 60;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
             
        }).await
    }
    #[tokio::test]
    async fn Statistic_SNPing_IPv4_1000Devcie() {
        // 测试SN  IPV4/IPv6  相同端口上线
        /**
         * 操作步骤：
            （1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
            （2）持续维持ping 一段时间
            （3）监控SN的性能
         */
        run_test_async("Statistic_SNPing_IPv4_1000Devcie", async{
            let mut sum = 1000; 
            let mut success = 0 ;
            let mut total_online_time = 0 ;
            while sum>0 {
                sum = sum -1;
                async_std::task::spawn(async move {
                    let mut sns = Vec::new();
                    let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
                    sns.push(sn);
                    let  sn_list = load_sn(sns).await;
                    let mut pns = Vec::new();
                    let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
                    pns.push(pn);
                    let  pn_list = load_pn(pns).await;
                    let mut eps1 = Vec::new();
                    let port = 60000 - sum;
                    let ep = format!("L4udp192.168.100.74:{}",port);
                    eps1.push(ep.to_string());
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
                    let stack = stack.unwrap();   
                    let acceptor = stack.stream_manager().listen(0).unwrap();
                    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            success = success + 1;
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            total_online_time = total_online_time + online_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            log::info!("上线成功次数：{}，上线平均时间：{}",success,total_online_time);
                            0
                        }
                    };
                    
                    let mut sleep = 60;
                    while sleep>0  {
                        sleep = sleep -1;
                        async_std::task::sleep(Duration::from_millis(1000)).await;
                    };
                    
                });
                
            }
            
            let mut sleep = 300;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
             
        }).await
    }

    #[tokio::test]
    async fn Statistic_SNPing_IPv6_1000Devcie() {
        // 测试SN  IPV4/IPv6  相同端口上线
        /**
         * 操作步骤：
            （1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
            （2）持续维持ping 一段时间
            （3）监控SN的性能
         */
        run_test_async("Statistic_SNPing_IPv6_1000Devcie", async{
            let mut sum = 1000; 
            let mut success = 0 ;
            let mut total_online_time = 0 ;
            while sum>0 {
                sum = sum -1;
                async_std::task::spawn(async move {
                    let mut sns = Vec::new();
                    let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
                    sns.push(sn);
                    let  sn_list = load_sn(sns).await;
                    let mut pns = Vec::new();
                    let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
                    pns.push(pn);
                    let  pn_list = load_pn(pns).await;
                    let mut eps1 = Vec::new();
                    let port = 60000 - sum;
                    let ep = format!("L6udp[::]:{}",port);
                    eps1.push(ep.to_string());
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
                    let stack = stack.unwrap();   
                    let acceptor = stack.stream_manager().listen(0).unwrap();
                    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            success = success + 1;
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            total_online_time = total_online_time + online_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            log::info!("上线成功次数：{}，上线平均时间：{}",success,total_online_time);
                            0
                        }
                    };
                    
                    let mut sleep = 60;
                    while sleep>0  {
                        sleep = sleep -1;
                        async_std::task::sleep(Duration::from_millis(1000)).await;
                    };
                    
                });
                
            }
            
            let mut sleep = 60;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
             
        }).await
    }
    #[tokio::test]
    async fn Statistic_SNPing_IPv4_10000Devcie() {
        // 测试SN  IPV4/IPv6  相同端口上线
        /**
         * 操作步骤：
            （1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
            （2）持续维持ping 一段时间
            （3）监控SN的性能
         */
        run_test_async("Statistic_SNPing_IPv4_10000Devcie", async{
            let mut sum = 10000; 
            let mut success = 0 ;
            let mut total_online_time = 0 ;
            while sum>0 {
                sum = sum -1;
                async_std::task::spawn(async move {
                    let mut sns = Vec::new();
                    let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
                    sns.push(sn);
                    let  sn_list = load_sn(sns).await;
                    let mut pns = Vec::new();
                    let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
                    pns.push(pn);
                    let  pn_list = load_pn(pns).await;
                    let mut eps1 = Vec::new();
                    let port = 60000 - sum;
                    let ep = format!("L4udp192.168.100.74:{}",port);
                    eps1.push(ep.to_string());
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
                    let stack = stack.unwrap();   
                    let acceptor = stack.stream_manager().listen(0).unwrap();
                    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            success = success + 1;
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            total_online_time = total_online_time + online_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            log::info!("上线成功次数：{}，上线平均时间：{}",success,total_online_time);
                            0
                        }
                    };
                    
                    let mut sleep = 60;
                    while sleep>0  {
                        sleep = sleep -1;
                        async_std::task::sleep(Duration::from_millis(1000)).await;
                    };
                    
                });
                
            }
            
            let mut sleep = 300;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
             
        }).await
    }
    #[tokio::test]
    async fn Statistic_SNPing_Network() {
        // 测试SN  IPV4/IPv6  相同端口上线
        /**
         * 操作步骤：
            （1）构造1000个全新Device 初始化BDT协议栈同时在SN上线
            （2）持续维持ping 一段时间
            （3）监控SN的性能
         */
        run_test_async("Statistic_SNPing_Network", async{
            let mut sum = 1; 
            let mut success = 0 ;
            let mut total_online_time = 0 ;
            while sum>0 {
                sum = sum -1;
                async_std::task::spawn(async move {
                    let mut sns = Vec::new();
                    let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
                    sns.push(sn);
                    let  sn_list = load_sn(sns).await;
                    let mut pns = Vec::new();
                    let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
                    pns.push(pn);
                    let  pn_list = load_pn(pns).await;
                    let mut eps1 = Vec::new();
                    let port = 60000-sum;
                    let ep = format!("L4udp192.168.100.74:{}",port);
                    eps1.push(ep.to_string());
                    let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
                    let (device,key) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),None).await;
                    let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
                    // 已知Device 列表
                    params.known_device = None; //
                    params.known_sn = Some(sn_list.clone());
                    params.active_pn = Some(pn_list.clone());
                    params.passive_pn = Some(pn_list.clone());
                    params.config.interface.udp.sn_only = true;
                    params.tcp_port_mapping = None;
                    let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let stack = Stack::open(
                        device.clone(), 
                        key, 
                        params).await;
                    if let Err(e) = stack.clone(){
                        log::error!("init bdt stack error: {}", e);
                    }
                    let stack = stack.unwrap();   
                    let acceptor = stack.stream_manager().listen(0).unwrap();
                    let result = match future::timeout(Duration::from_secs(20), stack.net_manager().listener().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {},err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            success = success + 1;
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            total_online_time = total_online_time + online_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            0
                        }
                    };
                    
                    let mut sleep = 30;
                    while sleep>0  {
                        sleep = sleep -1;
                        async_std::task::sleep(Duration::from_millis(1000)).await;
                    };
                    
                });
                
            }
            
            let mut sleep = 30;
            while sleep>0  {
                sleep = sleep -1;
                async_std::task::sleep(Duration::from_millis(1000)).await;
            };
             
        }).await
    }

}
