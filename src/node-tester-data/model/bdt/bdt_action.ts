import { PrismaClient } from '@prisma/client'
import { prisma } from "../"
export interface ActionModel {
  testcase_id?: string
  task_id?: string
  action_id?: string
  type?: string
  LN?: string
  RN?: string
  Users?: string
  parent_action?: string
  config?: string
  info?: string
  fileSize?: number
  chunkSize?: number
  connect_time?: number
  set_time?: number
  calculate_time?: number
  send_time?: number
  expect?: string
  result?: string
  result_log?: string
  date?: string,
  environment?: string,
}



export class BdtAction {
  private prisma: PrismaClient
  constructor() {
    this.prisma = prisma;
  }
  async add(action: ActionModel) {
    try {
      const result = await this.prisma.bdt_action.create({
        data: {
          testcaseId: action.testcase_id,
          task_id: action.task_id,
          action_id: action.action_id,
          type: action.type,
          LN: action.LN,
          RN: action.RN,
          Users: action.Users,
          parent_action: action.parent_action,
          config: action.config,
          info: action.info,
          fileSize: action.fileSize,
          chunkSize: action.chunkSize,
          connect_time: action.connect_time,
          send_time: action.send_time,
          set_time: action.set_time,
          calculate_time: action.calculate_time,
          result: action.result,
          resultLog: action.result_log!,
          expect: action.expect,
          date: action.date,
          environment: action.environment,
          createTime: Date.now().toString(),
        }
      })

      return { err: 0, log: ` ${action.task_id} ${action.type} add record success` }
    } catch (error) {
      console.info(error)
      return { err: 1, log: `${error}` }
    }

  }
  async report(task_id: string) {
    try {
      const result = await this.prisma.bdt_action.findMany({
        where: { task_id }, orderBy: [{ id: "asc" }]
      });
      return { err: 0, log: "getRecords success", result }
    } catch (error) {
      return { err: 1, log: `${error}` }
    }
  }
  async report_testcase_perf(testcase_id: string) {
    try {
      let sql = `SELECT type,avg( connect_time / 1000 ) AS "connect_time",avg( fileSize / send_time ) AS "tran_speed",SUM(fileSize /(1024 * 1024 )) AS "filesize",count(*) AS "total" FROM bdt_action WHERE result = 0 AND testcaseId ="${testcase_id}" GROUP BY type;`;
      console.info(sql);
      let data = await this.prisma.$queryRawUnsafe(sql);
      return { err: 0, log: "getRecords success", data }
    } catch (error) {
      return { err: 1, log: `${error}` }
    }
  }
  async report_version_perf(version: string) {
    try {
      let sql = `SELECT type,avg( connect_time / 1000 ) AS "connect_time",avg( fileSize / send_time ) AS "tran_speed",SUM(fileSize /(1024 * 1024 )) AS "filesize",count(*) AS "total" FROM bdt_action WHERE result = 0 AND testcaseId IN ( SELECT testcaseId FROM bdt_testcase WHERE environment = "${version}" )  GROUP BY type;`;
      console.info(sql);
      let data = await this.prisma.$queryRawUnsafe(sql);
      return { err: 0, log: "getRecords success", data }
    } catch (error) {
      return { err: 1, log: `${error}` }
    }
  }
}