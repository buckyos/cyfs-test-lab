use async_std::{future, stream::StreamExt, sync::Arc, task};
use cyfs_util::cache::{NamedDataCache, TrackerCache};
use cyfs_base::*;
use cyfs_bdt::*;
use std::{
    collections::{hash_map, HashMap},
    path::PathBuf,
    str::FromStr,
    sync::Mutex,
    time::Duration,
};

use crate::bdt_client::*;
use crate::bdt_stream::*;
use crate::tool::*;
use crate::{action_api::*, bdt_ndn::*};

pub struct BDTClientManager {
    BDTClient_map: HashMap<String, BDTClient>,
    temp_dir: PathBuf, //工作目录
    service_path: PathBuf,
    bdt_port_index: Mutex<u16>,
}

impl BDTClientManager {
    pub fn new(temp_dir: PathBuf, service_path: PathBuf, bdt_port_index: u16) -> Self {
        let mut peer_map = HashMap::new();
        Self {
            BDTClient_map: peer_map,
            temp_dir,
            service_path,
            bdt_port_index: Mutex::new(bdt_port_index),
        }
    }
    pub fn increase_bdt_port_index(&self) -> u16 {
        let mut bdt_port_index = self.bdt_port_index.lock().unwrap();
        *bdt_port_index = *bdt_port_index + 1;
        *bdt_port_index
    }
    pub fn is_client_exists(&self, peer_name: &str) -> bool {
        self.BDTClient_map.contains_key(peer_name)
    }
    pub fn add_client(
        &mut self,
        peer_name: &str,
        stack: StackGuard,
        acceptor: StreamListenerGuard,
        chunk_store : TrackedChunkStore,
    ) -> BuckyResult<()> {
        match self.BDTClient_map.entry(peer_name.to_owned()) {
            hash_map::Entry::Vacant(v) => {
                let client_path = self.temp_dir.clone().join(peer_name);
                let info = BDTClient::new(stack, acceptor,chunk_store, client_path, self.service_path.clone());
                v.insert(info);
                Ok(())
            }
            hash_map::Entry::Occupied(_) => {
                let msg = format!("bdt stack already exists: {}", peer_name,);
                Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
            }
        }
    }

    pub fn remove_client(&mut self, peer_name: &str) -> Option<BDTClient> {
        self.BDTClient_map.remove(peer_name).map(|v| v)
    }

    pub fn get_client(&self, peer_name: &str) -> BDTClient {
        return self
            .BDTClient_map
            .get(peer_name)
            .map(|v| v.clone())
            .unwrap();
    }

