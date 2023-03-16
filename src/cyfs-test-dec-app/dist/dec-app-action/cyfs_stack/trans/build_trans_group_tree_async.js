"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildTransGroupTreeAsync = void 0;
const action_1 = require("../../action");
const prepare_file_task_1 = require("./prepare_file_task");
const handler_1 = require("../handler");
/**
 * 操作描述：
 *
 * 设备 ：file_source_device 发布文件的设备，默认是local
 * 设备 ：local  协议栈中保存文件的设备
 * 设备 ：remote 协议栈中文件下载端
 *
 * 流程
 * （1）remote： 创建 handler 监听器,监听其他设备的post object 请求
 * （2)local： local ： PublishFileAction 上传文件
 * （3) local: 文件访问权限的修改 ： local修改指定req_path的权限为full
 * （4）local: 将文件对象挂载root_state 路径req_path上
 *  (5) loacl: 发送post_object HandlerRequest TransFileRequest 到remote设备
    * （6）remote: remote 触发handler 执行下载文件流程
    * （7）remote: 从local 设备获取file 对象信息
    * （8）remote: 根据local 提供的device_list构造context
    * （9）remote: create_task 开始传输文件，检查传输任务直到完成
    *  (10) remote: remote 返回 handler执行结果
*  (11) loacl: loacl收到post_object返回结果
 */
class BuildTransGroupTreeAsync extends action_1.BaseAction {
    async start(req) {
        this.action.type = "BuildTransGroupTreeAsync";
        this.action.action_id = `BuildTransGroupTreeAsync-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        var _a;
        let local = this.local;
        let action_handler = await handler_1.RegisterCommonHandler.create_by_parent(this.action, this.logger).action.start({
            req_path: req.root_req_path,
        });
        this.logger.info(`add handler : ${action_handler}`);
        let task_result_list = [];
        for (let task of req.task_list) {
            let task_action = await prepare_file_task_1.PrepareFileTask.create_by_parent(this.action, this.logger).action.start({
                req_path: task.req_path,
                context_path: task.context_path,
                group: task.group,
                auto_start: true
            });
            task_result_list.push({
                err: task_action.err,
                log: task_action.log,
                task_id: (_a = task_action.resp) === null || _a === void 0 ? void 0 : _a.task_id,
                req_path: task.req_path,
                group: task.group,
                context_path: task.context_path,
            });
        }
        return { err: 0, log: "success", resp: { task_list: task_result_list } };
    }
}
exports.BuildTransGroupTreeAsync = BuildTransGroupTreeAsync;
