import {EventEmitter} from 'events';
import { FetchHelper } from './net';


export type JobEntry = {
    jobid: string;
    desc: string;
    serviceid: string;
    servicename: string;
    status: number;
}

export type JobTaskEntry = {
    taskid: string;
    desc: string;
    status: number;
    timeslimit: number;
    runTimes: number;
}

export class JobProvider extends EventEmitter {
    public static AddUrl: string ='/job/add';
    public static RemoveUrl: string = '/job/remove';
    public static ListUrl: string = '/job/list';
    public static StopUrl: string = '/job/stop';
    public static StartUrl: string = '/job/start';
    public static TasksDetailUrl: string = '/job/listtask';
    public static TaskResult: string = '/job/taskresult';
    public static s_instance: JobProvider = new JobProvider();

    private m_entrys: JobEntry[] = [];
    private m_jobTasks: Map<string, JobTaskEntry[]> = new Map();
    private m_listing: boolean = false;

    on(event: 'listupdate', listener: (provider: JobProvider) => void): this;
    on(event: 'itemupdate', listener: (provider: JobProvider, jobid: string) => void): this;
    on(event: 'opterror', listener: (provider: JobProvider, opt: string, msg: string) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'listupdate', listener: (provider: JobProvider) => void): this;
    once(event: 'itemupdate', listener: (provider: JobProvider, jobid: string) => void): this;
    once(event: 'opterror', listener: (provider: JobProvider, opt: string, msg: string) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    
    public static getInstance(): JobProvider {
        return JobProvider.s_instance;
    }

    public getJobs(): JobEntry[] {
        return this.m_entrys;
    }

    public getJobTasks(jobid: string): JobTaskEntry[] {
        if (this.m_jobTasks.has(jobid)) {
            return this.m_jobTasks.get(jobid)!;
        }

        return [];
    }

    public stop(jobid: string) {
        this._stop(jobid);
    }

    private async _stop(jobid: string) {
        let entry = this._findJobById(jobid);
        if (!entry.entry) {
            this._onError("stop", "没有找到对应的JOB");
            return ;
        }
        if (entry.entry.status === 0) {
            this._onError("stop", "该JOB处于停止状态");
            return ;
        }

        let body= {
            jobid
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(JobProvider.StopUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.StopUrl}`);
            this._onError('stop', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.StopUrl}`);
            this._onError('stop', '服务器返回失败');
            return ;
        }

        await this._list();
    }

    public start(jobid: string) {
        this._start(jobid);
    }

    private async _start(jobid: string) {
        let entry = this._findJobById(jobid);
        if (!entry.entry) {
            this._onError("stop", "没有找到对应的JOB");
            return ;
        }
        if (entry.entry.status === 1) {
            this._onError("stop", "该JOB处于运行状态");
            return ;
        }

        let body= {
            jobid
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(JobProvider.StartUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.StartUrl}`);
            this._onError('stop', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.StartUrl}`);
            this._onError('stop', '服务器返回失败');
            return ;
        }

