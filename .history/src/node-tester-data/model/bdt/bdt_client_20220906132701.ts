import { PrismaClient} from '@prisma/client'
import {prisma} from "../"
export interface BdtClientModel{
  testcaseId?: string 
  name?: string 
  peerid?: string 
  peerInfo?: string 
  sn_resp_eps?: string
}



export class BdtClient{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(action:BdtClientModel){
        try {
          const result = await this.prisma.bdt_action.create({data:{
            testcaseId : action.testcaseId,
            name : action. , 
            peerid : action ,
            peerInfo : action , 
            sn_resp_eps : action ,
          }
          }})
          
          return {err:0,log:` ${action.name} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${error}`}
        }
        
    }
}