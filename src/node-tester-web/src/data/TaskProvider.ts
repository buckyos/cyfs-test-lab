import {EventEmitter} from 'events';
import { FetchHelper } from './net';

//任务执行要求
export enum RunRule {
    //同一个任务可以并行执行，但是不能在同一个机器
    atTheSameTime = 2,

    //同一个任务只能串行执行
    oneByOne = 1,
}

//部署要求
export enum DistributeRule {
    //必须和它的软件包在同一个agent
    withService = 2,

    //可以部署到任何angent
    anyWhere = 1,
}

export type TaskEntry = {
    taskid: string;
    serviceid: string;
    servicename: string;
    version: string;
    desc: string;
    url: string;
    runrule: RunRule;
    distribute: DistributeRule;
}

export class TaskProvider extends EventEmitter {
    public static AddUrl: string ='/task/add';
    public static RemoveUrl: string = '/task/remove';
    public static UpdateUrl: string ='/task/update';
    public static ListUrl: string = '/task/list';
    public static StopUrl: string = '/task/stop';
    public static DetailUrl: string = '/task/detail';
    public static s_instance: TaskProvider = new TaskProvider();

    private m_entrys: TaskEntry[] = [];
    private m_listing: boolean = false;

    on(event: 'listupdate', listener: (provider: TaskProvider) => void): this;
    on(event: 'opterror', listener: (provider: TaskProvider, opt: string, msg: string) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'listupdate', listener: (provider: TaskProvider) => void): this;
    once(event: 'opterror', listener: (provider: TaskProvider, opt: string, msg: string) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    
    public static getInstance(): TaskProvider {
        return TaskProvider.s_instance;
    }

    public static async stopTask(jobid: string, taskid: string): Promise<{succ: boolean, msg?: string}> {
        alert(22);
        let body= {
            jobid,
            taskid,
        };

        let option: any = {
            body,
        };

        alert(3);
        let resp = await FetchHelper.PostFetch(TaskProvider.StopUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${TaskProvider.StopUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${TaskProvider.StopUrl}`);
            return {succ: false, msg:'服务器返回失败'};
        }

        return {succ: true};
    }

    public getTasks(): TaskEntry[] {
        return this.m_entrys;
    }

    public add(param:{
        serviceid: string;
        servicename: string;
        version: string;
        desc: string;
        url: string;
        md5: string;
        runrule: RunRule;
        distribute: DistributeRule;
    }) {
        this._add(param);
    }

    private async _add(param:{
        serviceid: string;
        servicename: string;
        version: string;
        desc: string;
        url: string;
        md5: string;
        runrule: RunRule;
        distribute: DistributeRule;
    }) {
        let option = {
            body: param,
        };

        let resp = await FetchHelper.PostFetch(TaskProvider.AddUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${TaskProvider.AddUrl}`);
            this._onError('add', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${TaskProvider.AddUrl}`);
            this._onError('add', '服务器返回失败');
            return ;
        }

        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].taskid === resp.value!.taskid) {
                return;
            }
        }

        this.m_entrys.push({
            taskid: resp.value!.taskid,
            serviceid: param.serviceid,
            servicename: param.servicename,
            version: param.version,
            desc: param.desc,
            url: param.url,
            runrule: param.runrule,
            distribute: param.distribute,
        });

        this.emit('listupdate', this);
    }

    public remove(taskid: string) {
        this._remove(taskid);
    }

    private async _remove(taskid: string) {
        let body = {
            taskid,
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(TaskProvider.RemoveUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${TaskProvider.RemoveUrl}`);
            this._onError('remove', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${TaskProvider.RemoveUrl}`);
            this._onError('remove', '服务器返回失败');
            return ;
        }

        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].taskid === taskid) {
                this.m_entrys.splice(i, 1);
                break;
            }
        }

        this.emit('listupdate', this);
    }

    public update(param:{
        taskid: string;
        version: string;
        desc: string;
        url: string;
        md5: string;
        runrule: RunRule;
        distribute: DistributeRule;
    }) {
        this._update(param);
    }

    private async _update(param:{
        taskid: string;
        version: string;
        desc: string;
        url: string;
        md5: string;
        runrule: RunRule;
        distribute: DistributeRule;
    }) {
        let body: any = {
            taskid: param.taskid,
        };
        if (param.version) {
            body.version = param.version;
        }
        if (param.desc) {
            body.desc = param.desc;
        }
        if (param.url && param.md5) {
            body.url = param.url!;
            body.md5 = param.md5!;
        }
        if (param.runrule) {
            body.runrule = param.runrule;
        }
        if (param.distribute) {
            body.distribute = param.distribute;
        }

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(TaskProvider.UpdateUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${TaskProvider.UpdateUrl}`);
            this._onError('update', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${TaskProvider.UpdateUrl}`);
            this._onError('update', '服务器返回失败');
            return ;
        }

        // let exist: boolean = false;
        // for (let entry of this.m_entrys) {
        //     if (entry.taskid === body.taskid) {
        //         Object.entries(param).forEach((item) => {
        //             (entry as any)[item[0]] = (entry as any)[item[1]];
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
            return;
        }


        this.m_listing = true;

        // return await new Promise((v) => {
        //     setTimeout(() => {
        //         this.m_entrys = [];
        //         this.m_entrys.push({
        //             taskid: '1',
        //             serviceid: '1',
        //             servicename: 'bdt1',
        //             version: '1.1',
        //             desc: '测试描述',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.atTheSameTime,
        //             distribute: DistributeRule.withService,
        //         });

        //         this.m_entrys.push({
        //             taskid: '2',
        //             serviceid: '1',
        //             servicename: 'bdt1',
        //             version: '1.1',
        //             desc: '测试描述',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.atTheSameTime,
        //             distribute: DistributeRule.withService,
        //         });

        //         this.m_entrys.push({
        //             taskid: '3',
        //             serviceid: '2',
        //             servicename: 'bdt2',
        //             version: '1.2',
        //             desc: '测试描述2222222',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.oneByOne,
        //             distribute: DistributeRule.anyWhere,
        //         });

        //         this.m_entrys.push({
        //             taskid: '4',
        //             serviceid: '2',
        //             servicename: 'bdt2',
        //             version: '1.2',
        //             desc: '测试描述2222222',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.oneByOne,
        //             distribute: DistributeRule.anyWhere,
        //         });

        //         this.m_entrys.push({
        //             taskid: '5',
        //             serviceid: '3',
        //             servicename: 'bdt3',
        //             version: '1.2',
        //             desc: '测试描述33333',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.oneByOne,
        //             distribute: DistributeRule.anyWhere,
        //         });

        //         this.m_entrys.push({
        //             taskid: '6',
        //             serviceid: '3',
        //             servicename: 'bdt3',
        //             version: '1.2',
        //             desc: '测试描述33333',
        //             url: 'http://www.baidu.com/index.html',
        //             runrule: RunRule.oneByOne,
        //             distribute: DistributeRule.anyWhere,
        //         });

        //         this.m_listing = false;
                
        //         this.emit('listupdate', this);
        //         v();
        //     }, 200);
        // });

        let option: any = {
            body: {},
        };

        let resp = await FetchHelper.PostFetch(TaskProvider.ListUrl, option);
        this.m_listing = false;
        if (resp.err) {
            console.log(`request server failed, url=${TaskProvider.ListUrl}`);
            this._onError('list', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${TaskProvider.ListUrl}`);
            this._onError('list', '服务器返回失败');
            return ;
        }

        this.m_entrys = resp.value!.tasks;
        this.emit('listupdate', this);
    }

    private _onError(opt: string, msg: string) {
        this.emit('opterror', this, opt, msg);
    }
}