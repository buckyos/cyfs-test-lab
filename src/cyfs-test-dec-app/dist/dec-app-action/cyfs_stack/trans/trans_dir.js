"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransDirAction = void 0;
const action_1 = require("../../action");
const common_1 = require("../../../common");
class TransDirAction extends action_1.BaseAction {
    async run(req) {
        return { err: common_1.ErrorCode.succ, log: "run success" };
    }
}
exports.TransDirAction = TransDirAction;
