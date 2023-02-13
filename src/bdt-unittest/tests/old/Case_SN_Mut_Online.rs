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
// 实验室SN 配置
//SN1 IP 192.168.200.238 ,sn area = 0:0:0:1
const SN1 : &str = "5aSixgMSzCTN6dUSVvxeogdy6rycjLZYZERvw1zdDTej"; 
//SN2 IP 192.168.200.181 ,sn area = 1:4:2:1
const SN2 : &str = "5aUwCcj6HK7Ue4NKuUaaKEzUViKAwbrWuxa6e5FBrJdE"; 
//SN2 IP 192.168.200.207 ,sn area = 86:8:5:2
const SN3 : &str = "5d5j5tmZUNnYGtWjX6SM9WrnhuNn9hcrpF7iMFwmPVfw"; 
#[cfg(test)]

mod tests {
    use std::fmt::format;

    use sha2::Sha512Trunc224;

    use super::*;
    #[tokio::test]
    async fn SN_Mut_Online_SelectArea_0001() {
        /**
         ```
        测试用例：默认选择美国SN上线
        测试数据：
        (1) LN 设置Device 对象Area [0,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN1 上线
        ```
         */
        run_test_async("SN_Mut_Online_SelectArea_0001", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN1\\sn-miner.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN2\\sn-miner.desc").unwrap();
            let sn3 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN3\\sn-miner.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 16;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 10;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    let ep = format!("L4udp192.168.100.74:{}",30000+run_sum);
                    eps1.push(ep);
                    let city_num = random_int(0,200);
                    let str_area = format!("{}:{}:{}:{}",0,carrier,city_num,1); 
                    log::info!("local device area : {}",str_area.clone());
                    let area = Area::from_str(str_area.as_str()).unwrap();
                    let name = format!("lzh1");
                    let private_key = PrivateKey::generate_rsa(1024).unwrap();
                    let (device,key) = create_device_area(name,eps1,sn_list.clone(),pn_list.clone(),None,area,private_key).await;
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
                    let result = match future::timeout(Duration::from_secs(20), stack.sn_client().ping().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            log::info!("sn online success {}", device.desc().device_id());
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            0
                        }
                    };
                    assert_eq!(result,0,"wait sn online timeout");
                    for sn in stack.sn_client().ping().sn_list(){
                        log::info!("index {} lcoal area {} sn list:{}",run_sum,str_area,sn.desc().object_id().to_string());
                        assert_eq!(sn.desc().object_id().to_string(),SN1.to_string(),"select sn online incorrect");
                    }
                }
            }

            
            
        }).await
    }

    #[tokio::test]
    async fn SN_Mut_Online_SelectArea_0002() {
        /**
        ```
        测试用例：美国地域选择美国最近SN上线
        测试数据：
        (1) LN 设置Device 对象Area [1,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN2 上线
        ```
         */
        run_test_async("SN_Mut_Online_SelectArea_0002", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN1\\sn-miner.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN2\\sn-miner.desc").unwrap();
            let sn3 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN3\\sn-miner.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 16;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 10;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    let ep = format!("L4udp192.168.100.74:{}",30000+run_sum);
                    eps1.push(ep);
                    let city_num = random_int(0,200);
                    let str_area = format!("{}:{}:{}:{}",1,carrier,city_num,1); 
                    log::info!("local device area : {}",str_area.clone());
                    let area = Area::from_str(str_area.as_str()).unwrap();
                    let name = format!("lzh1");
                    let private_key = PrivateKey::generate_rsa(1024).unwrap();
                    let (device,key) = create_device_area(name,eps1,sn_list.clone(),pn_list.clone(),None,area,private_key).await;
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
                    let result = match future::timeout(Duration::from_secs(20), stack.sn_client().ping().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            log::info!("sn online success {}", device.desc().device_id());
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            0
                        }
                    };
                    assert_eq!(result,0,"wait sn online timeout");
                    for sn in stack.sn_client().ping().sn_list(){
                        log::info!("index {} lcoal area {} sn list:{}",run_sum,str_area,sn.desc().object_id().to_string());
                        assert_eq!(sn.desc().object_id().to_string(),SN2.to_string(),"select sn online incorrect");
                    }
                }
            }

            
            
        }).await
    }
    
    #[tokio::test]
    async fn SN_Mut_Online_SelectArea_0003() {
        /**
        ```
        测试用例：中国选择中国SN上线
        测试数据：
        (1) LN 设置Device 对象Area [86,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("SN_Mut_Online_SelectArea_0003", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN1\\sn-miner.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN2\\sn-miner.desc").unwrap();
            let sn3 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN3\\sn-miner.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 16;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 10;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    let ep = format!("L4udp192.168.100.74:{}",30000+run_sum);
                    eps1.push(ep);
                    let city_num = random_int(0,200);
                    let str_area = format!("{}:{}:{}:{}",86,carrier,city_num,1); 
                    log::info!("local device area : {}",str_area.clone());
                    let area = Area::from_str(str_area.as_str()).unwrap();
                    let name = format!("lzh1");
                    let private_key = PrivateKey::generate_rsa(1024).unwrap();
                    let (device,key) = create_device_area(name,eps1,sn_list.clone(),pn_list.clone(),None,area,private_key).await;
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
                    let result = match future::timeout(Duration::from_secs(20), stack.sn_client().ping().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            log::info!("sn online success {}", device.desc().device_id());
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            0
                        }
                    };
                    assert_eq!(result,0,"wait sn online timeout");
                    for sn in stack.sn_client().ping().sn_list(){
                        log::info!("index {} lcoal area {} sn list:{}",run_sum,str_area,sn.desc().object_id().to_string());
                        assert_eq!(sn.desc().object_id().to_string(),SN3.to_string(),"select sn online incorrect");
                    }
                }
            }

            
            
        }).await
    }
    
    #[tokio::test]
    async fn SN_Mut_Online_SelectArea_0004() {
        /**
        ```
        测试用例：测试0-200 国家编码选择上线的sn
        测试数据：
        (1) LN 设置Device 对象Area [1,9,3,3]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("SN_Mut_Online_SelectArea_0004", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN1\\sn-miner.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN2\\sn-miner.desc").unwrap();
            let sn3 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN3\\sn-miner.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut run_sum = 0;
            while run_sum<512 {
                let mut eps1 = Vec::new();
                let ep = format!("L4udp192.168.100.74:{}",30000+run_sum);
                eps1.push(ep);
                let str_area = format!("{}:{}:{}:{}",run_sum,0,0,3); 
                log::info!("local device area : {}",str_area.clone());
                let area = Area::from_str(str_area.as_str()).unwrap();
                let name = format!("lzh{}",run_sum);
                let private_key = PrivateKey::generate_rsa(1024).unwrap();
                let (device,key) = create_device_area(name.clone(),eps1,sn_list.clone(),pn_list.clone(),None,area,private_key).await;
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
                let result = match future::timeout(Duration::from_secs(20), stack.sn_client().ping().wait_online()).await {
                    Err(err) => {
                        log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                        1000
                    },
                    Ok(_) => {
                        log::info!("sn online success {}", device.desc().device_id());
                        let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                        0
                    }
                };
                assert_eq!(result,0,"wait sn online timeout");
                for sn in stack.sn_client().ping().sn_list(){
                    log::info!("index {} lcoal area {} sn list:{}",run_sum,str_area,sn.desc().object_id().to_string());
                    
                }
                run_sum = run_sum + 1;
            }
            
            
        }).await
    }
    

    #[tokio::test]
    async fn SN_Mut_SNcall_SelectArea_0001() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [1,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [1,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("SN_Mut_SNcall_SelectArea_0001", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN1\\sn-miner.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN2\\sn-miner.desc").unwrap();
            let sn3 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\SN3\\sn-miner.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            sns.push(sn3);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",1,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",1,4,20,1); 
            let area2 = Area::from_str(str_area2.as_str()).unwrap();
            log::info!("local device area : {}",str_area2.clone());
            let (device2,key2) = stack_manager.create_stack("device2", eps2, area2, Some(sns), Some(pns)).await;
            // (2) 启动监听
            let client1 = stack_manager.get_client("device1".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device2".clone());
            log::info!("client2 info : {}",client2.get_stack().local_device_id());
            let confirm2 =client2.auto_accept();
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            // (3.1) client1 连接 client2 首次连接
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
                    remote_sn:Some(remote_sn),
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
            
            {   
                
                let mut con1 = client1.get_stream(LN_Stream.as_str());
                let RN_Stream = format!("{}{}",device1.desc().object_id().to_string(),stream_id.clone());
                let mut con2 = client2.get_stream(RN_Stream.as_str());
                log::info!("connect1: {}",con1.get_stream());
                log::info!("connect2: {}",con2.get_stream());
                //RN 一个线程收数据
                let task1 = task::spawn(async move {
                    let recv = con2.recv_file().await;
                });
                //stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con1.send_file(10*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
        }).await
    }
    


}
