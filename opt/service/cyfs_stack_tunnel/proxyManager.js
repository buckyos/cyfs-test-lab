"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyManager = exports.stringToUint8Array = exports.Uint8ArrayToString = void 0;
const base_1 = require("../../base");
const net = __importStar(require("net"));
const events_1 = require("events");
const util_1 = require("./util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
exports.Uint8ArrayToString = Uint8ArrayToString;
function stringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
exports.stringToUint8Array = stringToUint8Array;
class ProxyManager extends events_1.EventEmitter {
    constructor(_interface) {
        super();
        this.m_interface = _interface;
        this.log = _interface.getLogger();
        this.cacheName = base_1.RandomGenerator.string(10);
        this.state = 0;
        this.socketList = [];
        this.utilTool = new util_1.UtilTool(_interface, this.log);
        this.cache_path = {
            file_upload: path.join(this.log.dir(), `../${this.cacheName}_cache`, "file_upload"),
            file_download: path.join(this.log.dir(), `../${this.cacheName}_cache`, "file_download"),
            NamedObject: path.join(this.log.dir(), `../${this.cacheName}_cache`, "NamedObject")
        };
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
        fs.mkdirpSync(this.cache_path.NamedObject);
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    init(stack_type) {
        this.log.info(`init cyfs stack ProxyManager type =${stack_type}`);
        this.stack_type = stack_type;
        if (stack_type == "runtime") {
            this.stack_http_port = 1322;
            this.stack_ws_port = 1323;
        }
        else if (stack_type == "ood") {
            this.stack_http_port = 1318;
            this.stack_ws_port = 1319;
        }
        return { err: base_1.ErrorCode.succ, log: "start success", cacheName: this.cacheName };
    }
    async build_tunnel(type, remoteAddress, remotePort) {
        let port = this.stack_ws_port;
        if (type == "http") {
            port = this.stack_http_port;
        }
        else if (type == "ws") {
            port = this.stack_ws_port;
        }
        try {
            let client = net.connect(port, "127.0.0.1", () => {
                this.log.info(`${client.remoteAddress}_${client.remotePort} begin connect tcp 127.0.0.1:${port}`);
                this.socketList.push({
                    type,
                    remoteAddress,
                    remotePort,
                    socket: client,
                    seq: 0,
                    r_seq: 0,
                });
                let r_seq = 0;
                client.setKeepAlive(true, 2000);
                client.on('data', async (buf) => {
                    r_seq = r_seq + 1;
                    this.log.info(` ${this.cacheName} TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort},r_seq = ${r_seq}`);
                    let msg_u8 = buf;
                    let info = await this.m_interface.fireEvent(`${remoteAddress}_${remotePort}`, base_1.ErrorCode.succ, r_seq, Uint8ArrayToString(msg_u8));
                });
            });
            if (!client.remoteAddress || !client.remotePort) {
                return { err: base_1.ErrorCode.exception, log: `proxy client ${client.remoteAddress}_${client.remotePort}` };
            }
            return { err: base_1.ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}` };
        }
        catch (error) {
            return { err: base_1.ErrorCode.exception, log: `${error}` };
        }
    }
    async end_tunnel(type, remoteAddress, remotePort) {
        for (let i in this.socketList) {
            if (this.socketList[i].type == type && this.socketList[i].remoteAddress == remoteAddress && this.socketList[i].remotePort == remotePort) {
                // 实现序列化发送
                this.socketList[i].socket.end();
            }
        }
        return base_1.ErrorCode.notFound;
    }
    async proxy_data(type, remoteAddress, remotePort, seq, bytes) {
        for (let i in this.socketList) {
            if (this.socketList[i].type == type && this.socketList[i].remoteAddress == remoteAddress && this.socketList[i].remotePort == remotePort) {
                // 实现序列化发送
                this.socketList[i].socket.write(stringToUint8Array(bytes.toString()));
            }
        }
        return base_1.ErrorCode.notFound;
    }
    async utilRequest(command) {
        return await this.utilTool.utilRequest(command);
    }
}
exports.ProxyManager = ProxyManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvc2VydmljZS9jeWZzX3N0YWNrX3R1bm5lbC9wcm94eU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHFDQUFtRztBQUNuRyx5Q0FBMkI7QUFDM0IsbUNBQXNDO0FBQ3RDLGlDQUFpQztBQUVqQywyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLFNBQWdCLGtCQUFrQixDQUFDLFFBQW9CO0lBQ25ELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUNwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN0QyxVQUFVLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsRDtJQUNELE9BQU8sVUFBVSxDQUFBO0FBQ3JCLENBQUM7QUFORCxnREFNQztBQUNELFNBQWdCLGtCQUFrQixDQUFDLEdBQVc7SUFDMUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUN4QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvQjtJQUNELElBQUksYUFBYSxHQUFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLE9BQU8sYUFBYSxDQUFBO0FBQ3hCLENBQUM7QUFQRCxnREFPQztBQUVELE1BQWEsWUFBYSxTQUFRLHFCQUFZO0lBb0IxQyxZQUFZLFVBQWtDO1FBQzFDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFD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SSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksVUFBVSxFQUFFO2dCQUNySSxVQUFVO2dCQUNWLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pFO1NBQ0o7UUFDRCxPQUFPLGdCQUFTLENBQUMsUUFBUSxDQUFBO0lBQzdCLENBQUM7SUFDRCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQXNCO1FBQ3BDLE9BQU8sTUFBTSxJQUFJLENBQUMsUUFBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0o7QUF6R0Qsb0NBeUdDIiwiZmlsZSI6InNlcnZpY2UvY3lmc19zdGFja190dW5uZWwvcHJveHlNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3JDb2RlLCBOYW1lc3BhY2UsIExvZ2dlciwgU2VydmljZUNsaWVudEludGVyZmFjZSwgUmFuZG9tR2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xyXG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xyXG5pbXBvcnQgeyBVdGlsVG9vbCB9IGZyb20gXCIuL3V0aWxcIlxyXG5pbXBvcnQgeyBCZHRMcGMsIEJkdExwY0NvbW1hbmQsIEJkdExwY1Jlc3AgfSBmcm9tICcuL2xwYyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuZXhwb3J0IGZ1bmN0aW9uIFVpbnQ4QXJyYXlUb1N0cmluZyhmaWxlRGF0YTogVWludDhBcnJheSkge1xyXG4gICAgdmFyIGRhdGFTdHJpbmcgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWxlRGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGRhdGFTdHJpbmcgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShmaWxlRGF0YVtpXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGF0YVN0cmluZ1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdUb1VpbnQ4QXJyYXkoc3RyOiBzdHJpbmcpIHtcclxuICAgIHZhciBhcnIgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gc3RyLmxlbmd0aDsgaSA8IGo7ICsraSkge1xyXG4gICAgICAgIGFyci5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKTtcclxuICAgIH1cclxuICAgIHZhciB0bXBVaW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyKTtcclxuICAgIHJldHVybiB0bXBVaW50OEFycmF5XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQcm94eU1hbmFnZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG4gICAgcHJpdmF0ZSBzdGFja190eXBlPzogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBsb2c6IExvZ2dlcjtcclxuICAgIHByaXZhdGUgbV9pbnRlcmZhY2U6IFNlcnZpY2VDbGllbnRJbnRlcmZhY2U7XHJcbiAgICBwcml2YXRlIHN0YWNrX2h0dHBfcG9ydD86IG51bWJlcjtcclxuICAgIHByaXZhdGUgc3RhY2tfd3NfcG9ydD86IG51bWJlcjtcclxuICAgIHByaXZhdGUgdXRpbFRvb2w/OiBVdGlsVG9vbDtcclxuICAgIHB1YmxpYyBjYWNoZV9wYXRoOiB7IGZpbGVfdXBsb2FkOiBzdHJpbmcsIGZpbGVfZG93bmxvYWQ6IHN0cmluZywgTmFtZWRPYmplY3Q6IHN0cmluZyB9O1xyXG4gICAgLy/mnKzlnLBzb2NrZXQg5Luj55CG5rGgIHNlcSA6IFNESyDliLAg5Y2P6K6u5qCI5bqP5YiX5Y+3ICwgcl9zZXEg5Y2P6K6u5qCI5YiwU0RL5bqP5YiX5Y+3XHJcbiAgICBwcml2YXRlIHNvY2tldExpc3Q6IEFycmF5PHsgc29ja2V0OiBuZXQuU29ja2V0LCB0eXBlOiBzdHJpbmcsIHJlbW90ZUFkZHJlc3M6IHN0cmluZywgcmVtb3RlUG9ydDogbnVtYmVyLCBzZXE/OiBudW1iZXIsIHJfc2VxPzogbnVtYmVyIH0+O1xyXG4gICAgcHJpdmF0ZSBjYWNoZU5hbWU6IHN0cmluZztcclxuICAgIHByaXZhdGUgc3RhdGU6IG51bWJlcjsgLy8gMCDmnKrliJ3lp4sgMSDliJ3lp4vljJbkuK0gMiDlj6/kvb/nlKggLTEg6ZSA5q+BXHJcbiAgICBvbihldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcyB7XHJcbiAgICAgICAgc3VwZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIG9uY2UoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCk6IHRoaXMge1xyXG4gICAgICAgIHN1cGVyLm9uY2UoZXZlbnQsIGxpc3RlbmVyKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGNvbnN0cnVjdG9yKF9pbnRlcmZhY2U6IFNlcnZpY2VDbGllbnRJbnRlcmZhY2UpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMubV9pbnRlcmZhY2UgPSBfaW50ZXJmYWNlO1xyXG4gICAgICAgIHRoaXMubG9nID0gX2ludGVyZmFjZS5nZXRMb2dnZXIoKTtcclxuICAgICAgICB0aGlzLmNhY2hlTmFtZSA9IFJhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTApO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSAwO1xyXG4gICAgICAgIHRoaXMuc29ja2V0TGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMudXRpbFRvb2wgPSBuZXcgVXRpbFRvb2woX2ludGVyZmFjZSwgdGhpcy5sb2cpO1xyXG4gICAgICAgIHRoaXMuY2FjaGVfcGF0aCA9IHtcclxuICAgICAgICAgICAgZmlsZV91cGxvYWQ6IHBhdGguam9pbih0aGlzLmxvZy5kaXIoKSwgYC4uLyR7dGhpcy5jYWNoZU5hbWV9X2NhY2hlYCwgXCJmaWxlX3VwbG9hZFwiKSxcclxuICAgICAgICAgICAgZmlsZV9kb3dubG9hZDogcGF0aC5qb2luKHRoaXMubG9nLmRpcigpLCBgLi4vJHt0aGlzLmNhY2hlTmFtZX1fY2FjaGVgLCBcImZpbGVfZG93bmxvYWRcIiksXHJcbiAgICAgICAgICAgIE5hbWVkT2JqZWN0OiBwYXRoLmpvaW4odGhpcy5sb2cuZGlyKCksIGAuLi8ke3RoaXMuY2FjaGVOYW1lfV9jYWNoZWAsIFwiTmFtZWRPYmplY3RcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgZnMubWtkaXJwU3luYyh0aGlzLmNhY2hlX3BhdGguZmlsZV91cGxvYWQpO1xyXG4gICAgICAgIGZzLm1rZGlycFN5bmModGhpcy5jYWNoZV9wYXRoLmZpbGVfZG93bmxvYWQpO1xyXG4gICAgICAgIGZzLm1rZGlycFN5bmModGhpcy5jYWNoZV9wYXRoLk5hbWVkT2JqZWN0KTtcclxuICAgIH1cclxuICAgIGluaXQoc3RhY2tfdHlwZTogc3RyaW5nKTogeyBlcnI6IEVycm9yQ29kZSwgbG9nPzogc3RyaW5nLCBjYWNoZU5hbWU6IHN0cmluZyB9IHtcclxuICAgICAgICB0aGlzLmxvZy5pbmZvKGBpbml0IGN5ZnMgc3RhY2sgUHJveHlNYW5hZ2VyIHR5cGUgPSR7c3RhY2tfdHlwZX1gKVxyXG4gICAgICAgIHRoaXMuc3RhY2tfdHlwZSA9IHN0YWNrX3R5cGU7XHJcbiAgICAgICAgaWYgKHN0YWNrX3R5cGUgPT0gXCJydW50aW1lXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGFja19odHRwX3BvcnQgPSAxMzIyO1xyXG4gICAgICAgICAgICB0aGlzLnN0YWNrX3dzX3BvcnQgPSAxMzIzO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhY2tfdHlwZSA9PSBcIm9vZFwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2tfaHR0cF9wb3J0ID0gMTMxODtcclxuICAgICAgICAgICAgdGhpcy5zdGFja193c19wb3J0ID0gMTMxOTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgZXJyOiBFcnJvckNvZGUuc3VjYywgbG9nOiBcInN0YXJ0IHN1Y2Nlc3NcIiwgY2FjaGVOYW1lOiB0aGlzLmNhY2hlTmFtZSB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWlsZF90dW5uZWwodHlwZTogc3RyaW5nLCByZW1vdGVBZGRyZXNzOiBzdHJpbmcsIHJlbW90ZVBvcnQ6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBwb3J0ID0gdGhpcy5zdGFja193c19wb3J0IVxyXG4gICAgICAgIGlmICh0eXBlID09IFwiaHR0cFwiKSB7XHJcbiAgICAgICAgICAgIHBvcnQgPSB0aGlzLnN0YWNrX2h0dHBfcG9ydCFcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJ3c1wiKSB7XHJcbiAgICAgICAgICAgIHBvcnQgPSB0aGlzLnN0YWNrX3dzX3BvcnQhXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxldCBjbGllbnQgPSBuZXQuY29ubmVjdChwb3J0LCBcIjEyNy4wLjAuMVwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZy5pbmZvKGAke2NsaWVudC5yZW1vdGVBZGRyZXNzfV8ke2NsaWVudC5yZW1vdGVQb3J0fSBiZWdpbiBjb25uZWN0IHRjcCAxMjcuMC4wLjE6JHtwb3J0fWApXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNvY2tldExpc3QhLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3RlQWRkcmVzcyxcclxuICAgICAgICAgICAgICAgICAgICByZW1vdGVQb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgIHNvY2tldDogY2xpZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHNlcTogMCxcclxuICAgICAgICAgICAgICAgICAgICByX3NlcTogMCxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBsZXQgcl9zZXEgPSAwO1xyXG4gICAgICAgICAgICAgICAgY2xpZW50LnNldEtlZXBBbGl2ZSh0cnVlLCAyMDAwKVxyXG4gICAgICAgICAgICAgICAgY2xpZW50Lm9uKCdkYXRhJywgYXN5bmMgKGJ1ZikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJfc2VxID0gcl9zZXEgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9nLmluZm8oYCAke3RoaXMuY2FjaGVOYW1lfSBUQ1AgQ2xpZW50ICR7cG9ydH0gcmVzcCBzdGFjayBkYXRhICR7Y2xpZW50LnJlbW90ZUFkZHJlc3N9OiR7Y2xpZW50LnJlbW90ZVBvcnR9LHJfc2VxID0gJHtyX3NlcX1gKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbXNnX3U4ID0gYnVmIGFzIFVpbnQ4QXJyYXk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm8gPSBhd2FpdCB0aGlzLm1faW50ZXJmYWNlLmZpcmVFdmVudChgJHtyZW1vdGVBZGRyZXNzfV8ke3JlbW90ZVBvcnR9YCwgRXJyb3JDb2RlLnN1Y2MsIHJfc2VxLCBVaW50OEFycmF5VG9TdHJpbmcobXNnX3U4KSlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZighY2xpZW50LnJlbW90ZUFkZHJlc3MgfHwgIWNsaWVudC5yZW1vdGVQb3J0KXtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGVycjogRXJyb3JDb2RlLmV4Y2VwdGlvbixsb2c6IGBwcm94eSBjbGllbnQgJHtjbGllbnQucmVtb3RlQWRkcmVzc31fJHtjbGllbnQucmVtb3RlUG9ydH1gfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBlcnI6IEVycm9yQ29kZS5zdWNjLCBsb2c6IGBwcm94eSBjbGllbnQgJHtjbGllbnQucmVtb3RlQWRkcmVzc31fJHtjbGllbnQucmVtb3RlUG9ydH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgZXJyOiBFcnJvckNvZGUuZXhjZXB0aW9uLCBsb2c6IGAke2Vycm9yfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBlbmRfdHVubmVsKHR5cGU6IHN0cmluZywgcmVtb3RlQWRkcmVzczogc3RyaW5nLCByZW1vdGVQb3J0OiBudW1iZXIpIHtcclxuICAgICAgICBmb3IgKGxldCBpIGluIHRoaXMuc29ja2V0TGlzdCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zb2NrZXRMaXN0W2ldLnR5cGUgPT0gdHlwZSAmJiB0aGlzLnNvY2tldExpc3RbaV0ucmVtb3RlQWRkcmVzcyA9PSByZW1vdGVBZGRyZXNzICYmIHRoaXMuc29ja2V0TGlzdFtpXS5yZW1vdGVQb3J0ID09IHJlbW90ZVBvcnQpIHtcclxuICAgICAgICAgICAgICAgIC8vIOWunueOsOW6j+WIl+WMluWPkemAgVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zb2NrZXRMaXN0W2ldLnNvY2tldC5lbmQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gRXJyb3JDb2RlLm5vdEZvdW5kXHJcbiAgICB9XHJcbiAgICBhc3luYyBwcm94eV9kYXRhKHR5cGU6IHN0cmluZywgcmVtb3RlQWRkcmVzczogc3RyaW5nLCByZW1vdGVQb3J0OiBudW1iZXIsIHNlcTogbnVtYmVyLCBieXRlczogQnVmZmVyKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSBpbiB0aGlzLnNvY2tldExpc3QpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc29ja2V0TGlzdFtpXS50eXBlID09IHR5cGUgJiYgdGhpcy5zb2NrZXRMaXN0W2ldLnJlbW90ZUFkZHJlc3MgPT0gcmVtb3RlQWRkcmVzcyAmJiB0aGlzLnNvY2tldExpc3RbaV0ucmVtb3RlUG9ydCA9PSByZW1vdGVQb3J0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyDlrp7njrDluo/liJfljJblj5HpgIFcclxuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0TGlzdFtpXS5zb2NrZXQud3JpdGUoc3RyaW5nVG9VaW50OEFycmF5KGJ5dGVzLnRvU3RyaW5nKCkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gRXJyb3JDb2RlLm5vdEZvdW5kXHJcbiAgICB9XHJcbiAgICBhc3luYyB1dGlsUmVxdWVzdChjb21tYW5kOiBCZHRMcGNDb21tYW5kKTogUHJvbWlzZTxCZHRMcGNSZXNwPiB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudXRpbFRvb2whLnV0aWxSZXF1ZXN0KGNvbW1hbmQpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==
