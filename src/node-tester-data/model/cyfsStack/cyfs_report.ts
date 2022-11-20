
import { PrismaClient,cyfs_report} from '@prisma/client'
import {prisma} from "../"
export type CyfsReportModel = {
    id?: number,
    version : string, 
    zip_url: string,
    testcase_url: string,
    coverage_url : string,
    date: string,
  }

export class CyfsReport{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async add(report:CyfsReportModel){
      console.info(`add testcase ${JSON.stringify(report)}`)
        try {
          const result = await this.prisma.cyfs_report.create({data:{
            version : report.version, 
            zip_url: report.zip_url,
            testcase_url: report.testcase_url,
            coverage_url : report.coverage_url,
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
          const result = await this.prisma.cyfs_report.findMany({
            where: {},orderBy:[{id : "desc"}]  
          });
          return {err:0,log:"getRecords success",result}
      } catch (error) {
        console.info(error)
        return {err:0,log:` ${JSON.stringify(error)}`}
      }
        
    }
}