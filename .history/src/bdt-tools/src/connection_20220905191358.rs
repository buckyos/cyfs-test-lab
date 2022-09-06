use cyfs_base::*;
use cyfs_bdt::{StreamGuard};
use async_std::io::prelude::{ReadExt, WriteExt};
use std::{
    path::{Path, PathBuf}, 
    io::{Read, Write}, 
};
use async_std::{
    sync::Arc, 
    task, 
    fs::File, 
    io::prelude::*
};
#[derive(Clone)]
pub struct TestConnection {
    stream: StreamGuard,
    name: String,
}

const PIECE_SIZE: usize = 1024*1024;
const FILE_SIZE_LEN: usize = 8;

impl TestConnection {
    pub fn new(stream: StreamGuard, name: String)->Self {
        Self {
            stream,
            name,
        }
    }

    pub fn get_name(&self)->&String {
        &self.name
    }

    pub fn get_stream(&self)->StreamGuard {
        self.stream.clone()
    }

    pub async fn send_file(&mut self, size: u64) -> Result<HashValue, BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut send_buffer = Vec::new();
        send_buffer.resize(PIECE_SIZE, 0u8);
        let mut gen_count = PIECE_SIZE;
        let mut size_need_to_send = size + 8;
        if gen_count as u64 > size_need_to_send {
            gen_count = size_need_to_send as usize;
        }
        send_buffer[0..8].copy_from_slice(&size_need_to_send.to_be_bytes());
        Self::random_data(send_buffer[8..].as_mut());

        loop {
            let hash = hash_data(&send_buffer[0..gen_count]);
            hashs.push(hash);
            
            let result_err = self.stream.write_all(&send_buffer[0..gen_count]).await.map_err(|e| {
                log::error!("send file failed, e={}",&e);
                e
            });
            
            let _ = match result_err{
                Err(_)=>{break},
                Ok(_)=>{}
            };
            size_need_to_send -= gen_count as u64;

            if size_need_to_send == 0 {
                break;
            }

            gen_count = PIECE_SIZE;
            if gen_count as u64 > size_need_to_send {
                gen_count = size_need_to_send as usize;
            }
            Self::random_data(send_buffer[0..].as_mut());
        }
        if size_need_to_send > 0 {
            return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "remote close"));
        }
        let mut total_hash = Vec::new();
        for h in hashs.iter() {
            total_hash.extend_from_slice(h.as_slice());
        }
        let hash = hash_data(total_hash.as_slice());

        log::info!("send file finish, hash={:?}", &hash);

        Ok(hash)
    }
    pub async fn send_object(&mut self, obj_type:u64,obj_path:PathBuf) -> Result<HashValue, BuckyError> {
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
            let  begin = index * PIECE_SIZE;
            let  end = index * PIECE_SIZE + gen_count;
            index = index + 1;
            let hash = hash_data(&send_buffer[ ..end]);
            hashs.push(hash);
            let _ = self.stream.write_all(&send_buffer[begin..end]).await.map_err(|e| {
                log::error!("send file failed, e={}",&e);
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

    pub async fn recv_file(&mut self) -> Result<(u64, HashValue), BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut recv_buffer = Vec::new();
        recv_buffer.resize(PIECE_SIZE, 0u8);
        let mut piece_recv: usize = 0;
        let mut file_size: u64 = 0;
        let mut total_recv: u64 = 0;
        loop {
            let len = self.stream.read(recv_buffer[piece_recv..].as_mut()).await.map_err(|e| {
                log::error!("recv failed, e={}", &e);
                e
            })?;
            if len == 0 {
                log::error!("remote close");
                return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "remote close"));
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
                log::info!("=====================================file_size={}", file_size);
                if(file_size>100*1024*1024*1024){
                    return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "error file_size"))
                }
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
        log::info!("recv file finish, hash={:?}", &hash);
        Ok((file_size, hash))
    }
    pub async fn recv_object(&mut self, obj_path:PathBuf) -> Result<(u64, HashValue,String), BuckyError> {
        let mut hashs = Vec::<HashValue>::new();
        let mut recv_buffer = Vec::new();
        recv_buffer.resize(PIECE_SIZE, 0u8);
        let mut piece_recv: usize = 0;
        let mut file_size: u64 = 0;
        let mut total_recv: u64 = 0;
        let mut obj_type:u64 = 0;
        let mut file_buffer = Vec::<u8>::new();
        loop {
            let len = self.stream.read(recv_buffer[piece_recv..].as_mut()).await.map_err(|e| {
                log::error!("recv failed, e={}", &e);
                e
            })?;
            log::info!("====recv object ,recv len ={}", len);
            file_buffer.extend(recv_buffer.iter().copied());
            if len == 0 {
                log::error!("remote close");
                return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "remote close"));
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
                log::info!("=====================================file_size={}", file_size);
                if(file_size>100*1024*1024*1024){
                    return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "error file_size"))
                }
                let mut c = [0u8; FILE_SIZE_LEN];
                c.copy_from_slice(&recv_buffer[8..16]);
                obj_type = u64::from_be_bytes(c);
                log::info!("===================================== obj_type={}", obj_type);
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
        if obj_type == 2{
            let (file_obj,file_raw) = cyfs_base::File::raw_decode(file_buffer[16..total_recv as usize].as_mut()).unwrap();
            let file_id = file_obj.desc().calculate_id();
            object_id  = file_id.clone().to_string();
            let file_obj_path =  obj_path.clone().join("file_obj").join(file_id.to_string().as_str());
            match file_obj.encode_to_file(file_obj_path.clone().as_path(),true){
                Ok(_) => {
                    log::info!("succ encode file obj to {}", file_obj_path.clone().display());
                },
                Err(e) => {
                    log::error!("encode file obj to file failed, err {}", e);
                },
            }
        }else if obj_type == 3 {
            let (dir_obj,dir_raw) = match cyfs_base::Dir::raw_decode(file_buffer[16..total_recv as usize].as_mut()){
                Ok((dir_obj, dir_raw)) => {
                    Ok((dir_obj, dir_raw))
                },
                Err(e) => {
                    log::error!("decode dir object failed! , {}", e);
                    let file_obj_path =  obj_path.clone().join("dir_obj").join(hash.to_string().as_str());
                    let mut file = std::fs::File::create(file_obj_path).unwrap();
                    file.write_all( &file_buffer[16..total_recv as usize]);
                    Err(e)
                }
            }.unwrap();
            let dir_id = dir_obj.desc().calculate_id();
            object_id  = dir_id.clone().to_string();
            let file_obj_path =  obj_path.clone().join("dir_obj").join(dir_id.to_string().as_str());
            match dir_obj.encode_to_file(file_obj_path.clone().as_path(),true){
                Ok(_) => {
                    log::info!("succ encode dir obj to {}", file_obj_path.clone().display());
                },
                Err(e) => {
                    log::error!("encode dir obj to file failed, err {}", e);
                },
            }
        }else if obj_type == 4 {
            let file_obj_path =  obj_path.clone().join("dir_map").join(hash.to_string().as_str());
            let mut file = std::fs::File::open(file_obj_path.clone()).map_err(|e| {
                log::error!("open key file failed on create, path={:?}, e={}", file_obj_path.display(), &e);
                e
            })?;
            let mut buf = Vec::<u8>::new();
            let _ = file.read_to_end(&mut buf)?;
           
        }else{
            return Err(BuckyError::new(BuckyErrorCode::ConnectionReset, "unknow obj_type"));
        }
        
        Ok((file_size, hash,object_id))
    }
}