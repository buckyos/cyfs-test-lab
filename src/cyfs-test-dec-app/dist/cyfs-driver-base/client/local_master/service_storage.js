"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalServiceStorage = void 0;
const common_1 = require("../../../common");
class LocalServiceStorage {
    constructor(options) {
        this.m_localInfos = [];
        this.m_localStorage = options.storage;
    }
    async init() {
        let serviceInfo = await this.m_localStorage.get('services');
        if (!serviceInfo.err && serviceInfo.value) {
            this.m_localInfos = serviceInfo.value;
        }
        else {
            this.m_localInfos = [];
        }
        return common_1.ErrorCode.succ;
    }
    async update(info) {
        let oldInfo = this.getServiceInfo(info.serviceid);
        if (!oldInfo) {
            this.m_localInfos.push(info);
        }
        else {
            oldInfo.serviceid = info.serviceid;
            oldInfo.servicename = info.servicename;
            oldInfo.version = info.version;
        }
        await this.m_localStorage.set('services', this.m_localInfos);
        return common_1.ErrorCode.succ;
    }
    async delete(ids) {
        let setIds = new Set();
        for (let id of ids) {
            setIds.add(id);
        }
        let temp = this.m_localInfos.slice();
        for (let entry of temp) {
            if (setIds.has(entry.serviceid)) {
                this.m_localInfos.splice(this.m_localInfos.indexOf(entry), 1);
            }
        }
        await this.m_localStorage.set('services', this.m_localInfos);
        return common_1.ErrorCode.succ;
    }
    getServiceInfo(serviceid) {
        for (let info of this.m_localInfos) {
            if (info.serviceid === serviceid) {
                return info;
            }
        }
        return null;
    }
    getAll() {
        return this.m_localInfos;
    }
}
exports.LocalServiceStorage = LocalServiceStorage;
