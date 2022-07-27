
import { PrismaClient,bdt_agent} from '@prisma/client'
import {prisma} from "../"
export type BDTAgentModel = {
  testcaseId?: string
  name?: string
  NAT?: string
  eps?: string 
  agentMult?: string
  resp_ep_type?: string
  agentid?: string
  logType?: string 
  report_time?: string 
  chunk_cache?: string 
  firstQA_answer?: string
  PN?: string
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
            resp_ep_type: agent.resp_ep_type,
            agentid: agent.agentid,
            logType: agent.logType ,
            report_time: String(agent.report_time) ,
            chunk_cache: String(agent.chunk_cache) ,
            firstQA_answer: agent.firstQA_answer,
            PN: agent.PN,
        }})
        return {err:0,log:`${agent.testcaseId} ${agent.name} add record success`}
      } catch (error) {
        console.info(error)
        return {err:1,log:` ${JSON.stringify(error)}`}
      }
        
    }
}