use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use async_std::fs;
use cyfs_base::*;
use cyfs_util::get_temp_path;

pub struct Process {
    proc_in: bool,
    _proc_out: bool,
    proc_file: String,
    path: PathBuf,
    storage: BTreeMap<String, serde_json::Value>,
}

impl Process {
    pub fn new(proc_in: bool, _proc_out: bool, proc_file: impl Into<String>) -> Self {
        Self {
            proc_in,
            _proc_out,
            proc_file: proc_file.into(),
            path: PathBuf::from(""),
            storage: BTreeMap::new(),
        }
    }

    pub async fn init(&mut self) -> Result<(), BuckyError> {
        let dir = get_temp_path().join("test_nameObject_ts");
        if !dir.is_dir() {
            if let Err(e) = std::fs::create_dir_all(&dir) {
                let msg = format!("create profile dir error! dir={}, err={}", dir.display(), e);
                error!("{}", msg);

                return Err(BuckyError::from(msg));
            }
        }

        let file = dir.join(&self.proc_file);
        self.path = file;
        if !self.path.exists() {
            info!("file nameobject file not exists! file={}", self.path.display());
            return Ok(());
        }

        return self.load().await;
    }

    async fn load(&mut self) -> Result<(), BuckyError> {
        assert!(self.storage.is_empty());

        let contents = match fs::read_to_string(&self.path).await {
            Ok(v) => v,
            Err(e) => {
                let msg = format!(
                    "load nameobject file as string error! file={}, err={}",
                    self.path.display(),
                    e
                );
                error!("{}", msg);

                return Err(BuckyError::from(msg));
            }
        };

        self.storage = match serde_json::from_str(&contents) {
            Ok(v) => v,
            Err(e) => {
                let msg = format!(
                    "unserialize nameobject file from string error! file={}, err={}, content={}",
                    self.path.display(),
                    e,
                    contents
                );
                error!("{}", msg);

                return Err(BuckyError::from(msg));
            }
        };

        info!("load nameobject success! file={}", self.path.display());

        Ok(())
    }


    pub fn handle(&self) {
        let node = self.storage.get_key_value("type").map(|(_, value)| value).unwrap();
        if !node.is_string() {
            std::process::exit(1);
        }

        let obj_type = node.as_str().unwrap();
        println!("process: {}", obj_type);
        match obj_type {
            "people" => {
                self.process_people();
            },
            "device" => {
                self.process_device();
            },
            "file" => {
                self.process_file();
            },
            "dir" => {
                self.process_dir();
            },
            "simple_group" => {
                self.process_simple_group();
            },
            "union_account" => {
                self.process_union_account();
            },
            _ => {
                // nothing to do
                println!("unsupport type: {}", obj_type);
            }
        }
    
    }

    fn public_key(param: String) -> PublicKey {
        let parts: Vec<&str> = param.split(":").collect();
        if parts.len() != 2 {
            return PublicKey::default();
        }

        let types = parts[0].trim();
        match types {
            "random" => {
                let bits = parts[1].trim().parse::<usize>().unwrap_or(1024);
                let private_key = PrivateKey::generate_rsa(bits).unwrap();
                let pubic_key = private_key.public();
                return pubic_key;
            },
            "hex" => {
                let pub_hex = parts[1];
                let (public_key, _) = PublicKey::raw_decode(&hex::decode(pub_hex).unwrap()).unwrap();
                // let mut buf: Vec<u8> = Vec::new();
                // let ret = PublicKey::clone_from_hex(&PUBKEY_HEX, &mut buf);
                // let public_key = ret.unwrap();
                return public_key;
            },
            "file" =>{     
                let temp = ::cyfs_util::get_temp_path();
                let pub_file = temp.join(parts[1].trim());
                let mut buf: Vec<u8> = Vec::new();
                let ret = PublicKey::decode_from_file(&pub_file, &mut buf);
                let (public_key, _) = ret.unwrap();
                return public_key;
            },
            _ => {
                return PublicKey::default();
            }

        }
    }

    fn output_check_err(obj_type: impl Into<String>, except: impl Into<String>, actual: impl Into<String>) {
        println!("check {} failed, except: {}, actual: {}", obj_type.into(), except.into(), actual.into());
    }

