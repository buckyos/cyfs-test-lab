import { PrismaClient,agent_system_info } from '@prisma/client'
import {prisma} from "../"
export type SystemInfoModel =  {
    name: string
    cpu_usage?: number
    total_memory?: number 
    used_memory?: number 
    received_bytes?: number
    transmitted_bytes?: number 
    ssd_disk_total?: number
    ssd_disk_avail?: number 
    hdd_disk_total?: number
    hdd_disk_avail?: number 
    create_time?: string,
    testcase_id?:string,
}
  var date = require("silly-datetime");

  export class SystemInfo{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async  report(info:SystemInfoModel) {
        const result = await this.prisma.agent_system_info.create({data:{
            name: info.name, 
            cpu_usage: info.cpu_usage, 
            total_memory: info.total_memory, 
            used_memory:info.used_memory, 
            received_bytes: info.received_bytes, 
            transmitted_bytes: info.transmitted_bytes, 
            ssd_disk_total:info.ssd_disk_total, 
            ssd_disk_avail: info.ssd_disk_avail, 
            hdd_disk_total: info.hdd_disk_total, 
            hdd_disk_avail:info.hdd_disk_avail, 
            testcase_id:info.testcase_id,
            create_time: Date.now().toString(),
        }})
        return result;
    }

    async getRecords(name:string,testcase_id:string){
      try {
        const result = await this.prisma.agent_system_info.findMany({
          where: { name,testcase_id:testcase_id },orderBy:[{create_time : "asc"}]  
        });
        return {err:0,log:"getRecords success",result}
      } catch (error) {
        return {err:1,log:`${error}`}
      }
      
      

    }
    async getAgentList(testcase_id:string,version:string):Promise<{err:number,log:string,data?:any}>{
      try {
        let sql = "SELECT DISTINCT `name`,testcase_id from agent_system_info WHERE testcase_id = " + `"${testcase_id}" or testcase_id = "${version}";`;
        console.info(sql);
        let data = await this.prisma.$queryRawUnsafe(sql);
        return { err: 0, log: "getRecords success", data }
      } catch (error) {
        return { err: 1, log: `${error}` }
      }
    }

  }