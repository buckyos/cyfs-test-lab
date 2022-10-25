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
    download::DirTaskPathControl,
    local_chunk_store::LocalChunkWriter,
    local_chunk_store::LocalChunkListWriter,
    local_chunk_store::LocalChunkReader,
    mem_tracker::MemTracker,
    mem_chunk_store::MemChunkStore,
    ChunkWriter,
    ChunkWriterExt,
    ChunkListDesc
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

mod bdt_base;
use bdt_base::{
    run_test_async,
    create_device,
    load_pn,
    load_sn,
    load_device,
};

#[cfg(test)]

mod tests {
    use super::*;
    #[tokio::test]
    #[ignore]
    async fn test_create_device() {
        run_test_async( async {
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
            let mut eps2 = Vec::new();
            eps2.push("L4tcp192.168.100.74:30002".to_string());
            eps2.push("L4udp192.168.100.74:30003".to_string());
            let save_path =  PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
            let (device2,key2) = create_device(eps2,sn_list,pn_list,None).await;
        }).await    
    }

    #[tokio::test]
    async fn test_stack_open_001() {
        run_test_async( async {
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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
        run_test_async( async {
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
            let (device,key) = create_device(eps1,sn_list.clone(),pn_list.clone(),None).await;
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