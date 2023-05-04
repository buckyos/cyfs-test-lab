import { Channel, Namespace, ChannelOptions, ChannelHooker, Command, stringifyComand } from "../../command";

export class PrivateChannel extends Channel {
    private m_from?: Namespace;
    private m_to?: Namespace;
    private m_channel?: Channel;
    private m_handler?: ChannelHooker;
  

    initFromChannel(param: {
        from: Namespace;
        to: Namespace;
        channel: Channel;
    }) {
        this.m_from = param.from;
        this.m_to = param.to;
        this.m_channel = param.channel;
        this.m_handler = (c: Command): boolean => {
            return this._onRecvCommand(c);
        }

        this.m_channel.addHooker({from: this.m_from, to: this.m_to}, this.m_handler);
    }

    send(c: Command) {
        //console.debug(`private channel send comand c=${stringifyComand(c)}`);
        this.m_channel!.send(c);
    }

    destory() {
        this.m_channel!.removeHooker({from: this.m_from, to: this.m_to}, this.m_handler!);
        super.destory();
    }
}