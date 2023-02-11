
use cyfs_base::*;
use cyfs_bdt::*;
use std::{
    path::{ PathBuf}, 
    io::{Read, Write}, 
    collections::{HashMap,hash_map},
};
use async_std::{
    io::prelude::*,
};


const PIECE_SIZE: usize = 1024*1024;
const FILE_SIZE_LEN: usize = 8;
#[derive(Clone)]
pub struct StreamMap {
    tasks_map: HashMap<String, BDTConnection>,
}
impl StreamMap {
    pub fn new() -> Self {
        Self {
            tasks_map: HashMap::new(),
        }
    }
    pub fn is_task_exists(&self, stream_name: &str) -> bool {
        self.tasks_map.contains_key(stream_name)
    }
    pub fn get_task(&self, stream_name: &str) -> BDTConnection {
        log::info!("client get stream {}",stream_name.clone());
        self.tasks_map.get(stream_name).map(|v| v).unwrap().clone()
    }
    pub fn find_task(&self, stream_id: &str) -> Option<BDTConnection> {
        log::info!("client find stream {}",stream_id.clone());
        for stream in self.tasks_map.values(){
            if stream.get_name().contains(stream_id){
                return Some(stream.clone())
            }
        }
        None
    }
    pub fn add_task(&mut self, stream_name: &str, stream_task: StreamGuard) -> BuckyResult<()> {
        log::info!("client cache stream {}",stream_name.clone());
        match self.tasks_map.entry(stream_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let info = BDTConnection { 
                    stream: stream_task
                };
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!(
                    "stream name already exists: {}",
                    stream_name,
                );

                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_task(&mut self, stream_name: &str) -> Option<StreamGuard> {
        self.tasks_map.remove(stream_name).map(|v| v.stream)
    }

}
#[derive(Clone)]
pub struct BDTConnection {
    stream:  StreamGuard,
}

impl BDTConnection {
    pub fn get_stream(&self)->&StreamGuard {
        &self.stream
    }
    // pub fn get_remote(&self)->&StreamGuard {
    //     &self.stream.remote()
    // }
    pub fn get_name(&self)->String{
        format!("{}", self.stream)
    }
    pub async fn send_stream(&mut self, size: u64) -> Result<(HashValue, u64), BuckyError> {
        if (size < 8) {
            log::warn!("bdt tool send data piece size = {},must be more than 8 bytes", size);
        }
        let mut hashs = Vec::<HashValue>::new();
        let mut send_buffer = Vec::new();
        send_buffer.resize(PIECE_SIZE, 0u8);
        let mut gen_count = PIECE_SIZE;
        let mut size_need_to_send = size;
        if gen_count as u64 > size_need_to_send {
            gen_count = size_need_to_send as usize;
        }
        // 构造请求头部协议，设置发送数据长度
        send_buffer[0..8].copy_from_slice(&size_need_to_send.to_be_bytes());

        // 生成测试数据 计算hash
        Self::random_data(send_buffer[8..].as_mut());
        let hash = hash_data(&send_buffer[0..gen_count]);
        hashs.push(hash);
        log::info!("########## hash {}", hash);
        let begin_send = system_time_to_bucky_time(&std::time::SystemTime::now());
        loop {
            log::info!("bdt tool {} send data piece size = {}" ,self.get_name(), gen_count);
            let result_err = self
                .stream
                .write_all(&send_buffer[0..gen_count])
                .await
                .map_err(|e| {
                    log::error!("send file failed, e={}", &e);
                    e
                });

            let _ = match result_err {
                Err(_) => break,
                Ok(_) => {}
            };
            //size_need_to_send减去发送的数据
            size_need_to_send -= gen_count as u64;
            //size_need_to_send 为 0 退出循环
            if size_need_to_send == 0 {
                break;
            }
            gen_count = PIECE_SIZE;
            if gen_count as u64 > size_need_to_send {
                gen_count = size_need_to_send as usize;
                let hash_end = hash_data(&send_buffer[0..gen_count as usize]);
                hashs.push(hash_end);
                log::info!("########## hash {}", hash_end);
            } else {
                hashs.push(hash.clone());
                log::info!("########## hash {}", hash);
            }
        }
        let send_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_send;

        if size_need_to_send > 0 {
            return Err(BuckyError::new(
                BuckyErrorCode::ConnectionReset,
                "remote close",
            ));
        }
        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());

        log::info!("send file finish, size ={} ,hash={:?}", size, &hash);

        Ok((hash, send_time))
    }
    pub async fn recv_stream(&mut self) -> Result<(u64, u64, HashValue), BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut recv_buffer = Vec::new();
        recv_buffer.resize(PIECE_SIZE, 0u8);
        let mut piece_recv: usize = 0;
        let mut file_size: u64 = 0;
        let mut total_recv: u64 = 0;
        // let mut recv_time = 0;
        let begin_recv = system_time_to_bucky_time(&std::time::SystemTime::now());
        let recv_time = loop {
            let len = self
                .stream
                .read(recv_buffer[piece_recv..].as_mut())
                .await
                .map_err(|e| {
                    log::error!("{} recv failed, e={}" ,self.get_name(), &e);
                    e
                })?;
            log::info!("{} bdt tool recv data piece size = {}" ,self.get_name(), len);
            if len == 0 {
                log::error!("remote close");
                return Err(BuckyError::new(
                    BuckyErrorCode::ConnectionReset,
                    "remote close",
                ));
            }
            piece_recv += len;
            total_recv += len as u64;

            if file_size == 0 {
                if piece_recv < FILE_SIZE_LEN {
                    continue;
                }
                let mut b = [0u8; FILE_SIZE_LEN];
                b.copy_from_slice(&recv_buffer[0..FILE_SIZE_LEN]);
                file_size = u64::from_be_bytes(b);
                log::info!(
                    "===================================== {} pre recv stream,file_size={}" ,self.get_name(),
                    file_size
                );
                if file_size > 100 * 1024 * 1024 * 1024 {
                    return Err(BuckyError::new(
                        BuckyErrorCode::ConnectionReset,
                        "error file_size",
                    ));
                }
            }
            if file_size > 0 {
                if total_recv == file_size || piece_recv == PIECE_SIZE {
                    let recv_hash = hash_data(&recv_buffer[0..piece_recv].as_ref());
                    hashs.push(recv_hash);
                }

                if total_recv == file_size {
                    log::info!(" =====================================recv finish{}",self.get_name());
                    let recv_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_recv;
                    break recv_time;
                }
            }
            if piece_recv == PIECE_SIZE {
                piece_recv = 0;
            }
        };

        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());
        log::info!("recv file finish,size = {} hash={:?}", file_size, &hash);
        Ok((file_size, recv_time, hash))
    }


    pub fn shutdown(&mut self,shutdown_str:&str)-> Result<(), std::io::Error>{
        let shutdown_type = match shutdown_str {
            "Both" =>std::net::Shutdown::Both,
            "Read" =>std::net::Shutdown::Read,
            "Write" =>std::net::Shutdown::Write,
             _ => std::net::Shutdown::Both
        };
        self.stream.shutdown(shutdown_type) 
    }

    pub async fn send_object(
        &mut self,
        obj_type: u64,
        obj_path: PathBuf,
    ) -> Result<HashValue, BuckyError> {
        let mut file = std::fs::File::open(obj_path).unwrap();
        let mut buf = Vec::<u8>::new();
        let _ = file.read_to_end(&mut buf)?;
        let size = buf.len();
        //let (device, _) = Device::raw_decode(buf.as_slice())?;
        let mut hashs = Vec::<HashValue>::new();
        let mut send_buffer = Vec::new();
        send_buffer.resize(16, 0u8);
        let mut size_need_to_send = (size + 16) as u64;
        send_buffer[0..8].copy_from_slice(&size_need_to_send.to_be_bytes());
        send_buffer[8..16].copy_from_slice(&obj_type.to_be_bytes());
        send_buffer.extend(buf.iter().copied());
        //Self::random_data(send_buffer[8..].as_mut());
        let mut gen_count = PIECE_SIZE;
        if gen_count as u64 > size_need_to_send {
            gen_count = size_need_to_send as usize;
        }
        let mut index = 0;
        loop {
            let begin = index * PIECE_SIZE;
            let end = index * PIECE_SIZE + gen_count;
            index = index + 1;
            let hash = hash_data(&send_buffer[..end]);
            hashs.push(hash);
            let _ = self
                .stream
                .write_all(&send_buffer[begin..end])
                .await
                .map_err(|e| {
                    log::error!("send file failed, e={}", &e);
                    e
                });
            size_need_to_send -= gen_count as u64;
            if size_need_to_send == 0 {
                break;
            }
            gen_count = PIECE_SIZE;
            if gen_count as u64 > size_need_to_send {
                gen_count = size_need_to_send as usize;
            }
        }

        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());
        log::info!("send file finish, hash={:?}", &hash);
        Ok(hash)
    }
    pub fn random_data(buffer: &mut [u8]) {
        let len = buffer.len();
        let mut gen_count = 0;
        while len - gen_count >= 8 {
            let r = rand::random::<u64>();
            buffer[gen_count..gen_count + 8].copy_from_slice(&r.to_be_bytes());
            gen_count += 8;
        }

        while len - gen_count > 0 {
            let r = rand::random::<u8>();
            buffer[gen_count..gen_count + 1].copy_from_slice(&r.to_be_bytes());
            gen_count += 1;
        }
    }

    pub async fn recv_object(
        &mut self,
        obj_path: PathBuf,
        file_name: Option<String>,
    ) -> Result<(u64, HashValue, String), BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut recv_buffer = Vec::new();
        recv_buffer.resize(PIECE_SIZE, 0u8);
        let mut piece_recv: usize = 0;
        let mut file_size: u64 = 0;
        let mut total_recv: u64 = 0;
        let mut obj_type: u64 = 0;
        let mut file_buffer = Vec::<u8>::new();
        loop {
            let len = self
                .stream
                .read(recv_buffer[piece_recv..].as_mut())
                .await
                .map_err(|e| {
                    log::error!("recv failed, e={}", &e);
                    e
                })?;
            log::info!("====recv object ,recv len ={}", len);
            file_buffer.extend(recv_buffer.iter().copied());
            if len == 0 {
                log::error!("remote close");
                return Err(BuckyError::new(
                    BuckyErrorCode::ConnectionReset,
                    "remote close",
                ));
            }
            piece_recv += len;
            total_recv += len as u64;
            if file_size == 0 {
                if piece_recv < FILE_SIZE_LEN {
                    continue;
                }
                let mut b = [0u8; FILE_SIZE_LEN];
                b.copy_from_slice(&recv_buffer[0..FILE_SIZE_LEN]);
                file_size = u64::from_be_bytes(b);
                log::info!(
                    "=====================================file_size={}",
                    file_size
                );
                if file_size > 100 * 1024 * 1024 * 1024 {
                    return Err(BuckyError::new(
                        BuckyErrorCode::ConnectionReset,
                        "error file_size",
                    ));
                }
                let mut c = [0u8; FILE_SIZE_LEN];
                c.copy_from_slice(&recv_buffer[8..16]);
                obj_type = u64::from_be_bytes(c);
                log::info!(
                    "===================================== obj_type={}",
                    obj_type
                );
            }

            if file_size > 0 {
                if total_recv == file_size || piece_recv == PIECE_SIZE {
                    let recv_hash = hash_data(&recv_buffer[0..piece_recv].as_ref());
                    hashs.push(recv_hash);
                }

                if total_recv == file_size {
                    log::info!("=====================================recv finish");
                    break;
                }
            }

            if piece_recv == PIECE_SIZE {
                piece_recv = 0;
            }
        }

        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());
        let mut object_id = hash.to_string();
        log::info!("recv object finish, hash={:?}", &hash);
        if obj_type == 1 {
            let (device_obj, _) =
                cyfs_base::Device::raw_decode(file_buffer[16..total_recv as usize].as_mut())
                    .unwrap();
            let file_id = match file_name {
                Some(name) => name,
                _ => {
                    format!("{}.device", device_obj.desc().calculate_id())
                }
            };

            object_id = device_obj.desc().calculate_id().to_string();
            let file_obj_path = obj_path.clone().join(file_id);
            match device_obj.encode_to_file(file_obj_path.clone().as_path(), true) {
                Ok(_) => {
                    log::info!(
                        "succ encode file obj to {}",
                        file_obj_path.clone().display()
                    );
                }
                Err(e) => {
                    log::error!("encode file obj to file failed, err {}", e);
                }
            }
        } else if obj_type == 2 {
            let (file_obj, _) =
                cyfs_base::File::raw_decode(file_buffer[16..total_recv as usize].as_mut()).unwrap();
            let file_id = format!("{}", file_obj.desc().calculate_id());
            object_id = file_id.clone().to_string();
            let file_obj_path = obj_path
                .clone()
                .join("file_obj")
                .join(file_id.to_string().as_str());
            match file_obj.encode_to_file(file_obj_path.clone().as_path(), true) {
                Ok(_) => {
                    log::info!(
                        "succ encode file obj to {}",
                        file_obj_path.clone().display()
                    );
                }
                Err(e) => {
                    log::error!(
                        "encode file obj to file failed,path = {},err {}",
                        file_obj_path.display(),
                        e
                    );
                }
            }
        } else if obj_type == 3 {
            let (dir_obj, _) =
                match cyfs_base::Dir::raw_decode(file_buffer[16..total_recv as usize].as_mut()) {
                    Ok((dir_obj, dir_raw)) => Ok((dir_obj, dir_raw)),
                    Err(e) => {
                        log::error!("decode dir object failed! , {}", e);
                        let file_obj_path = obj_path
                            .clone()
                            .join("dir_obj")
                            .join(hash.to_string().as_str());
                        let mut file = std::fs::File::create(file_obj_path).unwrap();
                        let _ = file.write_all(&file_buffer[16..total_recv as usize]);
                        Err(e)
                    }
                }
                .unwrap();
            let dir_id = format!("{}", dir_obj.desc().calculate_id());
            object_id = dir_id.clone().to_string();
            let file_obj_path = obj_path
                .clone()
                .join("dir_obj")
                .join(dir_id.to_string().as_str());
            match dir_obj.encode_to_file(file_obj_path.clone().as_path(), true) {
                Ok(_) => {
                    log::info!("succ encode dir obj to {}", file_obj_path.clone().display());
                }
                Err(e) => {
                    log::error!("encode dir obj to file failed, err {}", e);
                }
            }
        } else if obj_type == 4 {
            let file_obj_path = obj_path
                .clone()
                .join("dir_map")
                .join(hash.to_string().as_str());
            let mut file = std::fs::File::open(file_obj_path.clone()).map_err(|e| {
                log::error!(
                    "open key file failed on create, path={:?}, e={}",
                    file_obj_path.display(),
                    &e
                );
                e
            })?;
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf)?;
        } else {
            return Err(BuckyError::new(
                BuckyErrorCode::ConnectionReset,
                "unknow obj_type",
            ));
        }

        Ok((file_size, hash, object_id))
    }

}