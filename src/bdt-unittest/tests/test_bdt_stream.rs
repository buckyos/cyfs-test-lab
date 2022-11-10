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
    async fn test_stream_001() {
        run_test_async("", async{
            // 建立连接基本流程

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device1".to_string()).await;
            let (device2,key2) = load_device(device_path,"device2".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let _ = auto_accept(acceptor1,Vec::new()).await;
            let _ = auto_accept(acceptor2,Vec::new()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;

            let mut wan_addr = false;
            for addr in device2.connect_info().endpoints().iter() {
                if addr.is_static_wan() {
                    wan_addr = true;
                }
            }
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
                    Some(device2)
                } else {
                    None
                }
            };
            let accept_answer = false;
            let mut answer = [0;128];
            let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
            let _ = match stack1.stream_manager().connect(0, Vec::new(), param).await {
                Ok(mut stream) => {
                    let mut len = 0;
                    // 接收answer
                    let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    log::info!("connect success time = {}",connect_time);
                    if(accept_answer){
                        len = match stream.read(&mut answer).await{
                            Ok(len) => {
                                log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
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
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }

    #[tokio::test]
    async fn test_stream_002() {
        run_test_async("", async{
            // 建立连接基本流程

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device1".to_string()).await;
            let (device2,key2) = load_device(device_path,"device2".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let _ = auto_accept(acceptor1,Vec::new()).await;
            let _ = auto_accept(acceptor2,Vec::new()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;

            let mut wan_addr = false;
            for addr in device2.connect_info().endpoints().iter() {
                if addr.is_static_wan() {
                    wan_addr = true;
                }
            }
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
                    Some(device2)
                } else {
                    None
                }
            };
            let accept_answer = false;
            let mut answer = [0;128];
            let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
            let mut run_sum = 10;
            while run_sum>0 {
                run_sum = run_sum -1;
                let _ = match stack1.stream_manager().connect(0, Vec::new(), param.clone()).await {
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("connect success time = {}",connect_time);
                        if(accept_answer){
                            len = match stream.read(&mut answer).await{
                                Ok(len) => {
                                    log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
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
            
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }

    #[tokio::test]
    async fn test_stream_003() {
        run_test_async("", async{
            // 建立连接基本流程

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device1".to_string()).await;
            let (device2,key2) = load_device(device_path,"device2".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let _ = auto_accept(acceptor1,Vec::new()).await;
            let _ = auto_accept(acceptor2,Vec::new()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;
            {
                let mut wan_addr = false;
                for addr in device2.connect_info().endpoints().iter() {
                    if addr.is_static_wan() {
                        wan_addr = true;
                    }
                }
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
                let accept_answer = false;
                let mut answer = [0;128];
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let mut run_sum = 10;
                let _ = match stack1.stream_manager().connect(0, Vec::new(), param.clone()).await {
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("connect success time = {}",connect_time);
                        if(accept_answer){
                            len = match stream.read(&mut answer).await{
                                Ok(len) => {
                                    log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
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
            
            {
                let mut wan_addr = false;
                for addr in device1.connect_info().endpoints().iter() {
                    if addr.is_static_wan() {
                        wan_addr = true;
                    }
                }
                let remote_sn = match device1.body().as_ref() {
                    None => {
                        Vec::new()
                    },
                    Some(b) => {
                        b.content().sn_list().clone()
                    },
                };
                let param = BuildTunnelParams {
                    remote_const: device1.desc().clone(),
                    remote_sn,
                    remote_desc: if wan_addr {
                        Some(device1.clone())
                    } else {
                        None
                    }
                };
                let accept_answer = false;
                let mut answer = [0;128];
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let mut run_sum = 10;
                let _ = match stack2.stream_manager().connect(0, Vec::new(), param.clone()).await {
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("connect success time = {}",connect_time);
                        if(accept_answer){
                            len = match stream.read(&mut answer).await{
                                Ok(len) => {
                                    log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
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
            
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }

    #[tokio::test]
    async fn test_stream_004() {
        run_test_async("", async{
            // 建立连接基本流程

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device1".to_string()).await;
            let (device2,key2) = load_device(device_path,"device2".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let answer_info = random_str(500).await;
            log::info!("set answer info = {:?}",answer_info.clone());
           //let answer_info = "aaaaaaaaaaaaa".as_bytes();
            let _ = auto_accept(acceptor1,answer_info.as_bytes().to_vec()).await;
            let _ = auto_accept(acceptor2,answer_info.as_bytes().to_vec()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;
            {
                let mut wan_addr = false;
                for addr in device2.connect_info().endpoints().iter() {
                    if addr.is_static_wan() {
                        wan_addr = true;
                    }
                }
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
                let mut answer = [0;128];
                let question_info = random_str(500).await;
                log::info!("set question info = {:?}",question_info.clone());
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let mut run_sum = 10;
                let _ = match stack1.stream_manager().connect(0, question_info.as_bytes().to_vec(), param.clone()).await {
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
            
            
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }


    #[tokio::test]
    async fn test_FristQA_005() {
        run_test_async("", async{
            // 测试Frist QA  数据大小

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device3".to_string()).await;
            let (device2,key2) = load_device(device_path,"device4".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let answer_info = random_str(0).await;
            log::info!("set answer info = {:?}",answer_info.clone());
           //let answer_info = "aaaaaaaaaaaaa".as_bytes();
            let _ = auto_accept(acceptor1,answer_info.as_bytes().to_vec()).await;
            let _ = auto_accept(acceptor2,answer_info.as_bytes().to_vec()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;
            {
                let mut wan_addr = false;
                for addr in device2.connect_info().endpoints().iter() {
                    if addr.is_static_wan() {
                        wan_addr = true;
                    }
                }
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
                let mut answer = [0;128];
                let question_info = random_str(100).await;
                log::info!("set question info = {:?}",question_info.clone());
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let mut run_sum = 10;
                let _ = match stack1.stream_manager().connect(0, question_info.as_bytes().to_vec(), param.clone()).await {
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
            
            
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }

    #[tokio::test]
    async fn test_stream_006() {
        run_test_async("", async{
            // 建立连接基本流程

            // 1.加载本地Device
            let device_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device1,key1) = load_device(device_path.clone(),"device1".to_string()).await;
            let (device2,key2) = load_device(device_path,"device2".to_string()).await;
            
            // 2.初始化BDT 协议栈 启动参数 
            let mut sns = Vec::new();
            let sn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc").unwrap();
            sns.push(sn);
            let sn_list = load_sn(sns).await;
            let mut pns = Vec::new();
            let pn = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc").unwrap();
            pns.push(pn);
            let pn_list = load_pn(pns).await;
            let mut params1 = StackOpenParams::new(device1.desc().device_id().to_string().as_str());
            params1.known_device = None; //
            params1.known_sn = Some(sn_list.clone());
            params1.active_pn = Some(pn_list.clone());
            params1.passive_pn = Some(pn_list.clone());
            params1.config.interface.udp.sn_only = false;
            params1.tcp_port_mapping = None;
            let mut params2 = StackOpenParams::new(device2.desc().device_id().to_string().as_str());
            params2.known_device = None; //
            params2.known_sn = Some(sn_list.clone());
            params2.active_pn = Some(pn_list.clone());
            params2.passive_pn = Some(pn_list.clone());
            params2.config.interface.udp.sn_only = false;
            params2.tcp_port_mapping = None;
            // 3. 启动协议栈
            let (stack1,acceptor1) = load_stack(device1.clone(), key1, params1).await;
            let (stack2,acceptor2) = load_stack(device2.clone(), key2, params2).await;
            let device1 = stack1.local();
            let device2 = stack2.local();
            // 4. 协议栈建立连接
            let _ = auto_accept(acceptor1,Vec::new()).await;
            let _ = auto_accept(acceptor2,Vec::new()).await;
            async_std::task::sleep(Duration::from_millis(1000)).await;
            {
                let mut wan_addr = false;
                for addr in device2.connect_info().endpoints().iter() {
                    if addr.is_static_wan() {
                        wan_addr = true;
                    }
                }
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
                let accept_answer = false;
                let mut answer = [0;128];
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let mut run_sum = 10;
                let _ = match stack1.stream_manager().connect(0, Vec::new(), param.clone()).await {
                    Ok(mut stream) => {
                        let mut len = 0;
                        // 接收answer
                        let connect_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                        log::info!("connect success time = {}",connect_time);
                        if(accept_answer){
                            len = match stream.read(&mut answer).await{
                                Ok(len) => {
                                    log::info!("Read answer success,len={} content={:?}",len,String::from_utf8(answer[..len].to_vec()).expect(""));
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
         
            std::thread::sleep(std::time::Duration::new(30, 0));
        }).await
        
    }


}
