import * as cyfs from "../cyfs"
export type PeerInfo ={ 
    peer_name: string, 
    dec_id?: string, 
    type?: cyfs.CyfsStackRequestorType,
    device_id?:cyfs.ObjectId 
}