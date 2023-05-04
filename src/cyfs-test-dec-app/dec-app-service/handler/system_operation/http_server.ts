import { ErrorCode, Logger, sleep } from '../../../common';
import * as cyfs from "../../../cyfs";
import * as path from "path";
import { BaseHandler } from "../base_handler"
import { HandlerRequestObject, HandlerRequestObjectDecoder, HandlerApi, NotFoundError, InvalidParamError,HandlerType } from "../../../dec-app-base"
import * as fs from "fs-extra"
import express from "express";


function get_ip_info(){
    var interfaces = require('os').networkInterfaces();
    var IPv4List:Array<string> = []
    var IPv6List:Array<string> = []
    for(var devName in interfaces){
        var iface = interfaces[devName];
        for(var i=0;i<iface.length;i++){
            var alias = iface[i];
            if( alias.family == 'IPv4' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                IPv4List.push(alias.address);
            }
            if( alias.family == 'IPv6' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                IPv6List.push(alias.address);
            }
        }
    }
    return {IPv4:IPv4List,IPv6:IPv6List}
}

export class HttpServerHandler extends BaseHandler {
    async start(req: HandlerRequestObject): Promise<HandlerRequestObject> {
        // 封装一些操作
        this.handler_info.type = "HttpServerHandler"
        return await super.start(req);
    }
    async run(req: HandlerApi): Promise<HandlerApi> {
        // 默认没有操作返回报错
        if (!req.OS_Network_HttpListernReq) {
            return InvalidParamError
        }
        let ip_info = get_ip_info();
        let request = req.OS_Network_HttpListernReq
        try {
            const app = express();
            app.get('/', (req, res) => {
                res.send('Hello World');
            });
            app.get('/get_time', (req, res) => {
                res.send(`hello now is ${Date.now()}`);
            });
            app.get('/get_ip', (req, res) => {
                res.send(`${get_ip_info()}`);
            });
            app.listen(request.port, () => {
                console.log(`Server running on port ${request.port}`);
            });
            console.error(`start http server success port = ${request.port}`);
            return {
                OS_Network_HttpListernResp: {
                    result: 0,
                    msg: `start http server success`,
                    ip : `${ip_info}`
                }
            }
        } catch (error) {
            console.error(`start http server error = ${error}`);
            return {
                OS_Network_HttpListernResp: {
                    result: 1,
                    msg: `${error}`,
                    ip : `${ip_info}`
                }
            }
        }
        
    }
}
