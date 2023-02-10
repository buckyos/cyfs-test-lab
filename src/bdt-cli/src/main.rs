mod lpc_client;
use async_std::net::TcpListener;
use std::path::PathBuf;
use std::str::FromStr;
use cyfs_base::*;
use lpc_client::*;
use bdt_utils::*;
use std;

#[async_std::main]
async fn main() -> Result<(), BuckyError> {
    let args: Vec<String> = std::env::args().collect();
    let port: u16 = args[1].parse::<u16>().unwrap();
    let client_name = args[2].clone();
    let log_dir = args[3].clone();
    let service_dir = args[4].clone();
    let bdt_port_index : u16 = args[5].parse::<u16>().unwrap();
    let temp_dir = PathBuf::from_str(log_dir.as_str()).unwrap().join(format!("../{}",client_name.clone()));
    let service_path = PathBuf::from_str(service_dir.as_str()).unwrap();
    #[cfg(debug_assertions)]
    let log_default_level = "debug";

    #[cfg(not(debug_assertions))]
    let log_default_level = "debug";
    let url = "https://oapi.dingtalk.com/robot/send?access_token=336c5b9e11d6450539b3ac4b765f4559caac2bd3bda6abd67b0a1970ec7376c8";
   
    cyfs_debug::CyfsLoggerBuilder::new_app("bdt-cli")
        .level(log_default_level)
        .console("warn")
        .directory(log_dir.clone())
        .disable_file_config(true)
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new("bdt-cli", "bdt-cli")
        .log_dir(log_dir)
        .exit_on_panic(true)
        .dingtalk_bug_report(url)
        .build()
        .start();
    let address = format!("127.0.0.1:{}",port);
    let mut cli = BDTCli::new(address,temp_dir,service_path,bdt_port_index);
    let _ = cli.start_listener(client_name.clone()).await;
    std::thread::sleep(std::time::Duration::new(5, 0));
    Ok(())
}