        await this._list();
    }

    public add(param: {
        serviceid:string,
        servicename: string,
        desc: string,
        tasks: {taskid: string, times: number}[]
    }) {
        this._add(param);
    }

    private async _add(param: {
        serviceid:string,
        servicename: string,
        desc: string,
        tasks: {taskid: string, times: number}[]
    }) {
        let str = JSON.stringify(param);
        let body = JSON.parse(str);
        let option = {
            body
        };

        let resp = await FetchHelper.PostFetch(JobProvider.AddUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.AddUrl}`);
            this._onError('add', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.AddUrl}`);
            this._onError('add', '服务器返回失败');
            return ;
        }

        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].jobid === resp.value!.jobid) {
                return;
            }
        }

        this.m_entrys.push({
            jobid: resp.value!.jobid,
            serviceid: body.serviceid,
            servicename: body.servicename,
            desc: body.desc,
            status: 0
        });

        this.emit('listupdate', this);
    }

    public remove(jobid: string) {
        this._remove(jobid);
    }

    private async _remove(jobid: string) {
        let body = {
            jobid,
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(JobProvider.RemoveUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.RemoveUrl}`);
            this._onError('remove', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.RemoveUrl}`);
            this._onError('remove', '服务器返回失败');
            return ;
        }

        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].jobid === jobid) {
                this.m_entrys.splice(i, 1);
                break;
            }
        }

        this.emit('listupdate', this);
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
        //             jobid: '1',
        //             serviceid: '1',
        //             servicename: 'bdt1',
        //             desc: '工作描述',
        //             status: 1,
        //         });

        //         this.m_entrys.push({
        //             jobid: '2',
        //             serviceid: '2',
        //             servicename: 'bdt2',
        //             desc: '工作描述3',
        //             status: 0,
        //         });

        //         this.m_entrys.push({
        //             jobid: '3',
        //             serviceid: '3',
        //             servicename: 'bdt3',
        //             desc: '工作描述2',
        //             status: 0,
        //         });

        //         this.m_listing = false;
                
        //         this.emit('listupdate', this);
        //         v();
        //     }, 200);
        // });

        let option: any = {
            body: {},
        };

        let resp = await FetchHelper.PostFetch(JobProvider.ListUrl, option);
        this.m_listing = false;
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.ListUrl}`);
            this._onError('list', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.ListUrl}`);
            this._onError('list', '服务器返回失败');
            return ;
        }

        this.m_entrys = resp.value!.jobs;
        this.emit('listupdate', this);
    }

    public listtask(jobid: string) {
        this._listtask(jobid);
    }

    private async _listtask(jobid: string) {
        // this.m_jobTasks.set("1", [
        //     {
        //         taskid: '1',
        //         desc: '测试描述',
        //         status: 1,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }, {
        //         taskid: '2',
        //         desc: '测试描述',
        //         status: 0,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }
        // ]);

        // this.m_jobTasks.set("2", [
        //     {
        //         taskid: '3',
        //         desc: '测试描述',
        //         status: 1,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }, {
        //         taskid: '4',
        //         desc: '测试描述',
        //         status: 0,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }
        // ]);

        // this.m_jobTasks.set("3", [
        //     {
        //         taskid: '5',
        //         desc: '测试描述',
        //         status: 1,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }, {
        //         taskid: '6',
        //         desc: '测试描述',
        //         status: 0,
        //         timeslimit: 10,
        //         runTimes: 5,
        //     }
        // ]);

        // await new Promise((v) => {
        //     setTimeout(() => {
        //         v();
        //     }, 200);
        // });

        let option: any = {
            body: {
                jobid
            },
        };

        let resp = await FetchHelper.PostFetch(JobProvider.TasksDetailUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.TasksDetailUrl}`);
            this._onError('list', '网络错误');
            return ;
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.TasksDetailUrl}`);
            this._onError('list', '服务器返回失败');
            return ;
        }

        this.m_jobTasks.set(jobid, resp.value!.tasks);

        this.emit("itemupdate", this, jobid);
    }

    public async jobresult(jobid: string): Promise<{succ: boolean,jobid: string, msg?: string, result?: any}> {
        // let result = {
        //     jobid,
        //     desc: 'sssssss',
        //     tasks: [
        //         {
        //             taskid: "3",
        //             desc: "ddddddd",
        //             successtimes: 10,
        //             failedtimes:2,
        //             records: [
        //                 {
        //                     result: 2,
        //                     agentid: 'dddd',
        //                     urls: [
        //                         "http://www.baidu.com/index.html", "http://www.baidu.com/index2.html"
        //                     ]
        //                 },
        //                 {
        //                     result: 3,
        //                     agentid: 'xxxxxx',
        //                     urls: [
        //                         "http://www.baidu.com/index.html", "http://www.baidu.com/index2.html"
        //                     ]
        //                 }
        //             ],
        //         }, 


        //         {
        //             taskid: "4",
        //             desc: "444444444",
        //             successtimes: 100,
        //             failedtimes:0,
        //             records: [
        //             ],
        //         }, 
        //     ],
        // }

        let option: any = {
            body: {
                jobid,
                resultfilter: 1,
                includeResart: 1,
            },
        };

        let resp = await FetchHelper.PostFetch(JobProvider.TaskResult, option);
        if (resp.err) {
            console.log(`request server failed, url=${JobProvider.TaskResult}`);
            return {succ: false, msg: '网络错误', jobid};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${JobProvider.TaskResult}`);
            return {succ: false, msg: '服务器返回失败', jobid};
        }

        return {succ: true,jobid, result: resp.value!};
    }

    private _findJobById(jobid: string): {entry?: JobEntry, index?: number} {
        for (let i=0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].jobid === jobid) {
                return {entry: this.m_entrys[i], index: i};
            }
        }

        return {};
    }

    private _onError(opt: string, msg: string) {
        this.emit('opterror', this, opt, msg);
    }
}