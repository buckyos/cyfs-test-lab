import { PrismaClient} from '@prisma/client'
import {prisma} from "../"
export interface BDTClientModel{
  testcaseId?: string 
  name?: string 
  peerid?: string 
  peerInfo?: string 
  sn_resp_eps?: string
}



export class BDTClient{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(action:BDTClientModel){
        try {
          const result = await this.prisma.bdt_action.create({data:{
            testcaseId : action.testcaseId,
            name : action.name , 
            peerid : action.peerid ,
            peerInfo : action.peerInfo , 
            sn_resp_eps : action.sn_resp_eps ,
          }})
          return {err:0,log:` ${action.name} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${error}`}
        }
        
    }
}