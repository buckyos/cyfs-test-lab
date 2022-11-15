import * as http from "http";
import * as fs from 'fs';
import * as path from 'path';
import {upload,request,ContentType} from './request';
import * as data_request from "./request_data"
import {startZIP} from "./zipTask"
import * as SysProcess from 'process';
import { Command } from "commander";
var date = require("silly-datetime");

export async function  uplaodTestcaseZip(version:string,filePath:string,fileName:string){
    let resp = await upload(version,filePath,fileName);
    return resp.data;  
}

export async function uplaodTestcase(report_path:string,version:string){
    let zip =await startZIP(report_path,"mochawesome-report.zip")
    // 上传打包的测试报告
    let upload_zip = await uplaodTestcaseZip(version,path.join(report_path,"mochawesome-report.zip"),"mochawesome-report.zip")
    console.info(JSON.stringify(upload_zip));
    // 服务器只有内网地址，要替换域名
    let zip_url = String(upload_zip.url).replace("192.168.200.175","cyfs-test-lab")
    let file_name = zip_url.split("/")[5];
    console.info(zip_url,file_name)
    // 服务器添加测试报告
    let create_report = await data_request.request("POST", "api/cyfs/report/reportHtml", { version,zip_url,file_name}, ContentType.json);
    console.info(JSON.stringify(create_report));
    return create_report;
}
export async function sleep(time: number) {
    return new Promise(async (V) => {
        setTimeout(() => {
            V("")
        }, time)
    })
}



async function main() {
    
    //测试用例报告目录
    let report_path = "E:\\git_test\\cyfs-test-lab\\src\\cyfs-stack-test-typescript\\mochawesome-report"
    //测试版本号 这里取的是时间
    let version =  date.format(new Date(),'YYYY_MM_DD_HH_mm_ss');
    await uplaodTestcase(report_path,version)
}
main();





