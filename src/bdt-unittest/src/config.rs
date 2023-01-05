use std::{
    path::{Path, PathBuf}, str::FromStr,  
};
pub const LOG_PATH : &str = "C:\\cyfs\\cyfs-test-lab\\deploy\\log";
pub const CONFIG_PATH : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\src\\config";

pub fn load_file_by_path(inner_path:&str)->PathBuf{
    let root_path = PathBuf::from_str(CONFIG_PATH).unwrap();
    root_path.join(inner_path)
}