import {EventEmitter} from 'events';
import { FetchHelper } from './net';
import { ValidatorHelper } from './validtor';

export enum ServiceAgentScope {
    all = 1,
    lan = 2,
    wan = 3,
}

export type ServiceEntry = {
    serviceid: string;
    servicename: string;
    version: string;
    url: string;
    agentscope: ServiceAgentScope;
};

export class ServiceProvider extends EventEmitter {
    public static AddUrl: string ='/service/add';
    public static RemoveUrl: string = '/service/remove';
    public static UpdateUrl: string ='/service/update';
    public static ListUrl: string = '/service/list';
    public static StopUrl: string = '/service/stop';
    public static DetailUrl: string = '/service/detail';
    public static s_instance: ServiceProvider = new ServiceProvider();

    private m_entrys: ServiceEntry[] = [];
    private m_listing: boolean = false;

    on(event: 'listupdate', listener: (provider: ServiceProvider) => void): this;
    on(event: 'opterror', listener: (provider: ServiceProvider, opt: string, msg: string) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'listupdate', listener: (provider: ServiceProvider) => void): this;
    once(event: 'opterror', listener: (provider: ServiceProvider, opt: string, msg: string) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    
    public static getInstance(): ServiceProvider {
        return ServiceProvider.s_instance;
    }

    public static async stopService(agentid: string, serviceid: string): Promise<{succ: boolean, msg?: string}> {
        let body= {
            agentid,
            serviceid,
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(ServiceProvider.StopUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${ServiceProvider.StopUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${ServiceProvider.StopUrl}`);
            return {succ: false, msg:'服务器返回失败'};
        }

        return {succ: true};
    }

    public static validServiceName(name: string): {succ: boolean, msg?: string} {
        return ValidatorHelper.validFileName(name);
    }


    public getServices(): ServiceEntry[] {
        return this.m_entrys;
    }

    public add(param: {
        servicename: string;
        version: string;
        url: string;
        md5: string;
        agentscope: number;
    }) {
        this._add(param);
    }

    private async _add(param: {
        servicename: string;
        version: string;
        url: string;
        md5: string;
        agentscope: number;
    }) {
        let option: any = {
            body: param,
        };

        let resp = await FetchHelper.PostFetch(ServiceProvider.AddUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${ServiceProvider.AddUrl}`);
            this._onError('add', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${ServiceProvider.AddUrl}`);
            this._onError('add', '服务器返回失败');
            return ;
        }

        for (let entry of this.m_entrys) {
            if (entry.serviceid === resp.value!.serviceid) {
                return;
            }
        }

        this.m_entrys.push({
            serviceid: resp.value!.serviceid,
            servicename: param.servicename,
            version: param.version,
            url: param.url,
            agentscope: param.agentscope,
        });

        this.emit('listupdate', this);
    }

    public remove(serviceid: string) {
        this._remove(serviceid);
    }

    private async _remove(serviceid: string) {
        let body = {
            serviceid,
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(ServiceProvider.RemoveUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${ServiceProvider.RemoveUrl}`);
            this._onError('remove', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${ServiceProvider.RemoveUrl}`);
            this._onError('remove', '服务器返回失败');
            return ;
        }

        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].serviceid === serviceid) {
                this.m_entrys.splice(i, 1);
                break;
            }
        }

        this.emit('listupdate', this);
    }

    public update(param: {
        serviceid: string;
        servicename?: string;
        version?: string;
        url?: string;
        md5?: string;
        agentscope?: ServiceAgentScope;
    }) {
        this._update(param);
    }

    private async _update(param: {
        serviceid: string;
        servicename?: string;
        version?: string;
        url?: string;
        md5?: string;
        agentscope?: ServiceAgentScope;
        nowin?: string;
    }) {
        let body: any = {
            serviceid: param.serviceid,
        };
        if (param.servicename) {
            body.servicename = param.servicename!;
        }
        if (param.version) {
            body.version = param.version!;
        }
        if (param.url && param.md5) {
            body.url = param.url!;
            body.md5 = param.md5!;
        }
        if (param.agentscope) {
            body.agentscope = param.agentscope!;
        }
        if (param.nowin) {
            body.nowin = param.nowin;
        }

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(ServiceProvider.UpdateUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${ServiceProvider.UpdateUrl}`);
            this._onError('update', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${ServiceProvider.UpdateUrl}`);
            this._onError('update', '服务器返回失败');
            return ;
        }

        // let exist: boolean = false;
        // for (let entry of this.m_entrys) {
        //     if (entry.serviceid === body.serviceid) {
        //         Object.entries(param).forEach((item) => {
        //             (entry as any)[item[0]] = item[1]!;
        //         })
        //         exist = true;
        //         break;
        //     }
        // }

        // if (exist) {
        //     this.emit('listupdate', this);
        // }

        await this._list();
    }

    public list() {
        this._list();
    }

    private async _list() {
        if (this.m_listing) {
            return ;
        }

        this.m_listing = true;
        // return await new Promise((v) => {
        //     setTimeout(() => {
        //         this.m_entrys = [];
        //         this.m_entrys.push({
        //             serviceid: '1',
        //             servicename: 'bdt1',
        //             version: '1.1',
        //             url: 'http://www.baidu.com/index.html',
        //             agentscope: ServiceAgentScope.lan,
        //         });
        //         this.m_entrys.push({
        //             serviceid: '2',
        //             servicename: 'bdt2',
        //             version: '1.1',
        //             url: 'http://www.baidu.com/index.html',
        //             agentscope: ServiceAgentScope.wan,
        //         });
        //         this.m_entrys.push({
        //             serviceid: '3',
        //             servicename: 'bdt3',
        //             version: '1.1',
        //             url: 'http://www.baidu.com/index.html',
        //             agentscope: ServiceAgentScope.all,
        //         });
        //         this.m_listing = false;
        //         this.emit('listupdate', this);
        //         v();
        //     }, 300);
        // });
        let option: any = {
            body: {},
        };

        let resp = await FetchHelper.PostFetch(ServiceProvider.ListUrl, option);
        this.m_listing = false;
        if (resp.err) {
            console.log(`request server failed, url=${ServiceProvider.ListUrl}`);
            this._onError('list', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${ServiceProvider.ListUrl}`);
            this._onError('list', '服务器返回失败');
            return ;
        }

        this.m_entrys = resp.value!.services;
        this.emit('listupdate', this);
    }

    private _onError(opt: string, msg: string) {
        this.emit('opterror', this, opt, msg);
    }
}