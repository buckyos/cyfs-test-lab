use cyfs_base::*;
use rust_bdt::{StreamGuard};
use async_std::io::prelude::{ReadExt, WriteExt};

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

            let _ = self.stream.write_all(&send_buffer[0..gen_count]).await.map_err(|e| {
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
            Self::random_data(send_buffer[0..].as_mut());
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
}