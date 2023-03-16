import { Channel } from "../../command/channel";
import { Command } from "../../command/command";
import { PrivateChannel } from "./private_channel";

export class Bridge {
    private m_v1?: PrivateChannel;
    private m_v2?: PrivateChannel;

    constructor(v1: PrivateChannel, v2: PrivateChannel) {
        this.m_v1 = v1;
        this.m_v2 = v2;

        this.m_v1.on('command', (client: Channel, c: Command) => {
            v2.send(c);
        });
        
        this.m_v2.on('command', (client: Channel, c: Command) => {
            v1.send(c);
        });
    }

    get channels(): PrivateChannel[] {
        return [this.m_v1!, this.m_v2!];
    }

    destory() {
        this.m_v1!.destory();
        this.m_v2!.destory();
    }
}