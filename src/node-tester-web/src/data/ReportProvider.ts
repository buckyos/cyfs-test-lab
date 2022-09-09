
import { FetchHelper } from './net';


export type TestcaseEntry =  {
    testcaseId: string  // 用例ID
    TestcaseName: string // 用例名称
    remark: string  //操作步骤
    agentList: string  //测试节点
    environment: string  //测试环境
    taskMult: string  //执行并发数
    createTime: string //创建时间
    result: string // 执行结果
    errorList: string , // 错误列表
    total: number  // 执行总数
    success:number, // 执行成功
    failed:number, //执行失败
    date:string, //执行日期
  };

export class ReportProvider  {
    public static ListUrl: string ='/testcase/list';
    public static ActionCountUrl: string ='/action/count';
    public static ActionPerfUrl: string ='/action/perf';
    public static s_instance: ReportProvider = new ReportProvider();
    private m_listing: boolean = false;
    private m_entrys: TestcaseEntry[] = [];
 
    public static getInstance(): ReportProvider {
        return ReportProvider.s_instance;
    }

    public async testcaseList(): Promise<{succ: boolean, msg?: string, entrys?: TestcaseEntry[]}> {
        let info = await this._testcaseListImpl();
        if (!info.succ) {
            return info;
        }

        return {succ: true, entrys: this.m_entrys};
    }
    private async _testcaseListImpl(): Promise<{succ: boolean, msg?: string}> {
  
        

        return {succ: true};
    }
}