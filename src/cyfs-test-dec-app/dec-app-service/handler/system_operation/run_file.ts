import { ErrorCode, Logger, sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
import * as path from "path";
import { BaseHandler } from "../base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError,HandlerType } from "../../../dec-app-base"
import * as fs from "fs-extra"

import * as ChildProcess from 'child_process';

export class RunFIleHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "RunFIleHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.OS_IO_RunFileReq) {
            return InvalidParamError
        }
        let request = req.OS_IO_RunFileReq;
        let output = ""
        return new Promise(async(resolve)=>{
            try {
                if(request.cmd){
                    let process = ChildProcess.exec(request.cmd)
                    //process.on("spawn")
                    process!.stdout!.on('data',(data)=>{
                        output = output + data;
                    });
                    process.on("exit",(code,signal)=>{
                        output = output + `exit code = ${code} , signal = ${signal}`
                        resolve({
                            OS_IO_RunFileResp: {
                                result: 0,
                                msg: `success`,
                                output : output
                            }
                        })
                    })
                    process.on("error",(err)=>{
                        resolve({
                            OS_IO_RunFileResp: {
                                result: 1,
                                msg: `${err}`,
                                output : output
                            }
                        }) 
                    })
                }else{
                    let process = ChildProcess.execFile(request.file_path!)
                    process!.stdout!.on('data',(data)=>{
                        output = output + data;
                    });
                    process.on("exit",(code,signal)=>{
                        output = output + `exit code = ${code} , signal = ${signal}`
                        resolve({
                            OS_IO_RunFileResp: {
                                result: 0,
                                msg: `success`,
                                output : output
                            }
                        })
                    })
                    process.on("error",(err)=>{
                        resolve({
                            OS_IO_RunFileResp: {
                                result: 1,
                                msg: `${err}`,
                                output : output
                            }
                        }) 
                    })
                }
                console.error(`run command ${request} success`);
                
            } catch (error) {
                console.error(`run file ${request.file_path} error:${error}`);
                resolve({
                    OS_IO_RunFileResp: {
                        result: 1,
                        msg: `${error}`,
                        output : output
                    }
                }) 
            }
        })
        
        
    }
}
