pub mod peer;
pub mod command;
pub mod connection;

use crate::lib::{LpcCommand,Lpc};

pub fn bdt_LpcServer(peer:&peer::Peer,name:String,c:LpcCommand, lpc: Lpc){
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
    } else if name == String::from("close") {
        peer.on_close(c, lpc.clone());
    } else if name == String::from("reset") {
        peer.on_reset(c, lpc.clone());
    } else if name == String::from("send") {
        peer.on_send(c, lpc.clone());
    } else if name == String::from("recv") {
        peer.on_recv(c, lpc.clone());
    }  else if name == String::from("set-chunk") {
        peer.on_set_chunk(c, lpc.clone());
    } else if name == String::from("interest-chunk") {
        peer.on_interest_chunk(c, lpc.clone());
    } else if name == String::from("check-chunk") {
        peer.on_check_chunk(c, lpc.clone());
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
    } else if name == String::from("start-download-file") {
        peer.on_start_download_file(c, lpc.clone());
    } else if name == String::from("download-file-state") {
        peer.on_download_file_state(c, lpc.clone());
    }
}
