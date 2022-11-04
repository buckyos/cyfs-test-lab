
import { PrismaClient,bdt_report} from '@prisma/client'
import {prisma} from "../"
export type ReportModel = {
    id?: number,
    version : string, 
    zip_url: string,
    testcase_url: string,
    action_total_url: string,
    date: string,
  }

export class BdtReport{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(report:ReportModel){
      console.info(`add testcase ${JSON.stringify(report)}`)
        try {
          const result = await this.prisma.bdt_report.create({data:{
            version : report.version, 
            zip_url: report.zip_url,
            testcase_url: report.testcase_url,
            action_total_url: report.action_total_url,
            date: report.date,
        }})
        return {err:0,log:`${report.version} add record success`}
      } catch (error) {
        console.info(error)
        return {err:0,log:` ${JSON.stringify(error)}`}
      }
        
    }
    async querList(){
      console.info(`query bdt testcase report`)
        try {
          const result = await this.prisma.bdt_report.findMany({
            where: {},orderBy:[{id : "desc"}]  
          });
          return {err:0,log:"getRecords success",result}
      } catch (error) {
        console.info(error)
        return {err:0,log:` ${JSON.stringify(error)}`}
      }
        
    }
}