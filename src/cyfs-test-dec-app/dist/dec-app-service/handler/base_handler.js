"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseHandler = void 0;
const dec_app_base_1 = require("../../dec-app-base");
const common_1 = require("../../common");
class BaseHandler {
    constructor(stack, local, logger) {
        this.stack = stack;
        this.handler_info = {
            local
        };
        this.logger = logger;
    }
    async start(req) {
        // 封装一些操作
        // 捕获异常
        try {
            this.handler_info.action_id = req.id;
            let json_data = JSON.parse(req.request_json);
            let buffer = req.request_buffer;
            // 运行总时间统计
            let begin_run = Date.now();
            let result = await this.run(json_data);
            let total_time = Date.now() - begin_run;
            return dec_app_base_1.HandlerRequestObject.create(this.stack.local_device_id().object_id, req.request_type, req.id, JSON.stringify(result), Buffer.from(""));
        }
        catch (err) {
            this.logger.error(`${JSON.stringify(err)}`);
            let result = {
                InvalidParam: {
                    result: common_1.ErrorCode.invalidParam,
                    msg: `decode request param error =${JSON.stringify(err)}`,
                    data: req.request_json
                }
            };
            return dec_app_base_1.HandlerRequestObject.create(this.stack.local_device_id().object_id, req.request_type, req.id, JSON.stringify(result), Buffer.from(""));
        }
    }
    async run(req) {
        // 默认没有操作返回报错
        return dec_app_base_1.NotFoundError;
    }
}
exports.BaseHandler = BaseHandler;
