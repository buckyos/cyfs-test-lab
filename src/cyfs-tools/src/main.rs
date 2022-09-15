
mod lib;
use lib::{Lpc,LpcCommand};
use std::convert::TryFrom;
use async_std::*;
use async_std::net::Ipv4Addr;
use cyfs_base::*;
use std;
mod server;
use server::bdt::peer::Peer;


pub struct AutoAcceptStreamLpcCommandResp {
    pub seq: u32,
    pub result: u16,
}
impl TryFrom<AutoAcceptStreamLpcCommandResp> for LpcCommand {
    type Error = BuckyError;
    fn try_from(value: AutoAcceptStreamLpcCommandResp) -> Result<Self, Self::Error> {
        let json = serde_json::json!({
            "name": "resp-test",
            "result": value.result,
        });

        Ok(LpcCommand::new(value.seq, Vec::new(), json))
    }
}


pub async fn resp_test(c: LpcCommand, lpc: Lpc) {
    log::info!("on accept, c={:?}", &c);
    let seq = c.seq();
    let resp1 = AutoAcceptStreamLpcCommandResp {
        seq, 
        result: 0 as u16,
    };
    let resp2 = AutoAcceptStreamLpcCommandResp {
        seq, 
        result: 1 as u16,
    };
    let mut lpc = lpc;
    let _ = lpc.send_command(LpcCommand::try_from(resp1).unwrap()).await;
    let _ = lpc.send_command(LpcCommand::try_from(resp2).unwrap()).await;
}


#[async_std::main]
async fn main()->Result<(), BuckyError> {
    // 接收输入参数
    // let args: Vec<String> = std::env::args().collect();
    // let port: u16 = args[1].parse::<u16>().unwrap();
    // let peer_name = args[2].clone();
    // let log_dir = args[3].clone();
    let port: u16 = 62560;
    let peer_name : String = "testLoacl".to_string();
    let log_dir : String = "E:\\githubSpace\\FFS\\rust_src\\tests\\qa-test-tool\\log".to_string();
    //let system : String = "test-run".to_string();
    //初始化日志
    #[cfg(debug_assertions)]
    let log_default_level = "debug";

    #[cfg(not(debug_assertions))]
    let log_default_level = "info";

    cyfs_debug::CyfsLoggerBuilder::new_app("qa-test-tool")
        .level(log_default_level)
        .console("warn")
        .directory(log_dir.clone())
        .build()
        .unwrap()
        .start();
    //panic异常捕获
    cyfs_debug::PanicBuilder::new("qa-test-tool", "qa-test-tool")
        .exit_on_panic(true)
        .build()
        .start();

    let mut lpc = Lpc::start(SocketAddr::new( IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port), peer_name.clone()).await.map_err(|e| {
        log::error!("start lpc to 127.0.0.1:{} failed, e={}", port, &e);
        e
    })?;
    lpc.begin_heartbeat();
    let peer_bdt = server::bdt::peer::Peer::new(peer_name.clone(),log_dir.clone());
    let peer_stack = server::cyfs_stack::peer::Peer::new(peer_name.clone(),log_dir.clone());
    //保活心跳机制
    let last_recv_ping = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(bucky_time_now()));
    let last_clone = last_recv_ping.clone();
    async_std::task::spawn(async move {
        loop {
            async_std::task::sleep(std::time::Duration::new(10, 0)).await;
            if bucky_time_now() - last_clone.load(std::sync::atomic::Ordering::SeqCst) > 60 * 1000_000 {
                std::process::exit(2);
            }
        }
    });

    
    loop {
        let c = lpc.recv_command().await?;
        let systemCmd = c.get_system();
        let name = c.get_name();
        if name.is_none() || systemCmd.is_none(){
            log::warn!("unknown command, system or name is none");
            continue;
        }
        let systemCmd = systemCmd.unwrap(); 
        let name = name.unwrap(); 
        match systemCmd.as_str(){
            "system" =>{
                match name.as_str(){
                    "ping" => {
                        log::info!("recv command from ts-server system= {}, name={}",systemCmd,name);
                        last_recv_ping.store(bucky_time_now(), std::sync::atomic::Ordering::SeqCst);
                    }
                    "test" => {
                        log::info!("recv  testcommand from ts-server system= {}, name={}",systemCmd,name);
                        //last_recv_ping.store(bucky_time_now(), std::sync::atomic::Ordering::SeqCst);
                    }
                    "exit" => {
                        break;
                    }
                    x => panic!("Unexpected invalid name {:?}", x),
                }
            }
            "bdt" => {
                server::bdt::bdt_LpcServer(&peer_bdt,name.clone(),c, lpc.clone())
            }
            "cyfs-stack" => {
                server::cyfs_stack::stack_LpcServer(&peer_stack,name.clone(),c, lpc.clone())
            }
            x => panic!("Unexpected invalid system Name {:?}", x),
        }        
    }
    std::thread::sleep(std::time::Duration::new(5, 0));
    Ok(())
}

