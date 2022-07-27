import { PrismaClient,agent_perf } from '@prisma/client'
import {prisma} from "../"
export type AgentPerfModel =  {
    name: string 
    cpu?: string 
    mem?: string 
    disk?: string 
    disk_io?: string 
    net_info?: string 
    net_stats?: string 
    process?: string
    create_time?: string
  }
  var date = require("silly-datetime");

  export class AgentPerf{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async  report(info:AgentPerfModel) {
        const result = await this.prisma.agent_perf.create({data:{
            name: info.name, 
            cpu: info.cpu, 
            mem: info.mem, 
            disk: info.disk, 
            disk_io: info.disk_io, 
            net_info: info.net_info, 
            net_stats: info.net_stats, 
            process: info.process,
            create_time: Date.now().toString(),
        }})
        return result;
    }
  
  }