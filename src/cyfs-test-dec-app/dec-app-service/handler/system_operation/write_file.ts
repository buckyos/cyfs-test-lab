import { ErrorCode, Logger, sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
import * as path from "path";
import { BaseHandler } from "../base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError,HandlerType } from "../../../dec-app-base"
import * as fs from "fs-extra"


export class WriteFIleHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "WriteFIleHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.OS_IO_WriteFileReq) {
            return InvalidParamError
        }
        let request = req.OS_IO_WriteFileReq;
        try {
            let result = fs.writeFileSync(request.file_path,request.data);
            console.error(`write file ${request.file_path} success`);
            return {
                OS_IO_WriteFileResp: {
                    result: 0,
                    msg: "success",
                }
            }
        } catch (error) {
            console.error(`write file ${request.file_path} error:${error}`);
            return {
                OS_IO_WriteFileResp: {
                    result: 1,
                    msg: `${error}`,
    
                }
            }
        }
        
    }
}
