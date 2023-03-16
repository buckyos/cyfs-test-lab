"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAction = exports.ActionAbstract = void 0;
const common_1 = require("../common");
var date = require("silly-datetime");
const cyfs_driver_client_1 = require("../cyfs-driver-client");
const action_manager_1 = require("./action_manager");
const data_manager = action_manager_1.ActionManager.createInstance();
class ActionAbstract {
}
exports.ActionAbstract = ActionAbstract;
class BaseAction {
    constructor(action, logger) {
        this.action = action;
        // 默认使用 StackManager 日志库
        if (logger) {
            this.logger = logger;
        }
        else {
            this.logger = cyfs_driver_client_1.StackManager.createInstance().get_logger();
        }
        this.child_actions = [];
    }
    async init_satck() {
        // 加载测试需要操作的协议栈
        let stack_manager = cyfs_driver_client_1.StackManager.createInstance();
        if (this.action.local) {
            let local_get = stack_manager.get_cyfs_satck(this.action.local);
            if (local_get.err) {
                this.logger.error(`${this.action.action_id} StackManager not found cyfs satck ${this.action.local.peer_name}`);
                return { err: common_1.ErrorCode.notFound, log: ` ${JSON.stringify(this.action.local)} 协议栈未初始化` };
            }
            else {
                this.logger.info(`${this.action.action_id} found stack local:  ${JSON.stringify(this.action.local.peer_name)}`);
                this.local = local_get.stack;
                this.action.local.device_id = this.local.local_device_id().object_id;
            }
        }
        if (this.action.remote) {
            let remote_get = stack_manager.get_cyfs_satck(this.action.remote);
            if (remote_get.err) {
                this.logger.error(`${this.action.action_id} StackManager not found cyfs satck ${JSON.stringify(this.action.remote.peer_name)}`);
                return { err: common_1.ErrorCode.notFound, log: ` ${JSON.stringify(this.action.remote.peer_name)} 协议栈未初始化` };
            }
            else {
                this.logger.info(`${this.action.action_id} found stack remote: ${this.action.remote.peer_name}`);
                this.remote = remote_get.stack;
                this.action.remote.device_id = this.remote.local_device_id().object_id;
            }
        }
        if (this.action.user_list) {
            this.user_list = [];
            for (let stack_info of this.action.user_list) {
                let statck_get = stack_manager.get_cyfs_satck(stack_info);
                if (statck_get.err) {
                    this.logger.error(`${this.action.action_id} StackManager not found cyfs satck ${stack_info.peer_name}`);
                    return { err: common_1.ErrorCode.notFound, log: ` ${JSON.stringify(stack_info)} 协议栈未初始化` };
                }
                else {
                    this.logger.info(`${this.action.action_id} found stack user: ${JSON.stringify(stack_info.peer_name)}`);
                    this.user_list.push(statck_get.stack);
                    stack_info.device_id = statck_get.stack.local_device_id().object_id;
                }
            }
        }
        return { err: common_1.ErrorCode.succ, log: "success" };
    }
    get_remote() {
        this.logger.error(`action ${this.action.action_id} use remote stack is unsafe`);
        return this.remote;
    }
    get_user_list() {
        this.logger.error(`action ${this.action.action_id} use user_list stack is unsafe`);
        return this.user_list;
    }
    async start(req) {
        this.logger.info(`<----------------------------- ${this.action.action_id} ${this.action.parent_action} start running -----------------------------> `);
        this.logger.debug(`${this.action.action_id} req = ${JSON.stringify(req)} `);
        // 记录自定义参数
        this.action.action_req = req;
        // 初始化结果统计
        this.action.output = {};
        // 加载测试操作
        let init = await this.init_satck();
        if (init.err) {
            return init;
        }
        // 执行测试任务
        return new Promise(async (V) => {
            try {
                // 创建超时检测
                if (!this.action.input.timeout) {
                    this.action.input.timeout = 60 * 1000;
                }
                let timer = setTimeout(async () => {
                    var _a;
                    this.action.result = { err: common_1.ErrorCode.timeout, log: `${this.action.action_id} ${this.action.local.peer_name} ${(_a = this.action.remote) === null || _a === void 0 ? void 0 : _a.peer_name} run timeout time = ${this.action.input.timeout}` };
                    this.logger.error(`run timeout ${JSON.stringify(this.action.result)}`);
                    if (this.action.expect.err && this.action.expect.err == common_1.ErrorCode.timeout) {
                        V({ err: common_1.ErrorCode.succ, log: `action run error ${this.action.expect.err} is expect` });
                    }
                    V({ err: common_1.ErrorCode.timeout, log: `${this.action.action_id} run timeout` });
                }, this.action.input.timeout);
                this.action.begin_date = date.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
                let result = await this.run(req);
                this.action.end_date = date.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
                this.logger.debug(`${this.action.action_id} resp = ${JSON.stringify(result)} `);
                // 释放超时检测
                clearTimeout(timer);
                this.action.result = result;
                data_manager.record_action(this.action);
                // 实际失败 预期失败
                if (this.action.result.err != 0 && this.action.result.err == this.action.expect.err) {
                    V({ err: common_1.ErrorCode.succ, log: `action run error ${this.action.expect.err} is expect` });
                }
                // 实际成功 预期失败
                if (this.action.result.err == 0 && this.action.expect.err != 0) {
                    V({ err: common_1.ErrorCode.fail, log: `action not error expect = ${this.action.expect.err}` });
                }
                // 预期成功 返回实际结果
                V(result);
            }
            catch (e) {
                //测试程序异常，进行捕获
                this.logger.error(`action run throw Error: ${e}`);
                V({ err: common_1.ErrorCode.exception, log: `${e}` });
            }
        });
    }
    async run(req) {
        // 默认没有操作
        return { err: common_1.ErrorCode.succ, log: "Action run success" };
    }
}
exports.BaseAction = BaseAction;
