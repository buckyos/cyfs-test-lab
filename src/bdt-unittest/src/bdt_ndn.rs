use cyfs_base::*;
use bytes::Bytes;
use cyfs_util::cache::*;
use cyfs_bdt::*;
use cyfs_bdt::download::*;
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
    future, stream::StreamExt, 
};
use actix_rt;
use std::*;


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

    pub fn is_task_exists(&self, file_name: &str) -> bool {
        self.tasks_map.contains_key(file_name)
    }

    pub fn get_task_state(&self, file_name: &str) -> Option<DownloadTaskState> {
        let task = self.get_task(file_name);
        if task.is_some() {
            Some(task.unwrap().task.state())
        } else {
            None
        }
    }

    pub fn get_task(&self, file_name: &str) -> Option<FileTask> {
        self.tasks_map.get(file_name).map(|v| v.clone())
    }

    pub fn add_task(&mut self, file_name: &str, download_file_task: Arc<Box<dyn DownloadTask>>) -> BuckyResult<()> {
        match self.tasks_map.entry(file_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = FileTask { 
                    task: download_file_task
                };
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "download file task already exists: {}",
                    file_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_task(&mut self, file_name: &str) -> Option<Arc<Box<dyn DownloadTask>>> {
        self.tasks_map.remove(file_name).map(|v| v.task)
    }
}




// pub struct DirTask {
//     task: Arc< DirTaskPathControl>,
// }

// pub struct DirTaskMap {
//     tasks_map: HashMap<String, DirTask>,
// }

// impl DirTaskMap {
//     pub fn new() -> Self {
//         Self {
//             tasks_map: HashMap::new(),
//         }
//     }

//     pub fn is_task_exists(&self, file_name: &str) -> bool {
//         self.tasks_map.contains_key(file_name)
//     }
//     pub fn get_task(&self, file_name: &str) -> Option<&DirTask> {
//         self.tasks_map.get(file_name).map(|v| v.clone())
//     }


//     pub fn add_task(&mut self, file_name: &str, download_file_task: Arc<DirTaskPathControl>) -> BuckyResult<()> {
//         match self.tasks_map.entry(file_name.to_owned()) {
//             hash_map::Entry::Vacant(v) => {
//                 let info = DirTask { 
//                     task: download_file_task
//                 };
//                 v.insert(info);
//                 Ok(())
//             }
//             hash_map::Entry::Occupied(_) => {
//                 let msg = format!(
//                     "download file task already exists: {}",
//                     file_name,
//                 );

//                 Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
//             }
//         }
//     }

//     pub fn remove_task(&mut self, file_name: &str) -> Option<Arc< DirTaskPathControl>> {
//         self.tasks_map.remove(file_name).map(|v| v.task)
//     }
// }