    pub async fn load_local_bdt_stack(
        &mut self,
        peer_name: &str,
        cache_path: &PathBuf,
        bdt_params: StackOpenParams,
        chunk_store:TrackedChunkStore,
    ) -> BuckyResult<(Device, PrivateKey, u64)> {
        let (device, key) = load_device(cache_path, peer_name).await;
        let mut params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(device.clone(), key.clone(), params).await;
        
        if let Err(e) = stack.clone() {
            log::error!("init bdt stack error: {}", e);
        }
        let stack = stack.unwrap();
        let acceptor = stack.stream_manager().listen(0).unwrap();
        match future::timeout(
            Duration::from_secs(20),
            stack.sn_client().ping().wait_online(),
        )
        .await
        {
            Err(err) => {
                log::error!(
                    "sn online timeout {}.err= {}",
                    device.desc().device_id(),
                    err
                );
                Err(BuckyError::new(
                    BuckyErrorCode::Timeout,
                    "sn online timeout",
                ))
            }
            Ok(online_result) => match online_result {
                Ok(state) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    if (state == SnStatus::Online) {
                        log::info!(
                            "device {} sn online success,time = {}",
                            device.desc().device_id(),
                            online_time
                        );
                        
                    } else {
                        log::error!("device {} not set sn list", device.desc().device_id());
                    }
                    match self.BDTClient_map.entry(peer_name.to_owned()) {
                        hash_map::Entry::Vacant(v) => {
                            let client_path = self.temp_dir.clone().join(peer_name);
                            let info = BDTClient::new(
                                stack,
                                acceptor,
                                chunk_store,
                                client_path,
                                self.service_path.clone(),
                            );
                            v.insert(info);
                            Ok((device, key, online_time))
                        }
                        hash_map::Entry::Occupied(_) => {
                            let msg = format!("bdt stack already exists: {}", peer_name,);

                            Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
                        }
                    }
                }
                Err(err) => Err(err),
            },
        }
    }

    pub async fn _create_stack(
        &mut self,
        peer_name: &str,
        endpoints: &Vec<String>,
        area: Area,
        sn_list: &Vec<Device>,
        passive_pn_list: &Vec<Device>,
        active_pn_list: &Vec<Device>,
        save_path: Option<PathBuf>,
        udp_sn_only: bool,
        chunk_cache:&str 
    ) -> BuckyResult<(StackGuard, u64)> {
        // 加载配置中的SN中的配置

        let private_key = PrivateKey::generate_rsa(1024).unwrap();
        let (device, key) = create_device(
            peer_name,
            endpoints,
            sn_list,
            passive_pn_list,
            &area,
            &private_key,
            save_path,
        )
        .await;
        // 配置启动配置
        let mut bdt_params = StackOpenParams::new(device.desc().device_id().to_string().as_str());
        // 已知Device 列表
        bdt_params.known_device = None; //
        bdt_params.known_sn = Some(sn_list.clone());
        bdt_params.active_pn = Some(active_pn_list.clone());
        bdt_params.passive_pn = Some(passive_pn_list.clone());
        bdt_params.config.interface.udp.sn_only = udp_sn_only;
        bdt_params.tcp_port_mapping = None;
        let chunk_store = match chunk_cache{
            "file" => {
                let tracker = MemTracker::new();
                TrackedChunkStore::new(
                    NamedDataCache::clone(&tracker),
                    TrackerCache::clone(&tracker),
                )
            }
            "mem" => {
                let tracker = MemTracker::new();
                TrackedChunkStore::new(
                    NamedDataCache::clone(&tracker),
                    TrackerCache::clone(&tracker),
                )
            }
            _ => unreachable!(),
        };
        bdt_params.chunk_store = Some(chunk_store.clone_as_reader());
        let begin_time = system_time_to_bucky_time(&std::time::SystemTime::now());
        let stack = Stack::open(device.clone(), private_key.clone(), bdt_params).await;
        if let Err(e) = stack.clone() {
            log::error!("{}init bdt stack error: {}", &peer_name, e);
        }
        let stack = stack.unwrap();
        let acceptor = stack.stream_manager().listen(0).unwrap();
        match future::timeout(
            Duration::from_secs(20),
            stack.sn_client().ping().wait_online(),
        )
        .await
        {
            Err(err) => {
                log::error!(
                    "sn online timeout {}.err= {}",
                    device.desc().device_id(),
                    err
                );
                Err(BuckyError::new(
                    BuckyErrorCode::Timeout,
                    "sn online timeout",
                ))
            }
            Ok(online_result) => match online_result {
                Ok(state) => {
                    let online_time = system_time_to_bucky_time(&std::time::SystemTime::now()) - begin_time;
                    if state == SnStatus::Online {
                        log::info!(
                            "device {} sn online success,time = {}",
                            device.desc().device_id(),
                            online_time
                        );
                        
                    }else if sn_list.len() == 0  {
                        log::error!("device {} not set sn list", device.desc().device_id());
                    }else{
                        log::error!("device {} sn online fail state = {}", device.desc().device_id(),state);
                        return  Err(BuckyError::new(BuckyErrorCode::Failed, "sn online fail")) ;
                    }
                    match self.BDTClient_map.entry(peer_name.to_owned()) {
                        hash_map::Entry::Vacant(v) => {
                            let client_path = self.temp_dir.clone().join(peer_name);
                            let info = BDTClient::new(
                                stack.clone(),
                                acceptor,
                                chunk_store,
                                client_path,
                                self.service_path.clone(),
                            );
                            v.insert(info);
                            Ok((stack, online_time))
                        }
                        hash_map::Entry::Occupied(_) => {
                            let msg = format!("bdt stack already exists: {}", peer_name,);
                            Err(BuckyError::new(BuckyErrorCode::AlreadyExists, msg))
                        }
                    }
                }
                Err(err) => Err(err),
            },
        }
    }

    pub async fn create_client(
        &mut self,
        req: &CreateStackReq,
    ) -> BuckyResult<(CreateStackResp, Option<Device>)> {
        let peer_name = req.peer_name.as_str();

        log::info!(
            "create new bdt client name  = {} , list len = {}",
            peer_name,
            self.BDTClient_map.len()
        );
        if (self.BDTClient_map.contains_key(&req.peer_name.clone())) {
            let msg = format!("bdt stack already exists: {}", &peer_name,);
            log::error!("{:?}", msg.clone());
            let client = self.BDTClient_map.get(&req.peer_name.clone()).unwrap();
            let mut local = client.get_stack().sn_client().ping().default_local();
            let online_sn_info = client.get_stack().sn_client().ping().sn_list().clone();
            let mut endpoints = client.get_stack().net_manager().listener().endpoints();
            let online_sn = device_list_to_string(&online_sn_info);
            let ep_info = endpoint_tree_to_string(&endpoints);
            let ep_resp = endpoint_tree_to_string(&endpoints);
            return Ok((
                CreateStackResp {
                    result: 0,
                    msg,
                    peer_name: peer_name.to_string(),
                    device_id: local.desc().device_id().to_string(),
                    online_time: 0,
                    online_sn,
                    ep_info,
                    ep_resp,
                },
                Some(local),
            ));
        }
        let mut eps = Vec::new();
        for addr in req.addrs.iter() {
            let ep = { format!("{}:{}", addr, self.increase_bdt_port_index()) };
            log::debug!("ep={} on create", &ep);
            eps.push(ep);
        }
        let area = Area::from_str(req.area.as_str()).unwrap();
        //load sn pn
        let sn_list = load_desc_list(self.service_path.clone(), &req.sn).await;
        let passive_pn_list = load_desc_list(self.service_path.clone(), &req.active_pn).await;
        let active_pn_list = load_desc_list(self.service_path.clone(), &req.passive_pn).await;
        let save_path = match req.local.clone() {
            Some(s) => Some(self.temp_dir.join(s)),
            None => None,
        };

        // (2)实例化BDT Stack
        let (resp, local) = match self
            ._create_stack(
                peer_name,
                &eps,
                area,
                &sn_list,
                &passive_pn_list,
                &active_pn_list,
                None,
                req.sn_only.clone(),
                req.chunk_cache.as_str()
            )
            .await
        {
            //(3)解析BDT Stack 启动结果
            Ok((stack, online_time)) => {
                let mut local = stack.sn_client().ping().default_local();
                let online_sn_id = match stack.sn_client().ping().default_client() {
                    Some(ping_client) => ping_client.sn().object_id().to_string(),
                    None => "None".to_string(),
                };
                let ep_info = local.mut_connect_info().mut_endpoints().clone();
                // 设置返回Device 对象 ep 类型用于测试
                let _ = match req.ep_type.clone() {
                    Some(ep_type_str) => {
                        let ep_type = ep_type_str.as_str();
                        let _ = match ep_type {
                            "WAN" => {
                                local.mut_connect_info().mut_endpoints().clear();
                                for ep in ep_info.clone() {
                                    if ep.is_static_wan() {
                                        local.mut_connect_info().mut_endpoints().push(ep);
                                    }
                                }
                            }
                            "LAN" => {
                                local.mut_connect_info().mut_endpoints().clear();
                                for ep in ep_info.clone() {
                                    if !ep.is_static_wan() {
                                        local.mut_connect_info().mut_endpoints().push(ep);
                                    }
                                }
                            }
                            "Empty" => {
                                local.mut_connect_info().mut_endpoints().clear();
                            }
                            "Default" => {
                                local.mut_connect_info().mut_endpoints().clear();
                                let ep = cyfs_base::Endpoint::default();
                                local.mut_connect_info().mut_endpoints().push(ep);
                            }
                            _ => {
                                log::info!("resp sn resp all endpoints")
                            }
                        };
                    }
                    None => {
                        log::info!("resp sn resp all endpoints")
                    }
                };
                let ep_resp = local.mut_connect_info().mut_endpoints();

                let mut online_sn = Vec::new();
                online_sn.push(online_sn_id);
                let ep_info = endpoint_list_to_string(&ep_info);
                let ep_resp = endpoint_list_to_string(&ep_resp);
                (
                    CreateStackResp {
                        result: 0,
                        msg: "success".to_string(),
                        peer_name: peer_name.to_string(),
                        device_id: local.desc().device_id().to_string(),
                        online_time,
                        online_sn,
                        ep_info,
                        ep_resp,
                    },
                    Some(local),
                )
            }
            Err(err) => (
                CreateStackResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                    peer_name: peer_name.to_string(),
                    device_id: "".to_string(),
                    online_time: 0,
                    online_sn: Vec::new(),
                    ep_info: Vec::new(),
                    ep_resp: Vec::new(),
                },
                None,
            ),
        };
        Ok((resp, local))
    }

    pub async fn reset_client(&mut self, req: &ResetStackReq) -> ResetStackResp {
        // 更新endpoint 端口
        let endpoints = match &req.endpoints {
            Some(addrs) => {
                let mut eps = Vec::new();
                for addr in addrs.iter() {
                    let ep_str = { format!("{}:{}", addr, self.increase_bdt_port_index()) };
                    log::debug!("ep={} on create", &ep_str);
                    let ep = Endpoint::from_str(ep_str.as_str())
                        .map_err(|e| {
                            log::error!("parse ep failed, s={}, e={}", ep_str, &e);
                            e
                        })
                        .unwrap();
                    eps.push(ep);
                }
                Some(eps)
            }
            None => None,
        };
        // 加载本地sn_list
        let sn_list = match &req.sn_list {
            Some(sns) => {
                let sn_devices = load_desc_list(self.service_path.clone(), &sns).await;
                Some(sn_devices)
            }
            None => None,
        };
        match self.BDTClient_map.get(req.peer_name.as_str()) {
            Some(mut client) => match client.clone().reset_stack(sn_list, endpoints).await {
                Ok(result) => ResetStackResp {
                    result: 0,
                    msg: result,
                },
                Err(err) => ResetStackResp {
                    result: err.code().as_u16(),
                    msg: err.msg().to_string(),
                },
            },
            None => ResetStackResp {
                result: 1,
                msg: "bdt client not found".to_string(),
            },
        }
    }

    pub fn destory_client(&mut self, peer_name: &str) -> BuckyResult<()> {
        let _ = match self.BDTClient_map.get(peer_name) {
            Some(client) => {
                let _ = client.get_stack().sn_client().ping().stop();
                // bdt not support stack close
                client.get_stack().close();
            }
            None => {}
        };
        self.BDTClient_map.remove(peer_name);
        Ok(())
    }
    pub async fn destory_all(&mut self) {
        for client in self.BDTClient_map.values_mut() {
            client.get_stack().close();
        }
        self.BDTClient_map = HashMap::new();
    }
}
