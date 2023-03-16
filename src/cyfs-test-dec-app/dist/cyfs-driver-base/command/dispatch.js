"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDispatch = void 0;
const errcode_1 = require("../../common/errcode");
class CommandDispatch {
    constructor() {
        this.m_handler = new Map();
        this.m_cookie = 1;
    }
    addHandler(cmdname, handler, filter) {
        if (!this.m_handler.has(cmdname)) {
            this.m_handler.set(cmdname, []);
        }
        let cookie = this.m_cookie++;
        this.m_handler.get(cmdname).push({ cookie, handler, filter });
        return { err: errcode_1.ErrorCode.succ, cookie };
    }
    removeHandler(cmdname, cookie) {
        if (!this.m_handler.has(cmdname)) {
            console.log(`[stack] handler not exist when remove handler`);
            return errcode_1.ErrorCode.notExist;
        }
        let items = this.m_handler.get(cmdname);
        for (let i = 0; i < items.length; i++) {
            if (items[i].cookie === cookie) {
                items.splice(i, 1);
                break;
            }
        }
        if (!items.length) {
            this.m_handler.delete(cmdname);
        }
        return errcode_1.ErrorCode.succ;
    }
    dispatch(c) {
        if (!this.m_handler.has(c.name)) {
            return { err: errcode_1.ErrorCode.succ, handled: false };
        }
        let items = this.m_handler.get(c.name).slice();
        for (let i = 0; i < items.length; i++) {
            if (!items[i].filter || items[i].filter(c)) {
                items[i].handler(c);
            }
        }
        return { err: errcode_1.ErrorCode.succ, handled: true };
    }
}
exports.CommandDispatch = CommandDispatch;
