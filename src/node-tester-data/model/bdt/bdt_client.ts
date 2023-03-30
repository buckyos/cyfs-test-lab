import { PrismaClient} from '@prisma/client'
import {prisma} from "../"
export interface BDTClientModel{
  testcase_id?: string 
  name?: string 
  peerid?: string 
  peerInfo?: string 
  sn_resp_eps?: string
  online_time?:number
  status?:string
}



export class BDTClient{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(action:BDTClientModel){
        try {
          const result = await this.prisma.bdt_client.create({data:{
            testcase_id : action.testcase_id,
            name : action.name , 
            peerid : action.peerid ,
            peerInfo : action.peerInfo , 
            sn_resp_eps : action.sn_resp_eps ,
            online_time : action.online_time,
            status:action.status,
          }})
          return {err:0,log:` ${action.name} add record success`}
        } catch (error) {
          console.info(error)
          return {err:1,log:`${error}`}
        }
        
    }
    async queryByTestcaseId(testcase_id:string){
      try {
        const result = await this.prisma.bdt_client.findMany({
          where: { testcase_id },orderBy:[{id : "asc"}]  
        });
        return {err:0,log:"getRecords success",result}
      } catch (error) {
        return {err:1,log:`${error}`}
      }
    }
}