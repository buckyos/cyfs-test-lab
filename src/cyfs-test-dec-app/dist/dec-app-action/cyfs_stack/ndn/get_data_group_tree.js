"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildGetDataGroupTree = void 0;
const action_1 = require("../../action");
const get_data_1 = require("./get_data");
class BuildGetDataGroupTree extends action_1.BaseAction {
    async start(req) {
        this.action.type = "BuildGetDataGroupTree";
        this.action.action_id = `BuildGetDataGroupTree-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        let task_result_list = [];
        let task_running_list = [];
        for (let task of req.task_list) {
            task_running_list.push(get_data_1.GetDataAction.create_by_parent(this.action, this.logger).action.start({
                req_path: task.req_path,
                context: task.context_path,
                group: task.group,
                object_type: "chunk",
                chunk_size: 4 * 1024 * 1024,
            }));
        }
        for (let index in task_running_list) {
            let task_action = await task_running_list[index];
            task_result_list.push({
                err: task_action.err,
                log: task_action.log,
                send_time: task_action.resp.send_time,
                md5: task_action.resp.md5,
                req_path: req.task_list[index].req_path,
                group: req.task_list[index].group,
                context_path: req.task_list[index].context_path,
            });
        }
        return { err: 0, log: "success", resp: { task_list: task_result_list } };
    }
}
exports.BuildGetDataGroupTree = BuildGetDataGroupTree;
