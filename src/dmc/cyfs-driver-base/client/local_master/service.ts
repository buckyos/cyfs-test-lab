import { ClientProxy, ClientProxyOptions } from "./client";
import { PrivateChannel } from "./private_channel";
import { Bridge } from "./bridge";
import { Namespace, Command, NamespaceHelper, Channel, SysCommandName, CommandSysUploadLogReq } from "../../command";

export type ServiceProxyOptions = ClientProxyOptions & {
    taskChannel: PrivateChannel;
    channelWithCenterMaster: Channel;
}

export class ServiceProxy extends ClientProxy {
    private m_bridge: Bridge;
    private m_taskNamespace: Namespace;
    //localmaster和centermaster之间的通道
    protected m_centerChannel: Channel;
    private m_centerCommandHandler: (channel: Channel, c: Command)=>void;

    constructor(options: ServiceProxyOptions) {
        super(options);
        this.m_taskNamespace = options.taskChannel.namespace;
        this.m_centerChannel = options.channelWithCenterMaster;
        this.m_centerCommandHandler = (channel: Channel, c: Command) => {
            if (c.name === SysCommandName.sys_uploadlog_req && NamespaceHelper.isNamespaceEqual(c.to, this.namespace)) {
                if (NamespaceHelper.isNamespaceEqual(this.m_taskNamespace, (c as CommandSysUploadLogReq).taskNamespace)) {
                    this.send(c);
                }
            }
        };
        this.m_centerChannel.on('command', this.m_centerCommandHandler);

        this.on('command', (channel: Channel, c: Command) => {
            if (NamespaceHelper.isNamespaceEqual(c.to, { agentid: this.namespace.agentid, serviceid: NamespaceHelper.LocalMasterServiceId })) {
                this.dispatcher.dispatch(c);
            } else if (c.to.agentid !== this.namespace.agentid) {
                this.m_centerChannel.send(c);
            }
        });

        let p: PrivateChannel = new PrivateChannel({
            namespace: this.namespace,
            logger: this.logger,
            timeout: 0,
        });
        p.initFromChannel({ from: options.namespace, to: options.taskChannel.namespace, channel: this });

        p.on('timeout', () => {
            this._onExit();
        });

        options.taskChannel.on('timeout', () => {
            this._onExit();
        });

        this.m_bridge = new Bridge(options.taskChannel, p);
    }

    get taskNamespace(): Namespace {
        return this.m_taskNamespace;
    }

    destory() {
        this.m_centerChannel.removeListener('command', this.m_centerCommandHandler);
        this.m_bridge.destory();
        super.destory();
    }

    onPing(c: Command) {
        //收到service client的ping的时候需要把ping消息扩散给对应的task
        if (NamespaceHelper.isNamespaceEqual(this.taskNamespace, this.m_bridge.channels[0].namespace)) {
            c.from = this.namespace;
            c.to = this.taskNamespace;
            this.m_bridge.channels[0].send(c);
            return;
        }

        c.from = this.namespace;
        c.to = this.taskNamespace;
        this.m_bridge.channels[1].send(c);
    }
}