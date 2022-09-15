mod connection;
mod peer;
mod command;
mod lib;
use peer::Peer;


use lib::*;
use async_std::net::Ipv4Addr;
use cyfs_base::*;

use std;



#[async_std::main]
async fn main()->Result<(), BuckyError> {
    let args: Vec<String> = std::env::args().collect();
    let port: u16 = args[1].parse::<u16>().unwrap();
    let peer_name = args[2].clone();
    let log_dir = args[3].clone();

    #[cfg(debug_assertions)]
    let log_default_level = "debug";

    #[cfg(not(debug_assertions))]
    let log_default_level = "debug";

    cyfs_debug::CyfsLoggerBuilder::new_app("rust-bdt-test-client")
        .level(log_default_level)
        .console("warn")
        .directory(log_dir.clone())
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new("rust-bdt-test-client", "rust-bdt-test-client")
        .exit_on_panic(true)
        .build()
        .start();

    let mut lpc = Lpc::start(SocketAddr::new( IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port), peer_name).await.map_err(|e| {
        log::error!("start lpc to 127.0.0.1:{} failed, e={}", port, &e);
        e
    })?;
    lpc.begin_heartbeat();
    let peer = Peer::new(log_dir.clone());

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
        let name = c.get_name();
        if name.is_none() {
            continue;
        }

        let name = name.unwrap();
        if name == String::from("create") {
            peer.on_create(c, lpc.clone());
        } else if name == String::from("connect") {
            peer.on_connect(c, lpc.clone());
        } else if name == String::from("auto_accept") {
            peer.on_auto_accept(c, lpc.clone());
        } else if name == String::from("accept") {
            peer.on_accept(c, lpc.clone());
        } else if name == String::from("confirm") {
            peer.on_confirm(c, lpc.clone());
        } else if name == String::from("set_answer") {
            peer.on_set_answer(c, lpc.clone());
        } else if name == String::from("close") {
            peer.on_close(c, lpc.clone());
        } else if name == String::from("reset") {
            peer.on_reset(c, lpc.clone());
        } else if name == String::from("send") {
            peer.on_send(c, lpc.clone());
        } else if name == String::from("recv") {
            peer.on_recv(c, lpc.clone());
        }else if name == String::from("send_object") {
            peer.on_send_object(c, lpc.clone());
        } else if name == String::from("recv_object") {
            peer.on_recv_object(c, lpc.clone());
        } else if name == String::from("ping") {
            last_recv_ping.store(bucky_time_now(), std::sync::atomic::Ordering::SeqCst);
        } else if name == String::from("calculate-chunk") {
            peer.on_calculate_chunk(c, lpc.clone());
        }else if name == String::from("set-chunk") {
            peer.on_set_chunk(c, lpc.clone());
        }else if name == String::from("track-chunk") {
            peer.on_track_chunk(c, lpc.clone());
        } else if name == String::from("interest-chunk") {
            peer.on_interest_chunk(c, lpc.clone());
        } else if name == String::from("check-chunk") {
            peer.on_check_chunk(c, lpc.clone());
        } else if name == String::from("interest-chunk-list") {
            peer.on_interest_chunk_list(c, lpc.clone());
        } else if name == String::from("check-chunk-list") {
            peer.on_check_chunk_list(c, lpc.clone());
        } else if name == String::from("add-device") {
            peer.on_add_device(c, lpc.clone());
        } else if name == String::from("create-file-session") {
            peer.on_create_file_session(c, lpc.clone());
        } else if name == String::from("start-trans-session") {
            peer.on_start_trans_session(c, lpc.clone());
        } else if name == String::from("get-trans-session-state") {
            peer.on_get_trans_session_state(c, lpc.clone());
        } else if name == String::from("start-send-file") {
            peer.on_start_send_file(c, lpc.clone());
        }else if name == String::from("calculate-file") {
            peer.on_calculate_file(c, lpc.clone());
        }else if name == String::from("set-file") {
            peer.on_set_file(c, lpc.clone());
        } else if name == String::from("start-download-file") {
            peer.on_start_download_file(c, lpc.clone());
        }else if name == String::from("start-download-file-range") {
            peer.on_start_download_file_range(c, lpc.clone());
        } else if name == String::from("download-file-state") {
            peer.on_download_file_state(c, lpc.clone());
        } else if name == String::from("start-send-dir") {
            peer.on_start_send_dir(c, lpc.clone());
        } else if name == String::from("start-download-dir") {
            peer.on_start_download_dir(c, lpc.clone());
        } else if name == String::from("download-dir-state") {
            peer.on_download_dir_state(c, lpc.clone());
        }else if name == String::from("get_system_info") {
            peer.on_get_system_info(c, lpc.clone());
        }else if name == String::from("send-datagram") {
            peer.on_send_datagram(c, lpc.clone());
        }else if name == String::from("recv-datagram") {
            peer.on_recv_datagram(c, lpc.clone());
        } else if name == String::from("exit") {
            break;
        }else {
            log::warn!("unknown command, name={}", &name);
        }
    }

    std::thread::sleep(std::time::Duration::new(5, 0));
    Ok(())
}



// #[test]
// fn test_bdt_exe() {
//     let c = LpcCommand {
//         seq: 0, 
//         buffer: vec![1,2,3],
//         json_value: serde_json::json!({ "city": "London", "street": "10 Downing Street" }),
//     };
//     println!("c={:?}", &c);
//     let s = serde_json::to_vec(&c.json_value).unwrap();
//     let str = serde_json::to_string(&c.json_value).unwrap();
//     println!("str={}", str);

//     let v1: serde_json::Value = serde_json::from_slice(s.as_slice()).unwrap();
//     println!("v1={:?}", &v1);

//     let bufer = c.encode().unwrap();
//     let c1 = LpcCommand::decode(bufer.as_ref()).unwrap();
//     println!("c1={:?}", &c1);
//     let log_dir = "D:\\cyfs\\log";
//     let peer = Peer::new(log_dir.to_string());
// }