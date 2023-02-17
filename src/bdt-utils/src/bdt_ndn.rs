use async_std::{fs::File, future, io::prelude::*, stream::StreamExt, sync::Arc, task};
use bytes::Bytes;
use cyfs_base::*;
use cyfs_bdt::*;
use cyfs_util::cache::*;
use std::*;
use std::{
    borrow::Cow,
    collections::{hash_map, BTreeSet, HashMap},
    convert::TryFrom,
    io::{Read, Write},
    path::{Path, PathBuf},
    str::FromStr,
    sync::Mutex,
    time::{Duration, Instant},
};

/**
 * File Download Task
 */
#[derive(Clone)]
pub struct FileTask {
    task: Arc<Box<dyn DownloadTask>>,
}

pub struct FileTaskMap {
    tasks_map: HashMap<String, FileTask>,
}

impl FileTaskMap {
    pub fn new() -> Self {
        Self {
            tasks_map: HashMap::new(),
        }
    }

    pub fn is_task_exists(&self, task_name: &str) -> bool {
        self.tasks_map.contains_key(task_name)
    }

    pub fn get_task_state(&self, task_name: &str) -> Option<(NdnTaskState,u32,u64)> {
        let task = self.get_task(task_name);
        if task.is_some() {
            let task = task.unwrap().task;
            Some((task.state(),task.cur_speed(),task.transfered()))
        } else {
            None
        }
    }

    pub fn get_task(&self, task_name: &str) -> Option<FileTask> {
        self.tasks_map.get(task_name).map(|v| v.clone())
    }

    pub fn add_task(
        &mut self,
        task_name: &str,
        download_file_task: Arc<Box<dyn DownloadTask>>,
    ) -> BuckyResult<()> {
        match self.tasks_map.entry(task_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = FileTask {
                    task: download_file_task,
                };
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!("download file task already exists: {}", task_name,);

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_task(&mut self, task_name: &str) -> Option<Arc<Box<dyn DownloadTask>>> {
        self.tasks_map.remove(task_name).map(|v| v.task)
    }
}

pub async fn calculate_file(path_str: String, chunk_size: usize)-> BuckyResult<(cyfs_base::File,u32,PathBuf)> {
    let path = PathBuf::from_str(path_str.as_str()).map_err(|e| {
        log::error!("convert file path error, path = {}", path_str);
        e
    }).unwrap();
    if path.as_path().exists() == false{
       return Err(BuckyError::new(BuckyErrorCode::InvalidParam, "file path error"))
    }
    let begin_calculate_time = system_time_to_bucky_time(&std::time::SystemTime::now());
    let chunkids = {
        let mut chunkids = Vec::new();
        let mut file = async_std::fs::File::open(path.as_path()).await.unwrap();
        loop {
            let mut buf = vec![0u8; chunk_size];
            let len = file.read(&mut buf).await.unwrap();
            if len < chunk_size {
                buf.truncate(len);
                let hash = hash_data(&buf[..]);
                let chunkid = ChunkId::new(&hash, buf.len() as u32);
                chunkids.push(chunkid);
                break;
            } else {
                let hash = hash_data(&buf[..]);
                let chunkid = ChunkId::new(&hash, buf.len() as u32);
                chunkids.push(chunkid);
            }
        }
        chunkids
    };
    let (hash, len) = hash_file(path.as_path()).await.unwrap();
    let file = cyfs_base::File::new(
        ObjectId::default(),
        len,
        hash,
        ChunkList::ChunkInList(chunkids),
    )
    .no_create_time()
    .build();
    let calculate_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_calculate_time) as u32;
    Ok((file,calculate_time,path))
}




pub async fn calculate_chunk(path_str: String, chunk_size: usize)-> BuckyResult<(cyfs_base::ChunkId,u32,Vec<u8>)> {
    let path = PathBuf::from_str(path_str.as_str()).map_err(|e| {
        log::error!("convert file path error, path = {}", path_str);
        e
    }).unwrap();
    if path.as_path().exists() == false{
       return Err(BuckyError::new(BuckyErrorCode::InvalidParam, "file path error"))
    }
    let begin_calculate_time = system_time_to_bucky_time(&std::time::SystemTime::now());
    let mut content = async_std::fs::File::open(path.as_path()).await.unwrap();
    let mut buf = vec![0u8; chunk_size];
    let _ = content.read(&mut buf).await.unwrap();
    match ChunkId::calculate(&buf).await {
        Ok(chunk_id) => {
            let calculate_time = (system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_calculate_time) as u32;
            Ok((chunk_id,calculate_time,buf)) 
        },
        Err(e) => {
            log::error!("set-chunk failed, e={}", &e);
            return Err(BuckyError::new(BuckyErrorCode::InvalidParam, "ChunkId calculate error"))
        }
    } 
}



pub async fn chunk_check(
    reader: &mut (dyn cyfs_util::AsyncReadWithSeek + Unpin + Send + Sync),
    chunkid: ChunkId,
) -> BuckyResult<ChunkState> {
    let mut content = vec![0u8; chunkid.len()];
    let _ = reader.read(content.as_mut_slice()).await?;
    let check_id = ChunkId::calculate(content.as_slice()).await?;

    if check_id == chunkid {
        Ok(ChunkState::Ready)
    } else {
        Ok(ChunkState::OnAir)
    }
}