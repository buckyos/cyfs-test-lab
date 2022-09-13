use std::{collections::BTreeMap, path::PathBuf};

use async_std::fs;
use cyfs_base::BuckyError;
use cyfs_util::get_temp_path;

pub struct Process {
    proc_in: bool,
    proc_out: bool,
    proc_file: String,
    path: PathBuf,
    storage: BTreeMap<String, serde_json::Value>,
}

impl Process {
    pub fn new(proc_in: bool, proc_out: bool, proc_file: impl Into<String>) -> Self {
        Self {
            proc_in,
            proc_out,
            proc_file: proc_file.into(),
            path: PathBuf::from(""),
            storage: BTreeMap::new(),
        }
    }

    pub async fn init(&mut self) -> Result<(), BuckyError> {
        let dir = get_temp_path().join("non");
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
        info!("handle nameobject todo....");

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

    pub fn process_people(&self) {
        if self.proc_in {

        } else {
            
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