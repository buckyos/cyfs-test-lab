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
//SN1 美国， 区域226:0:3394，Device ID 5hLXBRnR3q3WMnXjDcywEDFbf9mCPQLFT15CsjCHpJQn， 地址149.28.203.122:8060， [2001:19f0:ac02:7a6:5400:4ff:fe39:7539]:8061
const SN1 : &str = "5hLXBRnR3q3WMnXjDcywEDFbf9mCPQLFT15CsjCHpJQn"; 
//SN2 中国， 区域0：0：0，Device ID 5aSixgMNTWyrGcK1Ft4K955Np9DiLdG7Jwj7fiWbEoa6, 地址120.25.76.67:8060， [2408:4003:108b:ba00:98ab:b856:5f0c:4171]:8061
const SN2 : &str = "5aSixgMNTWyrGcK1Ft4K955Np9DiLdG7Jwj7fiWbEoa6"; 


#[cfg(test)]

mod tests {
    use std::fmt::format;

    use sha2::Sha512Trunc224;

    use super::*;
    #[tokio::test]
    async fn Regress_Nightly_SN_Online_SelectArea_USA() {
        /**
         ```
        测试用例：测试配置美国 Area 226 SN 上线
        测试数据：
        (1) LN 设置Device 对象Area [0,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN1 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_Online_SelectArea_USA", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
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
                    let str_area = format!("{}:{}:{}:{}",226,carrier,city_num,1); 
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
    async fn Regress_Nightly_SN_Online_SelectArea_CN() {
        /**
        ```
        测试用例：测试配置默认地区 Area 0 SN 上线
        测试数据：
        (1) LN 设置Device 对象Area [1,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN2 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_Online_SelectArea_CN", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 1;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 10;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    eps1.push(format!("L4udp192.168.100.74:{}",30000+run_sum));
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
                        assert_eq!(sn.desc().object_id().to_string(),SN2.to_string(),"select sn online incorrect");
                    }
                }
            }

            
            
        }).await
    }
    

    #[tokio::test]
    async fn Regress_Nightly_SN_Online_SelectArea_ALL() {
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
        run_test_async("Regress_Nightly_SN_Online_SelectArea_ALL", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
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
    async fn Regress_Nightly_SN_SNcall_SelectArea_0001() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_SelectArea_0001", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",0,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",226,4,20,1); 
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
    
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_SelectArea_0002() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_SelectArea_0002", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",226,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",0,4,20,1); 
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
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_SelectArea_0003() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_SelectArea_0003", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",0,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",0,4,20,1); 
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
    
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_SelectArea_0004() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [44,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_SelectArea_0004", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",226,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",44,4,20,1); 
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
    
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_By_RemoteSNInfo() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_By_RemoteSNInfo", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let mut sns1 = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            
            sns1.push(sn2.clone());
            sns.push(sn1);
            sns.push(sn2);
            let sn_usa = load_sn(sns.clone()).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",0,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns1.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",226,4,20,1); 
            let area2 = Area::from_str(str_area2.as_str()).unwrap();
            log::info!("local device area : {}",str_area2.clone());
            let (device2,key2) = stack_manager.create_stack("device2", eps2, area2, Some(sns.clone()), Some(pns)).await;
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
                    remote_desc: None
                };
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                // 发起连接
                for device in sn_usa{
                    let id = device.desc().device_id();
                    client1.get_stack().device_cache().add(&id, &device);
                }
               
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
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_By_LocalSNInfo() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_By_LocalSNInfo", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",0,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",226,4,20,1); 
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
                let mut deviceInfo = device2.clone();
                let _ = deviceInfo.mut_connect_info().mut_sn_list().clear();
                let remote_sn = match device2.body().as_ref() {
                    None => {
                        Vec::new()
                    },
                    Some(b) => {
                        b.content().sn_list().clone()
                    },
                };
                let param = BuildTunnelParams {
                    remote_const: deviceInfo.desc().clone(),
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
    #[tokio::test]
    async fn Regress_Nightly_SN_SNcall_By_BuildTunnelParams() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_SNcall_By_BuildTunnelParams", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let mut sns1 = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns1.push(sn2.clone());
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
   
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",30000);
            eps1.push(ep);
            let str_area1= format!("{}:{}:{}:{}",0,8,20,1); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1,  Some(sns.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            let ep = format!("L4udp192.168.100.74:{}",40000);
            eps2.push(ep);
            let str_area2= format!("{}:{}:{}:{}",226,4,20,1); 
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
    
    #[tokio::test]
    async fn Decode_Meta_SN_info() {
        run_test_async("Decode_SN_info", async{
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\nightly_meta_sn_list_dir.desc").unwrap(); //
            
            //let dir = cyfs_util::SNDirGenerator::gen_from_dir(&None, &sn1).unwrap();
            //let object_raw = dir.to_vec().unwrap();
            //let dir_id = dir.desc().calculate_id();
            
            let path = format!("{:?}", &sn1);
            let mut file = std::fs::File::open(sn1.clone()).map_err(|e| {
                log::error!("open sn desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            }).unwrap();
            log::info!("load sn file success,path =  {}",sn1.display());
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf).map_err(|e| {
                log::error!("read desc failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            }).unwrap();
            let (object, _) = Dir::raw_decode(buf.as_slice()).map_err(|e| {
                log::error!("decode sn failed on create, path={:?}, e={}", path.as_str(), &e);
                e
            }).unwrap();
            let id = object.desc().object_id();
            let object_raw = object.to_vec().unwrap();
            
            let list = cyfs_util::SNDirParser::parse(Some(&id), &object_raw.as_ref()).unwrap();
            for item in list {
                let sn_id = item.0;
                let sn_info = item.1;
                log::info!("got sn item: {}", sn_id.clone());
                let path_str = format!("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\{}.desc",sn_id);
                let file_obj_path = PathBuf::from_str(path_str.as_str()).unwrap();
                let _ = match sn_info.encode_to_file(file_obj_path.clone().as_path(),true){
                    Ok(_) => {
                        log::info!("encode device to file succ ,path ={}", file_obj_path.display());
                    },
                    Err(e) => {
                        log::error!("encode device obj to file failed,path = {},err {}",file_obj_path.display(), e);
                    },
                };
            }

        }).await
    }
    
    // #[tokio::test]
    // async fn Decode_Local_Dir_SN_info() {
    //     run_test_async("Decode_Local_Dir_SN_info", async{
    //         let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\test\\").unwrap(); //
            
    //         let dir = cyfs_util::SNDirGenerator::gen_from_dir(&None, &sn1).unwrap();
    //         let object_raw = dir.to_vec().unwrap();
    //         let dir_id = dir.desc().calculate_id();
    //         let list = cyfs_util::SNDirParser::parse(Some(&dir_id), &object_raw.as_ref()).unwrap();
    //         for item in list {
    //             let sn_id = item.0;
    //             let sn_info = item.1;
    //             let desc_info = sn_info.desc().object_id().info();
    //             if let ObjectIdInfo::Standard(obj) = desc_info {
    //                 let tmp_area = obj.area.unwrap();
    //                 log::info!("device id = {} area = {}",sn_id.clone() ,tmp_area);
    //             } 
    //             log::info!("got sn item: {}", sn_id.clone());
    //             // 重新将Device 写入desc
    //             let path_str = format!("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\test\\{}.desc",sn_id);
    //             let file_obj_path = PathBuf::from_str(path_str.as_str()).unwrap();
    //             let _ = match sn_info.encode_to_file(file_obj_path.clone().as_path(),true){
    //                 Ok(_) => {
    //                     log::info!("encode device to file succ ,path ={}", file_obj_path.display());
    //                 },
    //                 Err(e) => {
    //                     log::error!("encode device obj to file failed,path = {},err {}",file_obj_path.display(), e);
    //                 },
    //             };
    //         }

    //     }).await
    // }
    #[tokio::test]
    async fn Reset_bdt_stack(){
        /**
         ```
        测试用例：更新SN后重启BDT协议栈
        ```
         */
        run_test_async("Reset_bdt_stack", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns1 = Vec::new();
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns1.push(sn2.clone()); 
            sns.push(sn1);
            sns.push(sn2);
            let sn_list1 = load_sn(sns1).await;
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 1;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 1;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    let ep = format!("L4udp192.168.100.74:{}",30000+run_sum);
                    eps1.push(ep);
                    let city_num = random_int(0,200);
                    let str_area = format!("{}:{}:{}:{}",226,carrier,city_num,1); 
                    log::info!("local device area : {}",str_area.clone());
                    let area = Area::from_str(str_area.as_str()).unwrap();
                    let name = format!("lzh1");
                    let private_key = PrivateKey::generate_rsa(1024).unwrap();
                    let (device,key) = create_device_area(name,eps1,sn_list1.clone(),pn_list.clone(),None,area,private_key).await;
                    // 2. 加载BDT Stack 启动配置
                    let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
                    // 已知Device 列表
                    params.known_device = None; //
                    params.known_sn = Some(sn_list1.clone());
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
                    let result = match future::timeout(Duration::from_secs(60), stack.sn_client().ping().wait_online()).await {
                        Err(err) => {
                            log::error!("sn online timeout {}.err= {}", device.desc().device_id(),err);
                            1000
                        },
                        Ok(_) => {
                            log::info!("sn online success {}", device.desc().device_id());
                            let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                            log::info!("device {} sn online success,time = {}",device.desc().device_id(),online_time);
                            // for device in sn_list{
                            //     let id = device.desc().device_id();
                            //     stack.device_cache().add(&id, &device);
                            // }
                            let result = stack.reset_sn_list(sn_list.clone());
                            log::info!("######### reset_sn_list");
                            sleep(30).await;
                            0
                        }
                    };
                    assert_eq!(result,0,"wait sn online timeout");
                    for sn in stack.sn_client().ping().sn_list(){
                        log::info!("index {} lcoal area {} sn list:{}",run_sum,str_area,sn.desc().object_id().to_string());
                        //assert_eq!(sn.desc().object_id().to_string(),SN1.to_string(),"select sn online incorrect");
                    }
                }
            }

            
        }).await
    }


    #[tokio::test]
    async fn Reset_bdt_stack_connect() {
        /**
        ```
        测试用例：多SN建立连接
        测试数据：
        (1) LN 设置Device 对象Area [0,9,3,3]，设置SN List [SN1,SN2,SN3] LN 启动BDT协议栈
        (2) RN 设置Device 对象Area [226,9,3,3]，设置SN List [SN1,SN2,SN3] RN 启动BDT协议栈 
        (3) 
        预期结果：
        (1) LN 在SN3 上线
        ```
         */
        run_test_async("Reset_bdt_stack_connect", async{
            // 
            // （0）读取实验室配置
            let mut sns = Vec::new();
            let mut sns1 = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns1.push(sn2.clone());
            sns.push(sn1);
            sns.push(sn2);
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let sn_list = load_sn(sns.clone()).await;
            // (1)初始化测试的BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let mut eps1 = Vec::new();
            eps1.push(format!("L4udp192.168.100.74:{}",30000));
            eps1.push(format!("L4tcp192.168.100.74:{}",30001));
            let str_area1= format!("{}:{}:{}:{}",0,0,0,8); 
            let area1 = Area::from_str(str_area1.as_str()).unwrap();
            log::info!("local device area : {}",str_area1.clone());
            let (device1,key1) = stack_manager.create_stack("device1", eps1, area1, Some(sns1.clone()), Some(pns.clone())).await;

            let mut eps2 = Vec::new();
            eps2.push(format!("L4udp192.168.100.74:{}",40000));
            eps2.push(format!("L4tcp192.168.100.74:{}",40001));
            let str_area2= format!("{}:{}:{}:{}",226,0,3376,0); 
            let area2 = Area::from_str(str_area2.as_str()).unwrap();
            log::info!("local device area : {}",str_area2.clone());
            let (device2,key2) = stack_manager.create_stack("device2", eps2, area2, Some(sns1), Some(pns)).await;
            // (2) 启动监听
            let client1 = stack_manager.get_client("device1".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device2".clone());
            log::info!("client2 info : {}",client2.get_stack().local_device_id());
            let confirm2 =client2.auto_accept();
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            client1.get_stack().reset_sn_list(sn_list.clone());
            client2.get_stack().reset_sn_list(sn_list.clone());
            sleep(30).await;
            // (3.1) client1 连接 client2 首次连接
            {   
                // 构建 BuildTunnelParams
                let mut sn_id_list = Vec::new();
                for  sn_device in sn_list{
                    let device_id = sn_device.desc().device_id();
                    sn_id_list.push(device_id);
                }
                let mut remote = device2.clone();
                let _ =  remote.mut_connect_info().mut_endpoints().clear();
                let _ =  remote.mut_connect_info().mut_sn_list().clear();
                let param = BuildTunnelParams {
                    remote_const: remote.desc().clone(),
                    remote_sn:Some(sn_id_list),
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
    
    #[tokio::test]
    async fn Read_object_id(){
        /**
         ```
        测试用例：更新SN后重启BDT协议栈
        ```
         */
        run_test_async("Read_object_id", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let object_id = ObjectId::from_base58("5hLXAcP3JwSreqrtJj2GvpLn1A2EwQk39TQ3W1Vr1R2A").unwrap();
            let _  = match object_id.info().area(){
                Some(area)=>{
                    log::info!("arae : {}",area.to_string());
                },
                None =>{
                    log::info!("arae : None");
                }
            };
           
        

            
        }).await
    }

    #[tokio::test]
    async fn Regress_Nightly_SN_Online_ipv6() {
        /**
         ```
        测试用例：测试配置美国 Area 226 SN 上线
        测试数据：
        (1) LN 设置Device 对象Area [0,X,X,X]
        (2) LN 设置SN List [SN1,SN2,SN3]
        (3) LN 启动BDT协议栈
        预期结果：
        (1) LN 在SN1 上线
        ```
         */
        run_test_async("Regress_Nightly_SN_Online_ipv6", async{
            // SN 提供P2P 网络NAT穿透功能。可以使用公用的SN服务或私有化部署的SN服务，辅助设备建立连接。 
            let mut sns = Vec::new();
            let sn1 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_USA.desc").unwrap();
            let sn2 = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\nightly\\sn-miner_CN.desc").unwrap();
            sns.push(sn1);
            sns.push(sn2);
            let sn_list = load_sn(sns).await;
            // PN 提供代理服务功能，如果你的网络是Symmetric 或者没有IPv6网络，你的网络可能不支持P2P 网络NAT穿透,需要公用的PN务或私有化部署的PN服务进行网络传输
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config\\lab\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;

            let mut carrier = 1;// 0-15 运营商范围测试
            
            let mut run_sum = 0;
            while carrier > 0 {
                carrier =carrier - 1;
                let mut city = 1;  // 随机十个城市匹配
                while city > 0 {
                    city = city - 1;
                    run_sum += 1;
                    let mut eps1 = Vec::new();
                    let ep1 = format!("L4tcp192.168.100.74:{}",30000+run_sum);
                    let ep2 = format!("L4udp192.168.100.74:{}",8050);
                    let ep3 = format!("L6udp[::]:{}",30000+run_sum);
                    eps1.push(ep1);
                    eps1.push(ep2);
                    eps1.push(ep3);
                    let city_num = random_int(0,200);
                    let str_area = format!("{}:{}:{}:{}",226,carrier,city_num,1); 
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

    
}
