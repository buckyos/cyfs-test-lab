import * as cyfs from "../cyfs"

export type PeerInfo ={ 
    peer_name: string, 
    dec_id?: string, 
    type?: cyfs.CyfsStackRequestorType,
    device_id?:cyfs.ObjectId 
}

export enum CyfsDriverType {
    real_machine = "Real_machine",
    runtime = "Runtime",
    gateway = "Gateway",
    simulator = "Simulator",
    bdt_client = "Bdt_client",
    other = "Other"
}