    fn check_common(&self, actual: &AnyNamedObject) -> bool {
        if let Some(node) = self.storage.get_key_value("owner").map(|(_, value)| value) {
            let except_owner = node.as_str().unwrap();
            match actual.owner() {
                Some(o) => {
                    if o.to_string() != except_owner {
                        Self::output_check_err("owner", except_owner, actual.owner().unwrap().to_string());
                        return false;
                    }
                },
                None => {
                    Self::output_check_err("owner", except_owner, "none");
                    return false;
                },
            };

        }

        // if let Some(node) = self.storage.get_key_value("area").map(|(_, value)| value) {
        //     let except_area = node.as_str().unwrap();
        //     match actual.area() {
        //         Some(o) => {
        //             if o.to_string() != except_area {
        //                 Self::output_check_err("area", except_area, actual.area().unwrap().to_string());
        //                 return false;
        //             }
        //         },
        //         None => {
        //             Self::output_check_err("area", except_area, "none");
        //             return false;
        //         },
        //     };

        // }

        if let Some(node) = self.storage.get_key_value("create_time").map(|(_, value)| value) {
            let except_create_time = node.as_str().unwrap();
            if actual.create_time().to_string() != except_create_time {
                Self::output_check_err("create_time", except_create_time, actual.create_time().to_string());
                return false;
            }
        }
        if let Some(node) = self.storage.get_key_value("update_time").map(|(_, value)| value) {
            let except_update_time = node.as_str().unwrap();
            match actual.update_time() {
                Some(o) => {
                    if o.to_string() != except_update_time {
                        Self::output_check_err("update_time", except_update_time, actual.update_time().unwrap().to_string());
                        return false;
                    }
                },
                None => {
                    if "" != except_update_time {
                        Self::output_check_err("update_time", except_update_time, "none");
                        return false;
                    }
                },
            };
        }

        if let Some(node) = self.storage.get_key_value("public_key").map(|(_, value)| value) {
            let param = node.as_str().unwrap();
            let except_key = Self::public_key(param.into());
            //let except_key = "";
            match actual.public_key() {
                Some(o) => {
                    match o {
                        PublicKeyRef::Single(single) => {
                            let size = single.raw_measure(&None).unwrap();
                            let mut buf = vec![0u8; size];
                            let _rest_buf = single.raw_encode(&mut buf, &None).unwrap();
                            println!("{}", hex::encode(buf));
                            //let (public_key, _) = PublicKey::raw_decode(&hex::decode(buf.to_hex().unwrap()).unwrap()).unwrap();
                            //let (d,buf) = PublicKey::raw_decode(&buf).unwrap();

                            if single.to_hex().unwrap() != except_key.to_hex().unwrap() {
                                Self::output_check_err("public_key", except_key.to_hex().unwrap(), single.to_hex().unwrap());
                                return false;
                            }

                        },
                        PublicKeyRef::MN(_) => {
                            todo!()
                        },
                    }

                },
                None => {
                    Self::output_check_err("public_key", except_key.to_hex().unwrap(), "none");
                    return false;
                },
            };
        }
        
        return true;
    }

    // fn process_common<DC, BC>(&self, builder: &mut NamedObjectBuilder<DC, BC>)  
    // where
    // DC: RawEncode + DescContent + Sync + Send + Clone,
    // BC: Sync + Send + Clone + RawEncode + BodyContent,{
    //     if let Some(node) = self.storage.get_key_value("owner").map(|(_, value)| value) {
    //         let owner = ObjectId::from_str(node.as_str().unwrap()).unwrap();
    //         let a = builder.owner(owner);
    //     }

    // }

