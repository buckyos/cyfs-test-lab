import { Logger, LocalStorageJson, ErrorCode } from "../../common";

export type LocalServiceInfo = {
    serviceid: string;
    servicename: string;
    version: string;
};

export class LocalServiceStorage {
    private m_localStorage: LocalStorageJson;
    private m_localInfos: LocalServiceInfo[] = [];

    constructor(options: {
        logger: Logger,
        storage: LocalStorageJson,
    }) {
        this.m_localStorage = options.storage;
    }

    async init(): Promise<ErrorCode> {
        let serviceInfo = await this.m_localStorage.get('services');
        if (!serviceInfo.err && serviceInfo.value) {
            this.m_localInfos =  serviceInfo.value as LocalServiceInfo[];
        } else {
            this.m_localInfos = [];
        }

        return ErrorCode.succ;
    }

    async update(info: LocalServiceInfo): Promise<ErrorCode> {
        let oldInfo = this.getServiceInfo(info.serviceid);
        if (!oldInfo) {
            this.m_localInfos.push(info);
        } else {
            oldInfo.serviceid = info.serviceid;
            oldInfo.servicename = info.servicename;
            oldInfo.version = info.version;
        }
        await this.m_localStorage.set('services', this.m_localInfos);

        return ErrorCode.succ;
    }

    async delete(ids: string[]): Promise<ErrorCode> {
        let setIds: Set<string> = new Set();
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

        return ErrorCode.succ;
    }

    getServiceInfo(serviceid: string): LocalServiceInfo | null {
        for (let info of this.m_localInfos) {
            if (info.serviceid === serviceid) {
                return info;
            }
        }

        return null;
    }

    getAll(): LocalServiceInfo[] {
       return this.m_localInfos;
    }
}