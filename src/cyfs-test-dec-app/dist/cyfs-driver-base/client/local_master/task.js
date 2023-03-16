"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskProxy = void 0;
const client_1 = require("./client");
const command_1 = require("../../command");
const common_1 = require("../../../common");
const private_channel_1 = require("./private_channel");
const bridge_1 = require("./bridge");
class TaskProxy extends client_1.ClientProxy {
    constructor(options) {
        super(options);
        this.m_bridges = [];
        this.m_bLocalTest = false;
        this.m_centerChannel = options.channelWithCenterMaster;
        this.m_jobid = options.jobid;
        this.m_bLocalTest = options.localTest;
        this.m_centerCommandHandler = (channel, c) => {
            if (command_1.NamespaceHelper.isNamespaceEqual(c.to, this.namespace)) {
                this.send(c);
            }
        };
        this.m_centerChannel.on('command', this.m_centerCommandHandler);
        this.on('command', (channel, c) => {
            if (command_1.NamespaceHelper.isNamespaceEqual(c.to, { agentid: this.namespace.agentid, serviceid: command_1.NamespaceHelper.LocalMasterServiceId })) {
                this.dispatcher.dispatch(c);
            }
            else if (c.to.agentid !== this.namespace.agentid) {
                if (c.name === command_1.SysCommandName.sys_startservice_req) {
                    let command = c;
                    let p = new private_channel_1.PrivateChannel({
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
    get isLocalTest() {
        return this.m_bLocalTest;
    }
    get jobid() {
        return this.m_jobid;
    }
    addService(channel) {
        this.logger.info(`=================add service namespace=${JSON.stringify(channel.namespace)}`);
        let exist = this._findChannel(channel.namespace);
        if (exist) {
            return common_1.ErrorCode.exist;
        }
        let p = new private_channel_1.PrivateChannel({
            namespace: this.namespace,
            logger: this.logger,
            timeout: 0,
        });
        p.initFromChannel({ from: this.namespace, to: channel.namespace, channel: this });
        channel.on('timeout', () => {
            this._onExit();
        });
        p.on('timeout', () => {
            this._onExit();
        });
        this.m_bridges.push(new bridge_1.Bridge(channel, p));
        return common_1.ErrorCode.succ;
    }
    getServices() {
        let channels = [];
        for (let bridge of this.m_bridges) {
            this.logger.info(`=================getServices bridage v1=${JSON.stringify(bridge.channels[0].namespace)}, v2=${JSON.stringify(bridge.channels[1].namespace)}`);
            if (!command_1.NamespaceHelper.isNamespaceEqual(bridge.channels[0].namespace, this.namespace)) {
                channels.push(bridge.channels[0]);
                continue;
            }
            channels.push(bridge.channels[1]);
        }
        return channels;
    }
    setExecuteResult(r) {
        if (this.m_executeResult) {
            return;
        }
        this.m_executeResult = r;
    }
    getExecuteResult() {
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
    onPing(c) {
        //收到task client的ping的时候需要把ping消息扩散给对应的service
        //但是如果当前没有service，那么就当是localmaster给回复的
        if (!this.m_bridges.length) {
            c.from = c.to;
            c.to = this.namespace;
            this.send(c);
            return;
        }
        for (let bridge of this.m_bridges) {
            if (!command_1.NamespaceHelper.isNamespaceEqual(bridge.channels[0].namespace, this.namespace)) {
                c.from = this.namespace;
                c.to = bridge.channels[0].namespace;
                bridge.channels[0].send(c);
                continue;
            }
            else {
                c.from = this.namespace;
                c.to = bridge.channels[1].namespace;
                bridge.channels[1].send(c);
            }
        }
    }
    _findChannel(namespace) {
        for (let bridge of this.m_bridges) {
            if (command_1.NamespaceHelper.isNamespaceEqual(namespace, bridge.channels[0].namespace)) {
                return bridge.channels[0];
            }
            if (command_1.NamespaceHelper.isNamespaceEqual(namespace, bridge.channels[1].namespace)) {
                return bridge.channels[1];
            }
        }
        return null;
    }
}
exports.TaskProxy = TaskProxy;