    pub fn process_people(&self) {
        let node = self.storage.get_key_value("file").map(|(_, value)| value).unwrap();
        let obj_file = node.as_str().unwrap();
        let dir = get_temp_path().join("test_nameObject_ts/people");
        let people_file = dir.join(obj_file);

        println!("{:?}", people_file);
        if self.proc_in {
            let mut buf = vec![];
            let (p, _) = People::decode_from_file(&people_file, &mut buf).unwrap();
            // 先检查通用数据部分
            let any = AnyNamedObject::Standard(StandardObject::People(p.clone()));
            if self.check_common(&any) {
                // 检查content数据
                let mut except_ood_list = vec![];
                if let Some(node) = self.storage.get_key_value("ood_list").map(|(_, value)| value) {
                    let obj_list = node.as_array().unwrap();
                    for v in obj_list.iter() {
                        let device_str = v.as_str().unwrap();
                        except_ood_list.push(DeviceId::from_str(device_str).unwrap());
                    }
                }

                assert_eq!(*p.ood_list(), except_ood_list);

                if let Some(node) = self.storage.get_key_value("icon").map(|(_, value)| value) {
                    assert_eq!(p.icon().unwrap().to_string(), node.as_str().unwrap());
                }
        
                if let Some(node) = self.storage.get_key_value("ood_work_mode").map(|(_, value)| value) {
                    assert_eq!(p.ood_work_mode(), OODWorkMode::from_str(node.as_str().unwrap()).unwrap());
                }
            }

        } else {
            // 从json file中创建对象
            let mut ood_list = vec![];
            if let Some(node) = self.storage.get_key_value("ood_list").map(|(_, value)| value) {
                let obj_list = node.as_array().unwrap();
                let _ = obj_list.iter().map(|value| ood_list.push(DeviceId::from_str(value.as_str().unwrap()).unwrap()));
            }

            let mut icon: Option<FileId> = None;
            if let Some(node) = self.storage.get_key_value("icon").map(|(_, value)| value) {
                icon = Some(FileId::from_str(node.as_str().unwrap()).unwrap());
            }

            let mut name: Option<String> = None;
            if let Some(node) = self.storage.get_key_value("name").map(|(_, value)| value) {
                name = Some(node.as_str().unwrap().to_string());
            }


            let mut ood_work_mode: OODWorkMode = OODWorkMode::Standalone;
            if let Some(node) = self.storage.get_key_value("ood_work_mode").map(|(_, value)| value) {
                if node.as_str().unwrap() == "standalone" || node.as_str().unwrap() == "active-standby" {
                    ood_work_mode = OODWorkMode::from_str(node.as_str().unwrap()).unwrap();
                }
            }

            let desc_content = PeopleDescContent::new();

            let body_content = PeopleBodyContent::new(ood_work_mode, ood_list, name, icon);

            let mut builder = PeopleBuilder::new(desc_content, body_content);


            if let Some(node) = self.storage.get_key_value("owner").map(|(_, value)| value) {
                let owner = node.as_str().unwrap();
                builder = builder.option_owner(Some(ObjectId::from_str(owner).unwrap()));
            }
    
            if let Some(node) = self.storage.get_key_value("area").map(|(_, value)| value) {
                let area = node.as_str().unwrap();
                builder = builder.option_area(Some(Area::from_str(area).unwrap()));
            }
    
            if let Some(node) = self.storage.get_key_value("create_time").map(|(_, value)| value) {
                let create_time = node.as_str().unwrap().trim().parse::<u64>().unwrap();
                builder = builder.create_time(create_time);
            }
            if let Some(node) = self.storage.get_key_value("update_time").map(|(_, value)| value) {
                let update_time = node.as_str().unwrap().trim().parse::<u64>().unwrap();
                builder = builder.update_time(update_time);
            }
    
            if let Some(node) = self.storage.get_key_value("public_key").map(|(_, value)| value) {
                let param = node.as_str().unwrap();
                let public_key = Self::public_key(param.into());
                builder = builder.public_key(public_key);
            }

            let people = builder.build();

            let _ = people.encode_to_file(people_file.as_path(), false);
        }
    }

    pub fn process_device(&self) {
        if self.proc_in {

        } else {
            
        }
    }

    pub fn process_file(&self) {
        if self.proc_in {

        } else {
            
        }
    }

    pub fn process_dir(&self) {
        if self.proc_in {

        } else {
            
        }
    }

    pub fn process_simple_group(&self) {
        if self.proc_in {

        } else {
            
        }
    }

    pub fn process_union_account(&self) {
        if self.proc_in {

        } else {
            
        }
    }

}