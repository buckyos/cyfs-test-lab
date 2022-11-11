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
    use super::*;
    #[tokio::test]
    async fn test_create_device() {
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            
            let mut eps1 = Vec::new();
            eps1.push("L4tcp192.168.100.74:30000".to_string());
            eps1.push("L4udp192.168.100.74:30001".to_string());
            let (device1,key1) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
            let mut eps2 = Vec::new();
            eps2.push("L4tcp192.168.100.74:30002".to_string());
            eps2.push("L4udp192.168.100.74:30003".to_string());
            let (device2,key2) = create_device("device2".to_string(),eps2,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;

            let mut eps3 = Vec::new();
            eps3.push("L4udp192.168.100.74:30004".to_string());
            let (device3,key3) = create_device("device3_L4udp".to_string(),eps3,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
            let mut eps4 = Vec::new();
            eps4.push("L4udp192.168.100.74:30005".to_string());
            let (device4,key4) = create_device("device4_L4udp".to_string(),eps4,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
            

            let mut eps5 = Vec::new();
            eps5.push("W4tcp192.168.100.74:30006".to_string());
            let (device5,key5) = create_device("device5_W4tcp".to_string(),eps5,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
            let mut eps6 = Vec::new();
            eps6.push("W4tcp192.168.100.74:30007".to_string());
            let (device6,key6) = create_device("device6_W4tcp".to_string(),eps6,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;

            let mut eps7 = Vec::new();
            eps7.push("W4udp192.168.100.74:30008".to_string());
            let (device7,key7) = create_device("device7_W4udp".to_string(),eps7,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
            let mut eps8 = Vec::new();
            eps8.push("W4udp192.168.100.74:30009".to_string());
            let (device6,key6) = create_device("device8_W4udp".to_string(),eps8,sn_list.clone(),pn_list.clone(),Some(save_path.clone())).await;
        }).await    
    }

    #[tokio::test]
    async fn test_create_device_area() {
        run_test_async("", async{
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let mut run_sum = 10;
            while run_sum>0 {
                let mut eps1 = Vec::new();
                let ep = format!("L4udp192.168.100.200:{}",30000+run_sum.clone());
                eps1.push(ep);
                run_sum = run_sum - 1;
                let str_area = format!("{}:{}:{}:{}",run_sum.clone(),run_sum.clone(),run_sum.clone(),run_sum.clone()); 
                let area = Area::from_str(str_area.as_str()).unwrap();
                let name = format!("xhj{}",run_sum.clone());
                let private_key = PrivateKey::generate_rsa(1024).unwrap();
                let (device1,key1) = create_device_area(name,eps1,sn_list.clone(),pn_list.clone(),Some(save_path.clone()),area,private_key).await;
            }
            
            
        }).await    
    }

    #[tokio::test]
    async fn test_stack_open_001() {
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
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }

    #[tokio::test]
    async fn test_stack_open_002() {
        //  BDT 协议栈初始化 正常流程
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
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
        }).await
        
    }


    #[tokio::test]
    async fn test_stack_open_003() {
        //  BDT 协议栈初始化 Device 参数校验,EP 为空 
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
            // eps1.push("L6udp[::]:30003".to_string());
            // eps1.push("L4udp192.168.100.74:30003".to_string());
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
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }

    #[tokio::test]
    async fn test_stack_open_004() {
        //  BDT 协议栈初始化 Device 参数校验, 只有TCP ,没有UDP SN 无法上线
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
            // eps1.push("L6udp[::]:30003".to_string());
            eps1.push("L4tcp192.168.100.74:30003".to_string());
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
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }

    #[tokio::test]
    async fn test_stack_open_005() {
        //  BDT 协议栈初始化 Device 参数校验, 设置TCP+UDP ,然后使用udp.sn_only  IPv6 udp + IPv4 tcp
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
            eps1.push("L4tcp192.168.100.74:30003".to_string());
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
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }
    #[tokio::test]
    async fn test_stack_open_006() {
        //  BDT 协议栈初始化 Device 参数校验, 设置TCP+UDP ,然后使用udp.sn_only  IPv4 udp + IPv6 tcp
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
            eps1.push("L6tcp[::]:30003".to_string());
            eps1.push("L4udp192.168.100.74:30003".to_string());
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
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }
    #[tokio::test]
    async fn test_stack_open_007() {
        //  BDT 协议栈初始化 Device 参数校验, 设置TCP+UDP ,然后使用udp.sn_only  IPv6 udp + IPv6 tcp
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
            eps1.push("L6tcp[::]:30003".to_string());
            eps1.push("L6udp[::]:30003".to_string());
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
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }
    #[tokio::test]
    async fn test_stack_open_008() {
        //  BDT 协议栈初始化 , 设置SN 和 PN为空
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
            eps1.push("L6tcp[::]:30003".to_string());
            eps1.push("L6udp[::]:30003".to_string());
            let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device,key) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),None).await;
            let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
            // 已知Device 列表
            params.known_device = None; //
            params.known_sn = None;
            params.active_pn = None;
            params.passive_pn = None;
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
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                    0
                }
            };
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }
    #[tokio::test]
    async fn test_stack_open_009() {
        //  BDT 协议栈初始化 ,  测试tcp_port_mapping 
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
            eps1.push("L4udp192.168.100.74:30003".to_string());
            eps1.push("L4tcp192.168.100.74:30003".to_string());
            let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device,key) = create_device("device1".to_string(),eps1,sn_list.clone(),pn_list.clone(),None).await;
            let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
            // 已知Device 列表
            params.known_device = None; //
            params.known_sn = Some(sn_list.clone());
            params.active_pn = Some(pn_list.clone());
            params.passive_pn = Some(pn_list.clone());
            params.config.interface.udp.sn_only = true;
            let map =  Endpoint::from_str("L4tcp192.168.100.74:30004").unwrap();
            let mut map_list = Vec::new();
            map_list.push((map,30004));
            params.tcp_port_mapping = Some(map_list);
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
            log::info!("BDT stack EP list");
            for  ep in stack.net_manager().listener().endpoints() {
                log::info!("BDT stack EP: {}", ep);
            }
            
            
        }).await
        
    }
    
}
