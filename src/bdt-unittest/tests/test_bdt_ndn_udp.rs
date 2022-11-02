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


async fn chunk_check(reader: &mut (dyn cyfs_util::AsyncReadWithSeek + Unpin + Send + Sync), chunkid: ChunkId) -> BuckyResult<ChunkState> {
    let mut content = vec![0u8; chunkid.len()];
    let _ = reader.read(content.as_mut_slice()).await?;
    let check_id = ChunkId::calculate(content.as_slice()).await?;

    if check_id == chunkid {
        Ok(ChunkState::Ready)
    } else {
        Ok(ChunkState::OnAir)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[actix_rt::test]
    async fn test_ndn_udp_chunk_001() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP SN_Call 内网打洞流程 
         */
        run_test_async("test_ndn_udp_chunk_001", async{
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
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            // (3.0)生成测试文件
            let source_dir = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\cache\\LN";
            let save_dir = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\cache\\RN";
            let file_name = random_str(20).await;
            let chunk_size = 50*1024*1024;
            let file_path  = random_file(source_dir,file_name.as_str(),chunk_size.clone()).await;
            {   // (3.1) 从文件总读取chunk数据  
                let mut content =  File::open(file_path).await.unwrap();
                let mut buf = vec![0u8;chunk_size.clone()];
                let len = content.read(&mut buf).await.unwrap();
                // (3.2) 计算chunk 
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let chunk_info =  match ChunkId::calculate(&buf).await {
                    Ok(chunk_id) => {
                        let dir = cyfs_util::get_named_data_root(client1.get_stack().local_device_id().to_string().as_str());
                        let path = dir.join(chunk_id.to_string().as_str());
                        let cal_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time.clone();
                        log::info!("calculate chunk ,len = {},calculate time = {}",chunk_id.len(),cal_time);
                        let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                        // (3.3) 将chunk 保存本地目录
                        let _ = match cyfs_bdt::download::track_chunk_to_path(&*client1.get_stack(), &chunk_id,Arc::new(buf),path.as_path()).await {
                            Ok(_) => {
                                let set_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set_time) as u32;
                                log::info!("set chunk ,len = {},set_time = {}",chunk_id.len(),set_time);
                                let request = cyfs_util::UpdateChunkStateRequest {
                                    chunk_id: chunk_id.clone(),
                                    current_state : None,
                                    state: ChunkState::Ready,
    
                                };
                                // (3.4) 检查本地chunk 是否存在
                                let _ =  client1.get_stack().ndn().chunk_manager().ndc().update_chunk_state(&request);
                                let chunk_exists = client1.get_stack().ndn().chunk_manager().store().exists( &chunk_id).await;
                                log::info!("chunk is exists {}",chunk_exists);
                            },
                            Err(e) => {
                                log::error!("set-chunk failed, e={}", &e);
                            }
                        };
                        Some(chunk_id)
                    }
                    Err(e) => {
                        log::error!("set-chunk failed for calculate chunk-id failed, err: {:?}", e);
                        None
                    }
                };
                let upload_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time.clone();
                log::info!("upload chunk success ,len = {}, upload total time = {}",chunk_size.clone(),upload_time);
                // (3.5) cache 对端 设备
                let stack_RN = client1.get_stack();
                let stack_LN = client2.get_stack();
                let chunk_download = chunk_info.unwrap().clone();
                let chunk_id = chunk_download.clone();
                let begin_download_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let run =  async_std::task::spawn(async move {
                    // 设置下载参数
                    let remote_id = stack_RN.local_device_id();
                    let remote = stack_RN.local();
                    let _ = stack_LN.device_cache().add(&remote_id, &remote);
                    let dir = cyfs_util::get_named_data_root(stack_LN.local_device_id().to_string().as_str());
                    let path = dir.join(chunk_id.to_string().as_str());
                    let ret = cyfs_bdt::download::download_chunk_to_path(&stack_LN, 
                        chunk_id.clone(), 
                        None,
                        Some(SingleDownloadContext::streams(None, vec![remote_id.clone()])), 
                        path.as_path()).await;
                });
                // 检查 下载完成的chunk
                let stack = client2.get_stack();
                //let chunk_id = chunk_id.unwrap();
                while true {
                    let begin_read_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                    let _ = match stack.ndn().chunk_manager().store().read(&chunk_download).await {
                        Ok(mut reader) => {
                            let read_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_read_time) as u32;
                            log::info!("download chunk read from loacl cache,len = {} , time = {}",chunk_download.len(),read_time);
                            let begin_hash_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                            match chunk_check(reader.as_mut(),chunk_download.clone()).await {
                                Ok(state) => {
                                    let state = match state {
                                        ChunkState::Unknown => "Unknown",
                                        ChunkState::NotFound => "NotFound",
                                        ChunkState::Pending => "Pending",
                                        ChunkState::OnAir => "OnAir",
                                        ChunkState::Ready => "Ready",
                                        ChunkState::Ignore => "Ignore",
                                    };
                                    log::info!("get chunk state success,state = {}",state.clone());
                                    if state == "Ready"{
                                        let hash_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_hash_time) as u32;
                                        log::info!("download chunk equal chunk hash, time = {}",hash_time);
                                        break;
                                    }
                                }
                                Err(e) => {
                                    log::warn!("get chunk state failed, e={}", &e);
                                }
                            }
                        },
                        Err(e) => {
                            log::error!("get chunk failed, e={}", &e);
                        }
                    };
                    stack_manager.sleep(1).await;
                }

                let download_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_download_time) as u32;
                log::info!("download chunk success ,len = {}, download total time = {}",chunk_download.len(),download_time);
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all().await;
            stack_manager.sleep(10).await;
        }).await;
        
    }
    #[actix_rt::test]
    async fn test_ndn_udp_file_001() {
        /**
         * 模块：BDT Stream 连接流程 
         * 测试函数 ： StreamManager.connect
         * 测试点: UDP SN_Call 内网打洞流程 
         */
        run_test_async("test_ndn_udp_file_001", async{
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
            let mut stream_id :u32 = 0;
            let mut LN_Stream = "".to_string();
            // (3.0)生成测试文件
            let source_dir = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\cache\\LN";
            let save_dir =   "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\cache\\RN";
            let file_name = random_str(20).await;
            let file_size = 50*1024*1024;
            let chunk_size = 10*1024*1024;
            let file_path  = random_file(source_dir,file_name.as_str(),file_size.clone()).await;
            {   
                let stack_RN = client1.get_stack();
                let stack_LN = client2.get_stack();
                //(3.1)从文件中读取数据计算chunk id
                let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                // 是否cache chunk
                let cache_chunk = true;
                let chunkids = {
                    let chunk_size: usize = chunk_size.clone();
                    let mut chunkids = Vec::new();
                    let mut file =  File::open(file_path.clone()).await.unwrap();
                    
                    loop {
                        let mut buf = vec![0u8; chunk_size];
                        let len = file.read(&mut buf).await.unwrap();
                        if len < chunk_size {
                            buf.truncate(len);    
                            let hash = hash_data(&buf[..]);
                            log::info!("read data from file len = {},hash={}",len.clone(),hash);
                            let chunkid = ChunkId::new(&hash, buf.len() as u32);
                            log::info!("file contain chunkid: {},len = {}",chunkid.to_string(),chunkid.len());
                            let dir = cyfs_util::get_named_data_root(stack_RN.local_device_id().to_string().as_str());
                            let path = dir.join(chunkid.to_string().as_str());
                            // let _ = match cyfs_bdt::download::track_chunk_to_path(&*stack_RN, &chunkid,Arc::new(buf),path.as_path()).await {
                            //     Ok(_) => {
                            //         let request = cyfs_util::UpdateChunkStateRequest {
                            //             chunk_id: chunkid.clone(),
                            //             current_state : None,
                            //             state: ChunkState::Ready,
        
                            //         };
                            //         // 检查本地chunk 是否存在
                            //         let _ =  client1.get_stack().ndn().chunk_manager().ndc().update_chunk_state(&request);
                            //         let chunk_exists = client1.get_stack().ndn().chunk_manager().store().exists( &chunkid).await;
                            //         log::info!("chunk is exists {}",chunk_exists);
                            //     },
                            //     Err(e) => {
                            //         log::error!("set-chunk failed, e={}", &e);
                            //     }
                            // };
                            chunkids.push(chunkid);
                            break;
                        } else {
                            let hash = hash_data(&buf[..]);
                            log::info!("read data from file len = {},hash={}",len.clone(),hash);
                            let chunkid = ChunkId::new(&hash, buf.len() as u32);
                            log::info!("file contain chunkid: {},len = {}",chunkid.to_string(),chunkid.len());
                            let dir = cyfs_util::get_named_data_root(stack_RN.local_device_id().to_string().as_str());
                            let path = dir.join(chunkid.to_string().as_str());
                            // let _ = match cyfs_bdt::download::track_chunk_to_path(&*stack_RN, &chunkid,Arc::new(buf),path.as_path()).await {
                            //     Ok(_) => {
                            //         let request = cyfs_util::UpdateChunkStateRequest {
                            //             chunk_id: chunkid.clone(),
                            //             current_state : None,
                            //             state: ChunkState::Ready,
        
                            //         };
                            //         // 检查本地chunk 是否存在
                            //         let _ =  client1.get_stack().ndn().chunk_manager().ndc().update_chunk_state(&request);
                            //         let chunk_exists = client1.get_stack().ndn().chunk_manager().store().exists( &chunkid).await;
                            //         log::info!("chunk is exists {}",chunk_exists);
                            //     },
                            //     Err(e) => {
                            //         log::error!("set-chunk failed, e={}", &e);
                            //     }
                            // };
                            chunkids.push(chunkid);
                        }
                    }
                    chunkids
                };
                let cal_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time.clone();
                log::info!("calculate file chunkid success filesize = {},calculate time = {}",file_size.clone(),cal_time);
                let file_path_buf = PathBuf::from_str(file_path.clone().as_str()).unwrap();
                let begin_hash_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //(3.2) 计算文件hash 生成文件对象
                let (hash, len) = hash_file(file_path_buf.as_path()).await.unwrap();
                
                let file = cyfs_base::File::new(
                    ObjectId::default(),
                    len,
                    hash,
                    ChunkList::ChunkInList(chunkids)
                ).no_create_time().build();
                let hash_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_hash_time) as u32;
                log::info!("hash file success filesize = {},hash time = {}",file_size.clone(),hash_time);
                let begin_set_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                //(3.3) 将文件保存到 ndc ，bdt该部分代码使用的是原始文件做cache,没有保存单独的chunk
                cyfs_bdt::download::track_file_in_path(&*stack_RN, file.clone(), file_path_buf.clone()).await.unwrap();
                let set_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_set_time) as u32;
                log::info!("set file success filesize = {},set time = {}",file_size.clone(),cal_time);
                
                // (3.4) 构建文件下载参数
                let mut src = Vec::new();
                src.push(stack_RN.local_device_id().clone());
                let save_path = PathBuf::from_str(save_dir).unwrap().join(file_name);
                let remote_id = stack_RN.local_device_id();
                let remote = stack_RN.local();
                let _ = stack_LN.device_cache().add(&remote_id, &remote);
                // (3.5) 调用文件下载接口
                let begin_download_time = system_time_to_bucky_time(&std::time::SystemTime::now());
                let task = cyfs_bdt::download::download_file_to_path(&stack_LN, 
                    file.clone(),
                    None, 
                    Some(SingleDownloadContext::streams(None, src)) , 
                    save_path.as_path()).await.unwrap();
                while true {
                    let state =  match task.state() {
                        DownloadTaskState::Downloading(speed, progress) => {
                            log::info!("Downloading file speed={},progress={}",speed,progress);
                            "downloading"
                        },
                        DownloadTaskState::Finished => {
                            "finished"
                        },
                        DownloadTaskState::Paused => "paused",
                        DownloadTaskState::Error(code) =>{
                            log::info!("Downloading file error code = {}",code);
                            "error"
                        },
                        _ => "unkown",
                    };
                    if state == "finished" {
                        log::info!("download file success");
                        break;
                    }
                    if state == "error" {
                        log::info!("download file failed");
                        break;
                    }
                    stack_manager.sleep(1).await;
                }    
                
                let download_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_download_time) as u32;
                log::info!("download file success ,filesize = {}, download total time = {}",file_size.clone(),download_time);
            }
            // (4) 执行完成等待退出
            stack_manager.destory_all().await;
            stack_manager.sleep(10).await;
        }).await;
        
    }

}