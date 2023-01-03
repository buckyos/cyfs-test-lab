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
use bdt_utils::*;


#[cfg(test)]

mod tests {
    use std::fmt::format;

    use sha2::Sha512Trunc224;

    use super::*;
    #[tokio::test]
    async fn create_test_device1() {
        run_test_async("create_test_device", async{
            let mut eps = Vec::new();
            eps.push("W4udp192.168.200.207:9060".to_string());
            eps.push("W4tcp192.168.200.207:9060".to_string());
            eps.push("W6udp[fd94:e4ba:ba8e:a100:2e0:4cff:fe6f:269d]:9061".to_string());
            eps.push("W6tcp[fd94:e4ba:ba8e:a100:2e0:4cff:fe6f:269d]:9061".to_string());
            let private_key = PrivateKey::generate_rsa(1024).unwrap();
            let area = Area::from_str("44:0:0:1").unwrap();
            let save_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device7,key7) = create_device("sn-miner-cn",&eps,&Vec::new(),&Vec::new(),&area,&private_key,Some(save_path)).await;
        }).await
        
    }
    #[tokio::test]
    async fn create_test_device2() {
        run_test_async("create_test_device", async{
            let mut eps = Vec::new();
            eps.push("W4udp192.168.200.181:7060".to_string());
            eps.push("W4tcp192.168.200.181:7060".to_string());
            eps.push("W6udp[fd94:e4ba:ba8e:a100:2e0:4cff:fe48:3125]:7061".to_string());
            eps.push("W6tcp[fd94:e4ba:ba8e:a100:2e0:4cff:fe48:3125]:7061".to_string());
            let private_key = PrivateKey::generate_rsa(1024).unwrap();
            let area = Area::from_str("226:0:0:1").unwrap();
            let save_path = PathBuf::from_str("E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config").unwrap();
            let (device7,key7) = create_device("sn-miner-un",&eps,&Vec::new(),&Vec::new(),&area,&private_key,Some(save_path)).await;
        }).await
        
    }
    #[tokio::test]
    async fn show_desc_info1() {
        run_test_async("show_desc_info", async{
            let save_path = PathBuf::from_str("E:\\BDT\\config\\lab_pn").unwrap();
            let  (device7,key7) = load_device(&save_path,"sn-miner").await;
            let mut device7 = device7;
            for ep in device7.mut_connect_info().mut_endpoints(){
                log::info!("{}",ep);
            }
            assert!(false);
        }).await
        
    }
    #[tokio::test]
    async fn show_desc_info2() {
        run_test_async("show_desc_info", async{
            let save_path = PathBuf::from_str("E:\\BDT\\config\\lab_snpn").unwrap();
            let  (device7,key7) = load_device(&save_path,"sn-miner").await;
            let mut device7 = device7;
            for ep in device7.mut_connect_info().mut_endpoints(){
                log::info!("{}",ep);
            }
        }).await
        
    }
    

}