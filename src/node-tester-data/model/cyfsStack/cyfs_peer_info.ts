
import { PrismaClient,cyfs_peer_info} from '@prisma/client'
import {prisma} from "../"
export type PeerInfoModel = {
    testcase_id: string | null
    name?: string | null
    device_id?: string | null
    type?: string | null
    SDK_type?: string | null
    config?: string | null
    createTime?: string | null
  }

export class PeerInfo{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    // async add(peerInfo:PeerInfoModel){
    //   console.info(`add testcase ${JSON.stringify(peerInfo)}`)
    //     try {
    //       const result = await this.prisma.cyfs_peer_info.create({data:{
    //         testcase_id: peerInfo.testcase_id,
    //         name: peerInfo.name,
    //         device_id: peerInfo.device_id,
    //         type: peerInfo.type,
    //         SDK_type: peerInfo.SDK_type,
    //         config: peerInfo.config,
    //         createTime: Date.now().toString(),
    //     }})
    //     return {err:0,log:`${peerInfo.name} add record success`}
    //   } catch (error) {
    //     return {err:0,log:` ${JSON.stringify(error)}`}
    //   }
        
    // }
}