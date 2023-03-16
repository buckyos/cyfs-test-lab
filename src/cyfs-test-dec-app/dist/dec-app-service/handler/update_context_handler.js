"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContextHandler = void 0;
const cyfs = __importStar(require("../../cyfs"));
const base_handler_1 = require("./base_handler");
const dec_app_base_1 = require("../../dec-app-base");
/**
 * 操作描述：
 * handler：remote 监听文件传输行为（ 参数group 设置传输组,get_object 获取file 对象，post_object 获取context对象，trans 创建传输任务，完成下载流程）
 */
class UpdateContextHandler extends base_handler_1.BaseHandler {
    async start(req) {
        // 封装一些操作
        this.handler_info.type = "UpdateContextHandler";
        return await super.start(req);
    }
    async run(req) {
        var _a, _b, _c;
        // 默认没有操作返回报错
        if (!req.UpdateContextHandlerReq) {
            return dec_app_base_1.InvalidParamError;
        }
        let param = req.UpdateContextHandlerReq;
        let context_id = cyfs.ObjectId.from_base_58(param.context_id).unwrap();
        // 获取文件对象
        let get_context = await this.stack.trans().get_context({
            common: {
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.NDC,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context_id,
        });
        if (get_context.err) {
            return {
                UpdateContextHandlerResp: {
                    result: get_context.val.code,
                    msg: get_context.val.msg,
                }
            };
        }
        let context_cache = get_context.unwrap().context;
        if (param.deviceid_list) {
            context_cache.body_expect().content().device_list = [];
            for (let device of param.deviceid_list) {
                let chunk_codec_desc = cyfs.ChunkCodecDesc.Stream();
                if ((_a = param.chunk_codec_desc) === null || _a === void 0 ? void 0 : _a.stream) {
                    //param.chunk_codec_desc.stream[0],param.chunk_codec_desc.stream[1],param.chunk_codec_desc.stream[2]
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Stream();
                }
                else if ((_b = param.chunk_codec_desc) === null || _b === void 0 ? void 0 : _b.raptor) {
                    //param.chunk_codec_desc?.raptor[0],param.chunk_codec_desc?.raptor[1],param.chunk_codec_desc?.raptor[2]
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Raptor();
                }
                else if ((_c = param.chunk_codec_desc) === null || _c === void 0 ? void 0 : _c.unknown) {
                    chunk_codec_desc = cyfs.ChunkCodecDesc.Unknown();
                }
                let device_id = cyfs.DeviceId.from_base_58(device.toString()).unwrap();
                this.logger.info(`${context_cache.desc().calculate_id().to_base_58()} context add device source ${device_id} ${JSON.stringify(chunk_codec_desc)}`);
                context_cache.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id, chunk_codec_desc));
            }
        }
        context_cache.body_expect().increase_update_time(cyfs.bucky_time_now());
        let put_context = await this.stack.trans().put_context({
            common: {
                dec_id: this.stack.dec_id,
                // api级别
                level: cyfs.NDNAPILevel.NDC,
                // 需要处理数据的关联对象，主要用以chunk/file等
                flags: 1,
            },
            context: context_cache,
            access: cyfs.AccessString.full(),
        });
        if (put_context.err) {
            return {
                UpdateContextHandlerResp: {
                    result: put_context.val.code,
                    msg: put_context.val.msg,
                }
            };
        }
        return {
            UpdateContextHandlerResp: {
                result: 0,
                msg: "success",
            }
        };
    }
}
exports.UpdateContextHandler = UpdateContextHandler;
