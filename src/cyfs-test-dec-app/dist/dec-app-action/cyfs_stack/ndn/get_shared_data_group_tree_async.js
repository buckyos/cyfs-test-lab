"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildGetSharedDataGroupTreeAsync = void 0;
const action_1 = require("../../action");
const get_shared_data_1 = require("./get_shared_data");
class BuildGetSharedDataGroupTreeAsync extends action_1.BaseAction {
    async start(req) {
        this.action.type = "BuildGetSharedDataGroupTreeAsync";
        this.action.action_id = `BuildGetSharedDataGroupTreeAsync-${Date.now()}`;
        return await super.start(req);
    }
    async run(req) {
        let local = this.local;
        let task_result_list = [];
        for (let task of req.task_list) {
            let result = await get_shared_data_1.GetSharedDataAction.create_by_parent(this.action, this.logger).action.start({
                req_path: task.req_path,
                context: task.context_path,
                group: task.group,
                object_type: "chunk",
                chunk_size: 10 * 1024 * 1024,
            });
            task_result_list.push({
                err: result.err,
                log: result.log,
                send_time: result.resp.send_time,
                md5: result.resp.md5,
                req_path: task.req_path,
                group: task.group,
                context_path: task.context_path,
            });
        }
        return { err: 0, log: "success", resp: { task_list: task_result_list } };
    }
}
exports.BuildGetSharedDataGroupTreeAsync = BuildGetSharedDataGroupTreeAsync;
