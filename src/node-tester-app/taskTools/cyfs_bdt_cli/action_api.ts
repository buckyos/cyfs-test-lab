

export type TestReq = {
    seq: number,
}


export type TestResp = {
    name: number,
}


export type PingReq = {}

export type PingResp = {}

export type Started = {
    client_name: string,
}


export type CreateStackReq = {
    peer_name: string,
    sn: Array<string>,
    active_pn: Array<string>,
    passive_pn: Array<string>,
    addrs: Array<string>,
    bdt_port?: number,
    local?: string,
    device_tag?: string,
    chunk_cache: string,
    ep_type?: string,
    ndn_event?: string,
    ndn_event_target?: string,
    sn_only: boolean,
    area: string,
}


export type CreateStackResp = {
    result: number,
    msg: string,
    peer_name: string,
    device_id: string,
    ep_info: Array<string>,
    ep_resp: Array<string>,
    online_time: number,
    online_sn: Array<string>,
}


export type Exit = {}


export type CloseLpc = {}


export type ConnectReq = {
    peer_name: string,
    //LpcCommand的json里面
    question_size: number,
    //BuildTunnelParams 配置SN
    remote_sn: Array<string>,
    //标识链接过程中需要通过sn
    known_eps: boolean,
    // 是否直连
    driect: boolean,
    //是否首次接收数据
    accept_answer: boolean,
}


export type ConnectResp = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    send_hash: string,
    recv_hash: string,
    connect_time: number,
    calculate_time: number,
    total_time: number,
}

export type AutoAcceptReq = {
    peer_name: string,
    answer_size: number,
}


export type AutoAcceptResp = {
    peer_name: string,
    result: number,
    msg: string,
}

export type ConfirmStreamEvent = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    send_hash: string,
    recv_hash: string,
    calculate_time: number,
    confirm_time: number,
}

export type SendStreamReq = {
    peer_name: string,
    stream_name: string,
    size: number,
}

export type SendStreamResp = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    time: number,
    hash: string,
}

export type RecvStreamReq = {
    peer_name: string,
    stream_name: string,
}

export type RecvStreamResp = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    file_size: number,
    hash: string,
}

export type ListenerStreamReq = {
    peer_name: string,
    answer_size: number,
}

export type ListenerStreamResp = {
    peer_name: string,
    result: number,
    msg: string,
}

export type ListenerStreamEvent = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    confirm_time: number,
    recv_time: number,
    recv_total_time: number,
    send_time: number,
    send_total_time: number,
    send_hash: string,
    recv_hash: string,
}

export type ConnectSendStreamReq = {
    peer_name: string,
    //LpcCommand的json里面
    question_size: number,
    //标识链接过程中需要通过sn
    known_eps: boolean,
}

export type ConnectSendStreamResp = {
    peer_name: string,
    result: number,
    msg: string,
    stream_name: string,
    send_hash: string,
    recv_hash: string,
    connect_time: number,
    send_time: number,
    recv_time: number,
    calculate_time: number,
    total_time: number,
}


export type UploadSystemInfoReq = {
    agent_name: string,
    testcase_id: string,
    interval: number,
}

export type UploadSystemInfoResp = {
    result: number,
    msg: string,
}
export type ConnectMutReq = {
    peer_name: string,
    //LpcCommand的json里面
    question_size: number,
    //BuildTunnelParams 配置SN
    remote_sn: Array<string>,
    //标识链接过程中需要通过sn
    known_eps: boolean,
    driect: boolean,
    //是否首次接收数据
    accept_answer: boolean,
    //循环连接次数
    conn_sum: number,
}

export type ConnectMutResp = {
    peer_name: string,
    result: number,
    msg: string,
    list: Array<number>,
}


export type CreateTcpServerReq = {
    name: string,
    port: number,
    address: string,
}


export type CreateTcpServerResp = {
    result: number,
    msg: string,
    address: string,
}


export type ListenerTcpConnectEvent = {
    result: number,
    msg: string,
    stream_name: string,
}


export type TcpConnectReq = {
    name: string,
    address: string,
}


export type TcpConnectResp = {
    stream_name: string,
    result: number,
    msg: string,
    connect_time: number
}


export type TcpStreamSendReq = {
    name: string,
    stream_name: string,
    file_szie: number,
}


export type TcpStreamSendResp = {
    result: number,
    msg: string,
    send_time: number,
    hash: string,
    sequence_id: number,
}



export type TcpStreamListenerReq = {
    name: string,
    stream_name: string,
}

export type TcpStreamListenerResp = {
    result: number,
    msg: string,
}
export type TcpStreamListenerEvent = {
    result: number,
    msg: string,
    stream_name: string,
    file_size: number,
    hash: string,
    sequence_id: number,
    recv_time: number,
}
export type DestoryStackReq = {
    peer_name: string,
}

export type DestoryStackResp = {
    result: number,
    msg: string,
}


export type ShutdownReq = {
    peer_name: string,
    stream_name: string,
    shutdown_type : string
}

export type ShutdownResp = {
    result: number,
    msg: string,
}



export interface LpcActionApi {
    client_name?: string,
    TestReq?: TestReq,
    TestResp?: TestResp,
    PingReq?: PingReq,
    PingResp?: PingResp,
    Started?: Started,
    CloseLpc?: CloseLpc,
    UploadSystemInfoReq?: UploadSystemInfoReq,
    UploadSystemInfoResp?: UploadSystemInfoResp,
    Exit?: Exit,
    CreateStackReq?: CreateStackReq,
    CreateStackResp?: CreateStackResp,
    DestoryStackReq?:DestoryStackReq,
    DestoryStackResp?:DestoryStackResp,
    ConnectReq?: ConnectReq,
    ConnectResp?: ConnectResp,
    ConnectMutReq?: ConnectMutReq,
    ConnectMutResp?: ConnectMutResp,
    AutoAcceptReq?: AutoAcceptReq,
    AutoAcceptResp?: AutoAcceptResp,
    ConfirmStreamEvent?: ConfirmStreamEvent,
    SendStreamReq?: SendStreamReq,
    SendStreamResp?: SendStreamResp,
    RecvStreamReq?: RecvStreamReq,
    RecvStreamResp?: RecvStreamResp,
    ShutdownReq?: ShutdownReq,
    ShutdownResp?: ShutdownResp,
    ListenerStreamReq?: ListenerStreamReq,
    ListenerStreamResp?: ListenerStreamResp,
    ListenerStreamEvent?: ListenerStreamEvent,
    ConnectSendStreamReq?: ConnectSendStreamReq,
    ConnectSendStreamResp?: ConnectSendStreamResp,
    // TCP
    CreateTcpServerReq?: CreateTcpServerReq,
    CreateTcpServerResp?: CreateTcpServerResp,
    ListenerTcpConnectEvent?: ListenerTcpConnectEvent,
    TcpConnectReq?: TcpConnectReq,
    TcpConnectResp?: TcpConnectResp,
    TcpStreamSendReq?: TcpStreamSendReq,
    TcpStreamSendResp?: TcpStreamSendResp,
    TcpStreamListenerReq?: TcpStreamListenerReq
    TcpStreamListenerResp?: TcpStreamListenerResp
    TcpStreamListenerEvent?: TcpStreamListenerEvent
}
