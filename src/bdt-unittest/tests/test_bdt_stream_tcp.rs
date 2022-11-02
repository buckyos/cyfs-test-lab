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


#[cfg(test)]
mod tests {
    use super::*;

    #[actix_rt::test]
    async fn test_stream_tcp_connect_001() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP SN_Call 内网打洞流程 
         */
        run_test_async("test_stream_tcp_connect_001", async{
            // 前置条件:
            // (1) 创建BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let (device1,key1) = stack_manager.load_test_stack_tcp("device1",Some(SN_list()),None).await;
            let (device2,key2) = stack_manager.load_test_stack_tcp("device2",Some(SN_list()),None).await;
            // (2) BDT协议栈启动监听
            let client1 = stack_manager.get_client("device1".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device2".clone());
            let confirm2 =client2.auto_accept();
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (3.2) client1 连接 client2 二次连接
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (3.3) client2 连接 client1 二次连接 反向
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all().await;
            stack_manager.sleep(10).await;
        }).await;
        
    }

    #[actix_rt::test]
    async fn test_stream_tcp_connect_002() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP 直连流程 
         */
        run_test_async("test_stream_tcp_connect_002", async{
            // 前置条件:
            // (1) 创建BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let (device1,key1) = stack_manager.load_test_stack_tcp("device5_W4tcp",Some(SN_list()),None).await;
            let (device2,key2) = stack_manager.load_test_stack_tcp("device6_W4tcp",Some(SN_list()),None).await;
            // (2) BDT协议栈启动监听
            let client1 = stack_manager.get_client("device5_W4tcp".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device6_W4tcp".clone());
            let confirm2 =client2.auto_accept();
             // (3.1) client1 连接 client2 首次连接
             {   
                // 构建 BuildTunnelParams
                let mut wan_addr = true;
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (3.2) client1 连接 client2 二次连接
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        //
                        
                    }
                };
            }
            // (3.3) client2 连接 client1 二次连接 反向
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
                        log::info!("connect success time = {}",connect_time);
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                        
                    }
                };
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all();
            stack_manager.sleep(10).await;
        }).await;
        
    }
    
    
    #[actix_rt::test]
    async fn test_stream_tcp_FristQA_001() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP Frist QA 机制
         */
        run_test_async("test_stream_tcp_FristQA_001", async{
            // BDT Stream Frist QA 流程 
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let (device1,key1) = stack_manager.load_test_stack_tcp("device1",Some(SN_list()),Some(PN_list())).await;
            let (device2,key2) = stack_manager.load_test_stack_tcp("device2",Some(SN_list()),Some(PN_list())).await;
            let client1 = stack_manager.get_client("device1".clone());
            let answer_info1 = random_str(500).await;
            client1.set_answer(answer_info1);
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            
            let client2 = stack_manager.get_client("device2".clone());
            let answer_info2 = random_str(500).await;
            log::info!("client2 info : {}",client2.get_stack().local_device_id());
            client2.set_answer(answer_info2);
            let confirm2 =client2.auto_accept();
            {   
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
                let accept_answer = true;
                let mut answer = [0;1024];
                let question_info = random_str(500).await;
                log::info!("set question info = {:?}",question_info.clone());
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let _ = match client1.get_stack().stream_manager().connect(0, question_info.as_bytes().to_vec(), param.clone()).await{
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("connect success time = {}",connect_time);
                        if(accept_answer){
                            len = match stream.read(&mut answer).await{
                                Ok(len) => {
                                    let data = str::from_utf8(&answer[..len]).unwrap();
                                    log::info!("Read answer success,len={} content={:?}",len,data);
                                    len
                                },
                                Err(e) => {
                                    log::error!("Read answer faild");
                                    let len : usize = 0;
                                    len
                                }
                            };
                        }
                    },
                    Err(e) => {
                        log::error!("connect failed, e={}", &e);
                    }
                };
            }
            stack_manager.sleep(20).await;
            

        }).await
        
    }


    #[actix_rt::test]
    async fn test_stream_tcp_stream_001() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP SN_Call 内网打洞流程 
         */
        run_test_async("test_stream_tcp_connect_001", async{
            // 前置条件:
            // (1) 创建BDT 协议栈
            let mut stack_manager = StackManager::new(PathBuf::from_str(Work_Space).unwrap());
            let (device1,key1) = stack_manager.load_test_stack_tcp("device1",Some(SN_list()),None).await;
            let (device2,key2) = stack_manager.load_test_stack_tcp("device2",Some(SN_list()),None).await;
            // (2) BDT协议栈启动监听
            let client1 = stack_manager.get_client("device1".clone());
            log::info!("client1 info : {}",client1.get_stack().local_device_id());
            let confirm1= client1.auto_accept();
            let client2 = stack_manager.get_client("device2".clone());
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
                //stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con1.send_data(10*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
            // (3.3) client2 -> client1 发送数据
            {   
                let mut con1 = client1.get_stream(LN_Stream.as_str());
                let RN_Stream = format!("{}{}",device1.desc().object_id().to_string(),stream_id.clone());
                let mut con2 = client2.get_stream(RN_Stream.as_str());
                log::info!("connect1: {}",con1.get_stream());
                log::info!("connect2: {}",con2.get_stream());
                //RN 一个线程收数据
                let task1 = task::spawn(async move {
                    let recv = con1.recv_data().await;
                });
                //stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con2.send_data(10*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
            // (3.4) client1 -> client2 发送数据
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
                //stack_manager.sleep(1).await;
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //LN 一个线程发数据
                let task2 = task::spawn(async move {
                    let send = con1.send_data(10*1024*1024).await;
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("send stream success time = {},sequence = {}",connect_time,stream_id.to_string());
                });
                task1.await;
                task2.await;
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all().await;
            stack_manager.sleep(10).await;
        }).await;
        
    }
}