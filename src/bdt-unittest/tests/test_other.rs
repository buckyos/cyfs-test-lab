// use cyfs_base::*;
// use bytes::Bytes;
// use cyfs_util::cache::{
//     NamedDataCache, 
//     TrackerCache
// };
// use cyfs_bdt::{
//     Stack, 
//     StackGuard, 
//     StreamListenerGuard, 
//     BuildTunnelParams, 
//     TempSeqGenerator, 
//     StreamGuard,
//     DownloadTask, 
//     DownloadTaskState, 
//     StackOpenParams, 
//     SingleDownloadContext, 
//     //download::DirTaskPathControl,
//     local_chunk_store::LocalChunkWriter,
//     local_chunk_store::LocalChunkListWriter,
//     local_chunk_store::LocalChunkReader,
//     mem_tracker::MemTracker,
//     mem_chunk_store::MemChunkStore,
//     //ChunkWriter,
//     ChunkWriterExt,
//     ChunkListDesc
// };

// use std::{
//     str::FromStr, 
//     path::{Path, PathBuf}, 
//     io::{Read, Write}, 
//     sync::{Mutex}, 
//     time::{Duration, Instant},
//     collections::{HashMap,hash_map,BTreeSet},
//     convert::TryFrom,
//     borrow::Cow,
    
// };
// use async_std::{
//     sync::Arc, 
//     task, 
//     fs::File, 
//     io::prelude::*,
//     future, 
// };
// use actix_rt;
// use std::*;


// use bdt_unittest::*;

// #[cfg(test)]

// mod tests {
//     use super::*;
//     #[tokio::test]
//     async fn test_rust_001() {
//         run_test_async("", async{
//             use rand::Rng;
//             const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
//                                     abcdefghijklmnopqrstuvwxyz\
//                                     0123456789)(*&^%$#@!~";
//             const PASSWORD_LEN: usize = 30;
//             let mut rng = rand::thread_rng();

//             let password: String = (0..PASSWORD_LEN)
//                 .map(|_| {
//                     let idx = rng.gen_range(0, CHARSET.len());
//                     // 这是安全的，因为 `idx` 会在 `CHARSET` 的范围内。
//                     char::from(unsafe { *CHARSET.get_unchecked(idx) }) // 来自用户的所有输入，最好都定义为不安全的。
//                 })
//                 .collect();
//             log::info!("{}",password)
//         }).await    
//     }
// }
