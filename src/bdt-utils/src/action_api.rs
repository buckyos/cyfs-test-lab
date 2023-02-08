use cyfs_base::*;
use cyfs_bdt::*;
use serde::{Deserialize, Serialize};
use std::io::Read;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum LpcActionApi {
    // test framework
    TestReq(TestReq),
    TestResp(TestResp),
    PingReq(PingReq),
    ErrorParams(ErrorParams),
    PingResp(PingResp),
    Started(Started),
    CloseLpc(CloseLpc),
    UploadSystemInfoReq(UploadSystemInfoReq),
    UploadSystemInfoResp(UploadSystemInfoResp),
    Exit(Exit),
    Unkonwn(Unkonwn),
    // BDT
    CreateStackReq(CreateStackReq),
    CreateStackResp(CreateStackResp),
    DestoryStackReq(DestoryStackReq),
    DestoryStackResp(DestoryStackResp),
    ConnectReq(ConnectReq),
    ConnectResp(ConnectResp),
    ConnectMutReq(ConnectMutReq),
    ConnectMutResp(ConnectMutResp),
    AutoAcceptReq(AutoAcceptReq),
    AutoAcceptResp(AutoAcceptResp),
    ConfirmStreamEvent(ConfirmStreamEvent),
    SendStreamReq(SendStreamReq),
    SendStreamResp(SendStreamResp),
    RecvStreamReq(RecvStreamReq),
    RecvStreamResp(RecvStreamResp),
    ShutdownReq(ShutdownReq),
    ShutdownResp(ShutdownResp),
    ResetStackReq(ResetStackReq),
    ResetStackResp(ResetStackResp),
    ListenerStreamReq(ListenerStreamReq),
    ListenerStreamResp(ListenerStreamResp),
    ListenerStreamEvent(ListenerStreamEvent),
    ConnectSendStreamReq(ConnectSendStreamReq),
    ConnectSendStreamResp(ConnectSendStreamResp),
    //TCP
    CreateTcpServerReq(CreateTcpServerReq),
    CreateTcpServerResp(CreateTcpServerResp),
    ListenerTcpConnectEvent(ListenerTcpConnectEvent),
    TcpConnectReq(TcpConnectReq),
    TcpConnectResp(TcpConnectResp),
    TcpStreamSendReq(TcpStreamSendReq),
    TcpStreamSendResp(TcpStreamSendResp),
    TcpStreamListenerReq(TcpStreamListenerReq),
    TcpStreamListenerResp(TcpStreamListenerResp),
    TcpStreamListenerEvent(TcpStreamListenerEvent),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestReq {
    pub seq: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestResp {
    pub name: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingReq {}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResp {}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Started {
    pub client_name: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ErrorParams {
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Unkonwn {
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateStackReq {
    pub peer_name: String,
    pub sn: Vec<String>,
    pub active_pn: Vec<String>,
    pub passive_pn: Vec<String>,
    pub addrs: Vec<String>,
    pub bdt_port: Option<u32>,
    pub local: Option<String>,
    pub device_tag: Option<String>,
    pub chunk_cache: String,
    pub ep_type: Option<String>,
    pub ndn_event: Option<String>,
    pub ndn_event_target: Option<String>,
    pub sn_only: bool,
    pub area: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateStackResp {
    pub result: u16,
    pub msg: String,
    pub ep_info: Vec<String>,
    pub ep_resp: Vec<String>,
    pub online_time: u64,
    pub online_sn: Vec<String>,
    pub peer_name: String,
    pub device_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Exit {}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CloseLpc {}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectReq {
    pub peer_name: String,
    //LpcCommand的json里面
    pub question_size: u64,
    //BuildTunnelParams 配置SN
    pub remote_sn: Vec<String>,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
    // 是否直连
    pub driect: bool,
    //是否首次接收数据
    pub accept_answer: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub send_hash: HashValue,
    pub recv_hash: HashValue,
    pub connect_time: u64,
    pub calculate_time: u64,
    pub total_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectMutReq {
    pub peer_name: String,
    //LpcCommand的json里面
    pub question_size: u64,
    //BuildTunnelParams 配置SN
    pub remote_sn: Vec<String>,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
    pub driect: bool,
    //是否首次接收数据
    pub accept_answer: bool,
    //循环连接次数
    pub conn_sum: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectMutResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub list: Vec<u64>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoAcceptReq {
    pub peer_name: String,
    pub answer_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoAcceptResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfirmStreamEvent {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub send_hash: HashValue,
    pub recv_hash: HashValue,
    pub calculate_time: u64,
    pub confirm_time: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SendStreamReq {
    pub peer_name: String,
    pub stream_name: String,
    pub size: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SendStreamResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub time: u32,
    pub hash: HashValue,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecvStreamReq {
    pub peer_name: String,
    pub stream_name: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecvStreamResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub file_size: u64,
    pub hash: HashValue,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShutdownReq{
    pub peer_name: String,
    pub stream_name: String,
    pub shutdown_type : String
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShutdownResp{
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResetStackReq{
    pub peer_name: String,
    pub endpoints : Option<Vec<String>>,
    pub sn_list : Option<Vec<String>> 
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResetStackResp{
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListenerStreamReq {
    pub peer_name: String,
    pub answer_size: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListenerStreamResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListenerStreamEvent {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub confirm_time: u64,
    pub recv_time: u64,
    pub recv_total_time: u64,
    pub send_time: u64,
    pub send_total_time: u64,
    pub send_hash: HashValue,
    pub recv_hash: HashValue,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectSendStreamReq {
    pub peer_name: String,
    //LpcCommand的json里面
    pub question_size: u64,
    //标识链接过程中需要通过sn
    pub known_eps: bool,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectSendStreamResp {
    pub peer_name: String,
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub send_hash: HashValue,
    pub recv_hash: HashValue,
    pub connect_time: u64,
    pub send_time: u64,
    pub recv_time: u64,
    pub calculate_time: u64,
    pub total_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadSystemInfoReq {
    pub agent_name: String,
    pub testcase_id: String,
    pub interval: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UploadSystemInfoResp {
    pub result: u16,
    pub msg: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateTcpServerReq {
    pub name: String,
    pub address: String,
    pub port: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateTcpServerResp {
    pub result: u16,
    pub msg: String,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ListenerTcpConnectEvent {
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpConnectReq {
    pub name: String,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpConnectResp {
    pub stream_name: String,
    pub result: u16,
    pub msg: String,
    pub connect_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpStreamSendReq {
    pub name: String,
    pub stream_name: String,
    pub file_szie: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpStreamSendResp {
    pub result: u16,
    pub msg: String,
    pub send_time: u64,
    pub hash: HashValue,
    pub sequence_id: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpStreamListenerReq {
    pub name: String,
    pub stream_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpStreamListenerResp {
    pub result: u16,
    pub msg: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TcpStreamListenerEvent {
    pub result: u16,
    pub msg: String,
    pub stream_name: String,
    pub file_size: u64,
    pub hash: HashValue,
    pub sequence_id: u64,
    pub recv_time: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DestoryStackReq {
    pub peer_name: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DestoryStackResp {
    pub result: u16,
    pub msg: String,
}