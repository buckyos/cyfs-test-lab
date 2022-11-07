import { FetchHelper } from './net';
//const request = require("./request");

export type ReportEntry =  {
    id: string  // 报告ID
    version: string // 用例名称
    zip_url: string  //测试报告下载
    testcase_url: string  //测试报告用例列表
    action_total_url: string  //该测试版本的操作统计
    date: string  //执行日期
}

export class ReportProvider  {

    public static s_instance: ReportProvider = new ReportProvider();
    private m_listing: boolean = false;
    private m_entrys: ReportEntry[] = [];
 
    public static getInstance(): ReportProvider {
        return ReportProvider.s_instance;
    }

    public async list(): Promise<{succ: boolean, msg?: string, entrys?: ReportEntry[]}> {
        let info : any = await FetchHelper.PostFetchData("/api/bdt/report/reportList",{});
        if (info.err) {
            return {succ:false,msg:info.log};
        }
        this.m_entrys = info.value.result;
        return {succ: true, entrys: this.m_entrys};
    }
}

// async function main() {
//     let report = ReportProvider.getInstance();
//     let run = report.reportList();
//     console.info(JSON.stringify(run))
// }
// main()