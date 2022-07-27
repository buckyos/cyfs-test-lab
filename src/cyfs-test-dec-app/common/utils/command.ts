import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import {
    Some,
    BuckyString,
    BuckyResult,
    NONAPILevel,
    NONSelectObjectOutputRequest,
    ObjectId,
    RouterHandlerPostObjectRequest,
    RouterHandlerPostObjectResult,
    NONObjectInfo, NONPutObjectOutputRequest
} from "../../cyfs";
import {commonPostResponse, CommonPostResponseStatus} from "../../common/utils/common";

export async function runCommand(param:RouterHandlerPostObjectRequest, route: string, requestData: Object):Promise<BuckyResult<RouterHandlerPostObjectResult>> {
    let {cmd}= 
    requestData as {
        cmd: string
    }
    return new Promise(async(v)=>{
        console.info(`runCommand`)
        // `.\\node_modules\\.bin\\mocha .\\dec_service\\testcase\\unittest_stack_interface\\test_NDN_interface.js  --reporter mochawesome --require ts-node/register`
        let process = ChildProcess.exec(cmd)
        process.on('exit', (code: number, singal: any)=> {
            v(commonPostResponse(param, route,CommonPostResponseStatus.success, {      
                message: "ok",
            }))
        });
        process.stdout?.on('data', (data) => {
            let str:string = `${data.toString()}`;
            console.info(`***${str}`)
        });
    })
}


