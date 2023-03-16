"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateChannel = void 0;
const command_1 = require("../../command");
class PrivateChannel extends command_1.Channel {
    initFromChannel(param) {
        this.m_from = param.from;
        this.m_to = param.to;
        this.m_channel = param.channel;
        this.m_handler = (c) => {
            return this._onRecvCommand(c);
        };
        this.m_channel.addHooker({ from: this.m_from, to: this.m_to }, this.m_handler);
    }
    send(c) {
        //this.logger.debug(`private channel send comand c=${stringifyComand(c)}`);
        this.m_channel.send(c);
    }
    destory() {
        this.m_channel.removeHooker({ from: this.m_from, to: this.m_to }, this.m_handler);
        super.destory();
    }
}
exports.PrivateChannel = PrivateChannel;
