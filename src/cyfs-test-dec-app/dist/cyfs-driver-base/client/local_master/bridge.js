"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bridge = void 0;
class Bridge {
    constructor(v1, v2) {
        this.m_v1 = v1;
        this.m_v2 = v2;
        this.m_v1.on('command', (client, c) => {
            v2.send(c);
        });
        this.m_v2.on('command', (client, c) => {
            v1.send(c);
        });
    }
    get channels() {
        return [this.m_v1, this.m_v2];
    }
    destory() {
        this.m_v1.destory();
        this.m_v2.destory();
    }
}
exports.Bridge = Bridge;
