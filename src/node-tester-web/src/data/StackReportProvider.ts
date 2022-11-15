import { FetchHelper } from './net';
//const request = require("./request");

export type StackReportEntry =  {
    id: string  // 报告ID
    version: string // 用例名称
    zip_url: string  //测试报告下载
    testcase_url: string  //测试报告用例列表
    date: string  //执行日期
}

export class StackReportProvider  {

    public static s_instance: StackReportProvider = new StackReportProvider();
    private m_listing: boolean = false;
    private m_entrys: StackReportEntry[] = [];
 
    public static getInstance(): StackReportProvider {
        return StackReportProvider.s_instance;
    }

    public async list(): Promise<{succ: boolean, msg?: string, entrys?: StackReportEntry[]}> {
        let info : any = await FetchHelper.PostFetchData("/api/cyfs/report/reportList",{});
        if (info.err) {
            return {succ:false,msg:info.log};
        }
        this.m_entrys = info.value.result;
        return {succ: true, entrys: this.m_entrys};
    }
}

// async function main() {
//     let StackReport = StackReportProvider.getInstance();
//     let run = StackReport.StackReportList();
//     console.info(JSON.stringify(run))
// }
// main()