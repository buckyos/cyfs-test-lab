
import { PrismaClient,bdt_agent} from '@prisma/client'
import {prisma} from "../"
export type BDTAgentModel = {
    testcaseId?: string
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
            testcaseId: agent.testcaseId,
            name: agent.name,
            NAT: String(agent.NAT),
            eps: agent.eps ,
            agentMult: String(agent.agentMult),
            agentid: agent.agentid,
            logUrl:agent.logUrl
        }})
        return {err:0,log:`${agent.testcaseId} ${agent.name} add record success`}
      } catch (error) {
        console.info(error)
        return {err:1,log:` ${JSON.stringify(error)}`}
      }
        
    }
}