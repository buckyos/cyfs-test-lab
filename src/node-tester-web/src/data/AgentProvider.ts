import { FetchHelper } from './net';

export type AgentEntry = {
    agentid: string;
    env: string;
    desc: string,
    accessible: number; //内网标识
    status: number;
    tags: string;
};

export type WorkList = {
    services: {serviceid: string, servicename: string, state: number}[];
    tasks: {taskid: string, desc: string}[];
};

export class AgentProvider {
    public static UpdateUrl: string ='/agent/update';
    public static ListUrl: string = '/agent/list';
    public static DetailUrl: string = '/agent/detail';
    public static WorkListUrl: string = '/agent/worklist';
    public static s_instance: AgentProvider = new AgentProvider();
    private m_entrys: AgentEntry[] = [];
    
    public static getInstance(): AgentProvider {
        return AgentProvider.s_instance;
    }

    public static validEnv(env: string): {succ: boolean, msg?: string} {
        try {
            let j = JSON.parse(env);
            return {succ: true};
        } catch (err) {
            return {succ: false, msg: '环境参数的配置必须是JSON格式'};
        }
    }

    public async list(): Promise<{succ: boolean, msg?: string, entrys?: AgentEntry[]}> {
        let info = await this._listImpl();
        if (!info.succ) {
            return info;
        }

        return {succ: true, entrys: this.m_entrys};
    }

    public async update(agentid: string, env: string, desc: string, accessible: number, tags: string): Promise<{succ: boolean, msg?: string}> {
        // await new Promise((v) => {
        //     setTimeout(() => {
        //         v();
        //     }, 300);
        // });
        // return {succ: true};
        let index = this._findIndexById(agentid);
        if (index === this.m_entrys.length) {
            return {succ: false, msg: '参数错误'};
        }

        let body= {
            agentid,
            env,
            desc,
            accessible,
            tags,
        };

        let option: any = {
            body,
        };

        let resp = await FetchHelper.PostFetch(AgentProvider.UpdateUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${AgentProvider.UpdateUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${AgentProvider.UpdateUrl}`);
            return {succ: false, msg:'服务器返回失败'};
        }

        this.m_entrys[index].env = env;
        this.m_entrys[index].desc = desc;
        this.m_entrys[index].accessible = accessible;
        this.m_entrys[index].tags = tags;

        return {succ: true};
    }

    public async worklist(agentid: string): Promise<{succ: boolean,msg?: string, agentid?: string, worklist?: WorkList}> {
        // return await new Promise<{succ: boolean,msg?: string, agentid?: string, worklist?: WorkList}>((v) => {
        //     setTimeout(()=>{
        //         v({
        //             succ: true,
        //             agentid,
        //             worklist: {
        //                 services: [
        //                     {
        //                         serviceid: '1',
        //                         servicename: 'bdt1',
        //                         state: 1,
        //                     },
        //                     {
        //                         serviceid: '2',
        //                         servicename: 'bdt2',
        //                         state: 0,
        //                     },
        //                     {
        //                         serviceid: '3',
        //                         servicename: 'bdt3',
        //                         state: 1,
        //                     }
        //                 ],
        //                 tasks: [
        //                     {
        //                         taskid: '1',
        //                         desc: '这个任务是干嘛的',
        //                     },
        //                     {
        //                         taskid: '2',
        //                         desc: '我也不知道啊',
        //                     }
        //                 ]
        //             },
        //         })
        //     }, 300);
        // }); 
        let option: any = {
            body: {agentid},
        };

        let resp = await FetchHelper.PostFetch(AgentProvider.WorkListUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${AgentProvider.WorkListUrl}`);
            return {succ: false, agentid, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${AgentProvider.WorkListUrl}`);
            return {succ: false, agentid, msg:'服务器返回失败'};
        }

        return {succ: true, agentid, worklist: resp.value!};
    }

    private async _listImpl(): Promise<{succ: boolean, msg?: string}> {
        // await new Promise((v) => {
        //     setTimeout(()=>{
        //         this.m_entrys = [];
        //         this.m_entrys.push({
        //             agentid: "DESKTOP-SM08KCM:{772AB57E-E0FB-475E-8452-025402AC17E9}",
        //             env: JSON.stringify([
        //               {
        //                 name: "officename",
        //                 accessType: 1,
        //                 ipv4: ["192.168.100.124"],
        //                 ipv6: [],
        //                 tcp: 1,
        //                 udp: 1
        //               }
        //             ]),
        //             desc: "桌子上面的测试机器上0",
        //             accessible: 1,
        //             status: 1,
        //             tags: JSON.stringify(['tag1', 'tag2','tag3','tag4', 'tag5','tag6']),
        //         });

        //         this.m_entrys.push({
        //             agentid: "DESKTOP-SM34KCM:{772AB57E-E0FB-475E-8452-025402AC1730}",
        //             env: JSON.stringify([
        //               {
        //                 name: "officename",
        //                 accessType: 1,
        //                 ipv4: ["192.168.100.128"],
        //                 ipv6: [],
        //                 tcp: 1,
        //                 udp: 1
        //               }
        //             ]),
        //             desc: "win10",
        //             accessible: 0,
        //             status: 0,
        //             tags: JSON.stringify(['tag3', 'tag4']),
        //         });

        //         v();
        //     }, 300);
        // });
        // return {succ: true};

        let body = {};
        let option = {
            body,
        }

        let resp = await FetchHelper.PostFetch(AgentProvider.ListUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${AgentProvider.ListUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${AgentProvider.ListUrl}`);
            return {succ: false, msg:`服务器返回失败,${resp.value!.err.msg}`};
        }

        this.m_entrys = resp.value!.agents;

        return {succ: true};
    }

    private _findIndexById(agentid: string): number {
        for (let i = 0; i < this.m_entrys.length; i++) {
            if (this.m_entrys[i].agentid === agentid) {
                return i;
            }
        }

        return this.m_entrys.length;
    }
}