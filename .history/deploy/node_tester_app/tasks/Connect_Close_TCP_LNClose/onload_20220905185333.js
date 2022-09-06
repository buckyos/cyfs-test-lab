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
exports.TaskMain = void 0;
const testRunner_1 = require("./testRunner");
const labAgent_1 = require("./labAgent");
const BDTAction = __importStar(require("./bdtAction"));
const agentManager_1 = require("./agentManager");
async function TaskMain(_interface) {
    //(1) 连接测试节点
    let agentManager = agentManager_1.AgentManager.createInstance(_interface);
    await agentManager.initAgentList(labAgent_1.labAgent);
    //(2) 创建测试用例执行器 TestRunner
    let testRunner = new testRunner_1.TestRunner(_interface);
    let testcaseName = "Connect_Close_TCP_LNClose";
    let testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 操作流程：\n
        + （1）LN/RN 初始化本地BDT协议栈
        + （2）LN 向 RN 发起首次连接，发送10M大小stream 数据，关闭连接
        + （3）LN 向 RN 发起二次连接，发送10M大小stream 数据，关闭连接
        + （4）RN 向 LN 发起反向连接，发送10M大小stream 数据，关闭连接
        +  (5) 关闭所有连接 `,
        environment: "lab",
    };
    await testRunner.initTestcase(testcase);
    //(3) 创建BDT测试客户端
    let config = {
        eps: {
            ipv4: {
                udp: true,
                tcp: true,
            },
            ipv6: {
                udp: true,
                tcp: true,
            }
        },
        udp_sn_only: 1,
        logType: "trace",
        SN: labAgent_1.LabSnList,
        resp_ep_type: "SN_Resp" /* SN_Resp */,
    };
    // 每台机器运行一个bdt 客户端
    await agentManager.allAgentStartBdtPeer(config);
    //(4) 测试用例执行器添加测试任务
    for (let i in labAgent_1.labAgent) {
        for (let j in labAgent_1.labAgent) {
            if (i != j && labAgent_1.labAgent[i].NAT + labAgent_1.labAgent[j].NAT < 5) {
                let info = await testRunner.createPrevTask({
                    LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    timeout: 60 * 1000,
                    action: []
                });
                info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                    type: "connect" /* connect */,
                    LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    config: {
                        conn_tag: "connect_1",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                    type: "send-stream" /* send_stream */,
                    LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    fileSize: 10 * 1024 * 1024,
                    config: {
                        conn_tag: "connect_1",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                    type: "close-connect" /* close_connect */,
                    LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    config: {
                        conn_tag: "connect_1",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamNotReadAction({
                    type: "send-stream" /* send_stream */,
                    LN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    fileSize: 10 * 1024 * 1024,
                    config: {
                        conn_tag: "connect_1",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                await testRunner.prevTaskRun();
            }
        }
    }
    await testRunner.waitFinished();
}
exports.TaskMain = TaskMain;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza3NfYmR0X2JldGEvQ29ubmVjdF9DbG9zZV9UQ1BfTE5DbG9zZS9vbmxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLG9FQUErRDtBQUUvRCxnRUFBZ0c7QUFDaEcsOEVBQWdFO0FBQ2hFLHdFQUFrRTtBQUUzRCxLQUFLLFVBQVUsUUFBUSxDQUFDLFVBQStCO0lBQzFELFlBQVk7SUFDWixJQUFJLFlBQVksR0FBRywyQkFBWSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRCxNQUFNLFlBQVksQ0FBQyxhQUFhLENBQUMsbUJBQVEsQ0FBQyxDQUFDO0lBQzNDLDBCQUEwQjtJQUMxQixJQUFJLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsSUFBSSxZQUFZLEdBQUcsMkJBQTJCLENBQUE7SUFDOUMsSUFBSSxRQUFRLEdBQVk7UUFDcEIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsVUFBVSxFQUFFLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUMzQyxNQUFNLEVBQUU7Ozs7O3VCQUtPO1FBQ2YsV0FBVyxFQUFFLEtBQUs7S0FDckIsQ0FBQztJQUNGLE1BQU0sVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QyxnQkFBZ0I7SUFDaEIsSUFBSSxNQUFNLEdBQXlCO1FBQzNCLEdBQUcsRUFBQztZQUNBLElBQUksRUFBQztnQkFDRCxHQUFHLEVBQUMsSUFBSTtnQkFDUixHQUFHLEVBQUMsSUFBSTthQUNYO1lBQ0QsSUFBSSxFQUFDO2dCQUNELEdBQUcsRUFBQyxJQUFJO2dCQUNSLEdBQUcsRUFBQyxJQUFJO2FBQ1g7U0FDSjtRQUNELFdBQVcsRUFBRyxDQUFDO1FBQ2YsT0FBTyxFQUFDLE1BQU07UUFDZCxFQUFFLEVBQUUsb0JBQVM7UUFDYixZQUFZLHlCQUFx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RSxFQUFHLEdBQUcsbUJBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7b0JBQy9CLFFBQVEsRUFBRyxFQUFFLEdBQUMsSUFBSSxHQUFDLElBQUk7b0JBQ3ZCLE1BQU0sRUFBQzt3QkFDSCxRQUFRLEVBQUUsV0FBVzt3QkFDckIsT0FBTyxFQUFHLEVBQUUsR0FBQyxJQUFJO3FCQUNwQjtvQkFDRCxNQUFNLEVBQUcsRUFBQyxHQUFHLEVBQUMsQ0FBQyxFQUFDO2lCQUNuQixDQUFDLENBQUMsQ0FBQTtnQkFDSCxNQUFNLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNsQztTQUNKO0tBQ0o7SUFFRCxNQUFNLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtBQUduQyxDQUFDO0FBbEdELDRCQWtHQyIsImZpbGUiOiJ0YXNrc19iZHRfYmV0YS9Db25uZWN0X0Nsb3NlX1RDUF9MTkNsb3NlL29ubG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXJyb3JDb2RlLCBOZXRFbnRyeSwgTmFtZXNwYWNlLCBBY2Nlc3NOZXRUeXBlLCBCdWZmZXJSZWFkZXIsIExvZ2dlciwgVGFza0NsaWVudEludGVyZmFjZSwgQ2xpZW50RXhpdENvZGUsIEJ1ZmZlcldyaXRlciwgUmFuZG9tR2VuZXJhdG9yfSBmcm9tICcuLi8uLi9iYXNlJztcclxuaW1wb3J0IHtUZXN0UnVubmVyfSBmcm9tICcuLi8uLi90YXNrVG9vbHMvY3lmc19iZHQvdGVzdFJ1bm5lcic7XHJcbmltcG9ydCB7VGVzdGNhc2UsVGFzayxBY3Rpb25UeXBlLFJlc3BfZXBfdHlwZX0gZnJvbSBcIi4uLy4uL3Rhc2tUb29scy9jeWZzX2JkdC90eXBlXCJcclxuaW1wb3J0IHtsYWJBZ2VudCxCZHRQZWVyQ2xpZW50Q29uZmlnLExhYlNuTGlzdCwgUE5UeXBlfSBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L2xhYkFnZW50XCJcclxuaW1wb3J0ICAqIGFzIEJEVEFjdGlvbiBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L2JkdEFjdGlvblwiXHJcbmltcG9ydCB7QWdlbnRNYW5hZ2VyfSBmcm9tICcuLi8uLi90YXNrVG9vbHMvY3lmc19iZHQvYWdlbnRNYW5hZ2VyJ1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFRhc2tNYWluKF9pbnRlcmZhY2U6IFRhc2tDbGllbnRJbnRlcmZhY2UpIHtcclxuICAgIC8vKDEpIOi/nuaOpea1i+ivleiKgueCuVxyXG4gICAgbGV0IGFnZW50TWFuYWdlciA9IEFnZW50TWFuYWdlci5jcmVhdGVJbnN0YW5jZShfaW50ZXJmYWNlKTtcclxuICAgIGF3YWl0IGFnZW50TWFuYWdlci5pbml0QWdlbnRMaXN0KGxhYkFnZW50KTtcclxuICAgIC8vKDIpIOWIm+W7uua1i+ivleeUqOS+i+aJp+ihjOWZqCBUZXN0UnVubmVyXHJcbiAgICBsZXQgdGVzdFJ1bm5lciA9IG5ldyBUZXN0UnVubmVyKF9pbnRlcmZhY2UpO1xyXG4gICAgbGV0IHRlc3RjYXNlTmFtZSA9IFwiQ29ubmVjdF9DbG9zZV9UQ1BfTE5DbG9zZVwiXHJcbiAgICBsZXQgdGVzdGNhc2U6VGVzdGNhc2UgPSB7XHJcbiAgICAgICAgVGVzdGNhc2VOYW1lOiB0ZXN0Y2FzZU5hbWUsXHJcbiAgICAgICAgdGVzdGNhc2VJZDogYCR7dGVzdGNhc2VOYW1lfV8ke0RhdGUubm93KCl9YCxcclxuICAgICAgICByZW1hcms6IGAjIOaTjeS9nOa1geeoi++8mlxcblxyXG4gICAgICAgICsg77yIMe+8iUxOL1JOIOWIneWni+WMluacrOWcsEJEVOWNj+iuruagiFxyXG4gICAgICAgICsg77yIMu+8iUxOIOWQkSBSTiDlj5HotbfpppbmrKHov57mjqXvvIzlj5HpgIExME3lpKflsI9zdHJlYW0g5pWw5o2u77yM5YWz6Zet6L+e5o6lXHJcbiAgICAgICAgKyDvvIgz77yJTE4g5ZCRIFJOIOWPkei1t+S6jOasoei/nuaOpe+8jOWPkemAgTEwTeWkp+Wwj3N0cmVhbSDmlbDmja7vvIzlhbPpl63ov57mjqVcclxuICAgICAgICArIO+8iDTvvIlSTiDlkJEgTE4g5Y+R6LW35Y+N5ZCR6L+e5o6l77yM5Y+R6YCBMTBN5aSn5bCPc3RyZWFtIOaVsOaNru+8jOWFs+mXrei/nuaOpVxyXG4gICAgICAgICsgICg1KSDlhbPpl63miYDmnInov57mjqUgYCxcclxuICAgICAgICBlbnZpcm9ubWVudDogXCJsYWJcIixcclxuICAgIH07XHJcbiAgICBhd2FpdCB0ZXN0UnVubmVyLmluaXRUZXN0Y2FzZSh0ZXN0Y2FzZSk7XHJcbiAgICAvLygzKSDliJvlu7pCRFTmtYvor5XlrqLmiLfnq69cclxuICAgIGxldCBjb25maWcgOiBCZHRQZWVyQ2xpZW50Q29uZmlnID0ge1xyXG4gICAgICAgICAgICBlcHM6e1xyXG4gICAgICAgICAgICAgICAgaXB2NDp7XHJcbiAgICAgICAgICAgICAgICAgICAgdWRwOnRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGNwOnRydWUsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgaXB2Njp7XHJcbiAgICAgICAgICAgICAgICAgICAgdWRwOnRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGNwOnRydWUsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHVkcF9zbl9vbmx5IDogMSxcclxuICAgICAgICAgICAgbG9nVHlwZTpcImluZm9cIixcclxuICAgICAgICAgICAgU04gOkxhYlNuTGlzdCxcclxuICAgICAgICAgICAgcmVzcF9lcF90eXBlOlJlc3BfZXBfdHlwZS5TTl9SZXNwLFxyXG4gICAgfVxyXG4gICAgLy8g5q+P5Y+w5py65Zmo6L+Q6KGM5LiA5LiqYmR0IOWuouaIt+err1xyXG4gICAgYXdhaXQgYWdlbnRNYW5hZ2VyLmFsbEFnZW50U3RhcnRCZHRQZWVyKGNvbmZpZylcclxuICAgIC8vKDQpIOa1i+ivleeUqOS+i+aJp+ihjOWZqOa3u+WKoOa1i+ivleS7u+WKoVxyXG4gICAgXHJcbiAgICBmb3IobGV0IGkgaW4gbGFiQWdlbnQpe1xyXG4gICAgICAgIGZvcihsZXQgaiBpbiBsYWJBZ2VudCApe1xyXG4gICAgICAgICAgICBpZihpICE9IGogJiYgbGFiQWdlbnRbaV0uTkFUICsgbGFiQWdlbnRbal0uTkFUIDwgNSApe1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLmNyZWF0ZVByZXZUYXNrKHtcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uIDogW11cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNvbm5lY3RBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLmNvbm5lY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgTE4gOiBgJHtsYWJBZ2VudFtpXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBSTiA6IGAke2xhYkFnZW50W2pdLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLlNlbmRTdHJlYW1BY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfc3RyZWFtLFxyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgUk4gOiBgJHtsYWJBZ2VudFtqXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZSA6IDEwKjEwMjQqMTAyNCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uX3RhZzogXCJjb25uZWN0XzFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBlY3QgOiB7ZXJyOjB9LCAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNsb3NlQ29ubmVjdEFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuY2xvc2VfY29ubmVjdCxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uU2VuZFN0cmVhbU5vdFJlYWRBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfc3RyZWFtLFxyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgUk4gOiBgJHtsYWJBZ2VudFtpXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZSA6IDEwKjEwMjQqMTAyNCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uX3RhZzogXCJjb25uZWN0XzFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBlY3QgOiB7ZXJyOjB9LCAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrUnVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGVzdFJ1bm5lci53YWl0RmluaXNoZWQoKVxyXG4gICAgXHJcbiAgICBcclxufVxyXG4iXX0=
