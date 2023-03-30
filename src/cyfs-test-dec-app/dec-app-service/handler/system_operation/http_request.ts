import { ErrorCode, Logger, sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
import * as path from "path";
import { BaseHandler } from "../base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError,HandlerType } from "../../../dec-app-base"
import * as fs from "fs-extra"
import fetch from 'node-fetch';

export class HttpRequestHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "HttpRequestHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.OS_Network_HttpRequestReq) {
            return InvalidParamError
        }
        let request = req.OS_Network_HttpRequestReq;
        try {
            let response = await fetch(request.url, {
                method: request.method,
                body: request.data,
                headers: {'Content-Type': 'application/json'},
                timeout : 30*1000
            });
            const data = await response.json()
            if(response.status !=200){
                return {
                    OS_Network_HttpRequestResp: {
                        result: response.status,
                        msg: "http request fiald",
                        response : data.toString()
                    }
                }
            }
            this.logger.info(`send http request${request.url} success`);
            return {
                OS_Network_HttpRequestResp: {
                    result: 0,
                    msg: "success",
                    response : data.toString()
                }
            }
        } catch (error) {
            this.logger.error(`send http request error:${error}`);
            return {
                OS_Network_HttpRequestResp: {
                    result: 1,
                    msg: `${error}`,
                    response : ""
                }
            }
        }
        
    }
}
