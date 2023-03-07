
import { PrismaClient,bdt_agent} from '@prisma/client'
import {prisma} from "../"
export type BDTAgentModel = {
  testcase_id?: string
    name?: string
    NAT?: string
    eps?: string 
    agentMult?: string
    agentid?: string
    router?:string
    portMap?:string
    logUrl?:string
  }

export class BdtAgent{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(agent:BDTAgentModel){
      console.info(`add BDTAgentModel ${JSON.stringify(agent)}`)
        try {
          const result = await this.prisma.bdt_agent.create({data:{
            testcase_id: agent.testcase_id,
            name : agent.name,
            NAT : String(agent.NAT),
            eps : agent.eps ,
            agentMult: String(agent.agentMult),
            agentid: agent.agentid,
            router : agent.router,
            portMap : agent.portMap,
            logUrl : agent.logUrl,
        }})
        return {err:0,log:`${agent.testcase_id} ${agent.name} add record success`}
      } catch (error) {
        console.info(error)
        return {err:1,log:` ${JSON.stringify(error)}`}
      }
        
    }
    async report(testcase_id:string,name:string){
      //console.info(`查询节点数据：${testcase_id} ,${name}`)
      try {
        const result = await this.prisma.bdt_agent.findFirst({
          where: { testcase_id,name },orderBy:[{id : "asc"}]  
        });
        return {err:0,log:"getRecords success",result}
      } catch (error) {
        return {err:1,log:`${error}`}
      }
    }
} 