import { ClientProxy, ClientProxyOptions } from "./client";
import { Namespace, NamespaceHelper, Channel, Command, SysCommandName, CommandSysStartServiceResp, CommandSysStartServiceReq, ClientExitCode, CommandSysTaskFinishReq, CommandSysUploadLogReq } from "../../command";
import * as assert from 'assert';
import { ErrorCode } from "../../common";
import { PrivateChannel } from "./private_channel";
import { Bridge } from "./bridge";

export type TaskProxyOptions = ClientProxyOptions & {
    channelWithCenterMaster: Channel;
    jobid: string;
    localTest: boolean;
}

export type TaskExecuteResult = {
    code: ClientExitCode,
    msg: string,
    urls: string[],
}

export class TaskProxy extends ClientProxy {
    private m_jobid: string;
    private m_bridges: Bridge[] = [];
    //localmaster和centermaster之间的通道
    protected m_centerChannel: Channel;
    private m_centerCommandHandler: (channel: Channel, c: Command)=>void;
    private m_bLocalTest: boolean = false;
    
    protected m_executeResult?: TaskExecuteResult;

    constructor(options: TaskProxyOptions) {
        super(options);
        this.m_centerChannel = options.channelWithCenterMaster;
        this.m_jobid = options.jobid;
        this.m_bLocalTest = options.localTest;
        this.m_centerCommandHandler = (channel: Channel, c: Command) => {
            if (NamespaceHelper.isNamespaceEqual(c.to, this.namespace)) {
                this.send(c);
            }
        };
        this.m_centerChannel.on('command', this.m_centerCommandHandler);

        this.on('command', (channel: Channel, c: Command) => {
            if (NamespaceHelper.isNamespaceEqual(c.to, { agentid: this.namespace.agentid, serviceid: NamespaceHelper.LocalMasterServiceId })) {
                this.dispatcher.dispatch(c);
            } else if (c.to.agentid !== this.namespace.agentid) {
                if (c.name === SysCommandName.sys_startservice_req) {
                    let command: CommandSysStartServiceReq = c as CommandSysStartServiceReq;
                    let p: PrivateChannel = new PrivateChannel({
                        namespace: { agentid: command.to.agentid, serviceid: command.serviceid },
                        logger: this.logger,
                        timeout: 0,
                    });
                    p.initFromChannel({ from: p.namespace, to: this.namespace, channel: this.m_centerChannel });
                    this.addService(p);
                }

                this.m_centerChannel.send(c);
            }
        });
    }

    get isLocalTest(): boolean {
        return this.m_bLocalTest;
    }
    
    get jobid(): string {
        return this.m_jobid;
    }

    addService(channel: PrivateChannel): ErrorCode {
        this.logger.info(`=================add service namespace=${JSON.stringify(channel.namespace)}`);
        let exist = this._findChannel(channel.namespace);
        if (exist) {
            return ErrorCode.exist;
        }

        let p: PrivateChannel = new PrivateChannel({
            namespace: this.namespace,
            logger: this.logger,
            timeout: 0,
        });
        p.initFromChannel({from: this.namespace, to: channel.namespace, channel: this});

        channel.on('timeout', () => {
            this._onExit();
        });

        p.on('timeout', () => {
            this._onExit();
        });
        this.m_bridges.push(new Bridge(channel, p));

        return ErrorCode.succ;
    }

    getServices(): PrivateChannel[] {
        let channels: PrivateChannel[] = [];
        for (let bridge of this.m_bridges) {
            this.logger.info(`=================getServices bridage v1=${JSON.stringify(bridge.channels[0].namespace)}, v2=${JSON.stringify(bridge.channels[1].namespace)}`);
            if (!NamespaceHelper.isNamespaceEqual(bridge.channels[0].namespace, this.namespace)) {
                channels.push(bridge.channels[0]);
                continue;
            }

            channels.push(bridge.channels[1]);
        }

        return channels;
    }

    setExecuteResult(r: TaskExecuteResult) {
       if (this.m_executeResult) {
           return ;
       } 

       this.m_executeResult = r;
    }

    getExecuteResult(): TaskExecuteResult | undefined {
        return this.m_executeResult;
    }

    destory() {
        for (let bridge of this.m_bridges) {
            bridge.destory();
        }
        this.m_bridges = [];
        this.m_centerChannel.removeListener('command', this.m_centerCommandHandler);
        super.destory();
    }

    onPing(c: Command) {
        //收到task client的ping的时候需要把ping消息扩散给对应的service
        //但是如果当前没有service，那么就当是localmaster给回复的
        if (!this.m_bridges.length) {
            c.from = c.to;
            c.to = this.namespace;
            this.send(c);
            return ;
        }

        for (let bridge of this.m_bridges) {
            if (!NamespaceHelper.isNamespaceEqual(bridge.channels[0].namespace, this.namespace)) {
                c.from = this.namespace;
                c.to = bridge.channels[0].namespace;
                bridge.channels[0].send(c);
                continue;
            } else {
                c.from = this.namespace;
                c.to = bridge.channels[1].namespace;
                bridge.channels[1].send(c);
            }
        }
    }

    protected _findChannel(namespace: Namespace): PrivateChannel | null {
        for (let bridge of this.m_bridges) {
            if (NamespaceHelper.isNamespaceEqual(namespace, bridge.channels[0].namespace)) {
                return bridge.channels[0];
            }

            if (NamespaceHelper.isNamespaceEqual(namespace, bridge.channels[1].namespace)) {
                return bridge.channels[1];
            }
        }

        return null;
    }
}