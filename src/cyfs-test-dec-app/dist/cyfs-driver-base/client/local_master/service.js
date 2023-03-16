"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceProxy = void 0;
const client_1 = require("./client");
const private_channel_1 = require("./private_channel");
const bridge_1 = require("./bridge");
const command_1 = require("../../command");
class ServiceProxy extends client_1.ClientProxy {
    constructor(options) {
        super(options);
        this.m_taskNamespace = options.taskChannel.namespace;
        this.m_centerChannel = options.channelWithCenterMaster;
        this.m_centerCommandHandler = (channel, c) => {
            if (c.name === command_1.SysCommandName.sys_uploadlog_req && command_1.NamespaceHelper.isNamespaceEqual(c.to, this.namespace)) {
                if (command_1.NamespaceHelper.isNamespaceEqual(this.m_taskNamespace, c.taskNamespace)) {
                    this.send(c);
                }
            }
        };
        this.m_centerChannel.on('command', this.m_centerCommandHandler);
        this.on('command', (channel, c) => {
            if (command_1.NamespaceHelper.isNamespaceEqual(c.to, { agentid: this.namespace.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId })) {
                this.dispatcher.dispatch(c);
            }
            else if (c.to.agentid !== this.namespace.agentid) {
                this.m_centerChannel.send(c);
            }
        });
        let p = new private_channel_1.PrivateChannel({
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
        this.m_bridge = new bridge_1.Bridge(options.taskChannel, p);
    }
    get taskNamespace() {
        return this.m_taskNamespace;
    }
    destory() {
        this.m_centerChannel.removeListener('command', this.m_centerCommandHandler);
        this.m_bridge.destory();
        super.destory();
    }
    onPing(c) {
        //收到service client的ping的时候需要把ping消息扩散给对应的task
        if (command_1.NamespaceHelper.isNamespaceEqual(this.taskNamespace, this.m_bridge.channels[0].namespace)) {
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
exports.ServiceProxy = ServiceProxy;
