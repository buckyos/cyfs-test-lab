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
    let testcaseName = "Connect_AllEP_TunnelSelect";
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
        logType: "info",
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
                // info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                //     type: "send-stream" /* send_stream */,
                //     LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                //     RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                //     fileSize: 10 * 1024 * 1024,
                //     config: {
                //         conn_tag: "connect_1",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                // info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                //     type: "close-connect" /* close_connect */,
                //     LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                //     config: {
                //         conn_tag: "connect_1",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                // info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                //     type: "connect-second" /* connect_second */,
                //     LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                //     RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                //     config: {
                //         conn_tag: "connect_2",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                // info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                //     type: "send-stream" /* send_stream */,
                //     LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                //     RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                //     fileSize: 10 * 1024 * 1024,
                //     config: {
                //         conn_tag: "connect_2",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                // info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                //     type: "close-connect" /* close_connect */,
                //     LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                //     config: {
                //         conn_tag: "connect_2",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                info = await testRunner.prevTaskAddAction(new BDTAction.ConnectAction({
                    type: "connect-reverse" /* connect_reverse */,
                    LN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    config: {
                        conn_tag: "connect_3",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                info = await testRunner.prevTaskAddAction(new BDTAction.SendStreamAction({
                    type: "send-stream" /* send_stream */,
                    LN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    fileSize: 10 * 1024 * 1024,
                    config: {
                        conn_tag: "connect_3",
                        timeout: 60 * 1000,
                    },
                    expect: { err: 0 },
                }));
                // info = await testRunner.prevTaskAddAction(new BDTAction.CloseConnectAction({
                //     type: "close-connect" /* close_connect */,
                //     LN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                //     config: {
                //         conn_tag: "connect_3",
                //         timeout: 60 * 1000,
                //     },
                //     expect: { err: 0 },
                // }));
                await testRunner.prevTaskRun();
            }
        }
    }
    await testRunner.waitFinished();
}
exports.TaskMain = TaskMain;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza3NfYmR0X2JldGEvQ29ubmVjdF9BbGxFUF9UdW5uZWxTZWxlY3Qvb25sb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxvRUFBK0Q7QUFFL0QsZ0VBQXdGO0FBQ3hGLDhFQUFnRTtBQUNoRSx3RUFBa0U7QUFFM0QsS0FBSyxVQUFVLFFBQVEsQ0FBQyxVQUErQjtJQUMxRCxZQUFZO0lBQ1osSUFBSSxZQUFZLEdBQUcsMkJBQVksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDM0QsTUFBTSxZQUFZLENBQUMsYUFBYSxDQUFDLG1CQUFRLENBQUMsQ0FBQztJQUMzQywwQkFBMEI7SUFDMUIsSUFBSSxVQUFVLEdBQUcsSUFBSSx1QkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLElBQUksWUFBWSxHQUFHLDRCQUE0QixDQUFBO0lBQy9DLElBQUksUUFBUSxHQUFZO1FBQ3BCLFlBQVksRUFBRSxZQUFZO1FBQzFCLFVBQVUsRUFBRSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDM0MsTUFBTSxFQUFFOzs7Ozt1QkFLTztRQUNmLFdBQVcsRUFBRSxLQUFLO0tBQ3JCLENBQUM7SUFDRixNQUFNLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEMsZ0JBQWdCO0lBQ2hCLElBQUksTUFBTSxHQUF5QjtRQUMzQixHQUFHLEVBQUM7WUFDQSxJQUFJLEVBQUM7Z0JBQ0QsR0FBRyxFQUFDLElBQUk7Z0JBQ1IsR0FBRyxFQUFDLElBQUk7YUFDWDtZQUNELElBQUksRUFBQztnQkFDRCxHQUFHLEVBQUMsSUFBSTtnQkFDUixHQUFHLEVBQUMsSUFBSTthQUNYO1NBQ0o7UUFDRCxPQUFPLEVBQUMsTUFBTTtRQUNkLEVBQUUsRUFBRSxvQkFBUztRQUNiLFlBQVkseUJBQXFCO0tBQ3hDLENBQUE7SUFDRCxr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RyxtQkFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtvQkFDL0IsTUFBTSxFQUFDO3dCQUNILFFBQVEsRUFBRSxXQUFXO3dCQUNyQixPQUFPLEVBQUcsRUFBRSxHQUFDLElBQUk7cUJBQ3BCO29CQUNELE1BQU0sRUFBRyxFQUFDLEdBQUcsRUFBQyxDQUFDLEVBQUM7aUJBQ25CLENBQUMsQ0FBQyxDQUFBO2dCQUNILE1BQU0sVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ2xDO1NBQ0o7S0FDSjtJQUVELE1BQU0sVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFBO0FBR25DLENBQUM7QUFsSkQsNEJBa0pDIiwiZmlsZSI6InRhc2tzX2JkdF9iZXRhL0Nvbm5lY3RfQWxsRVBfVHVubmVsU2VsZWN0L29ubG9hZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXJyb3JDb2RlLCBOZXRFbnRyeSwgTmFtZXNwYWNlLCBBY2Nlc3NOZXRUeXBlLCBCdWZmZXJSZWFkZXIsIExvZ2dlciwgVGFza0NsaWVudEludGVyZmFjZSwgQ2xpZW50RXhpdENvZGUsIEJ1ZmZlcldyaXRlciwgUmFuZG9tR2VuZXJhdG9yfSBmcm9tICcuLi8uLi9iYXNlJztcclxuaW1wb3J0IHtUZXN0UnVubmVyfSBmcm9tICcuLi8uLi90YXNrVG9vbHMvY3lmc19iZHQvdGVzdFJ1bm5lcic7XHJcbmltcG9ydCB7VGVzdGNhc2UsVGFzayxBY3Rpb25UeXBlLFJlc3BfZXBfdHlwZX0gZnJvbSBcIi4uLy4uL3Rhc2tUb29scy9jeWZzX2JkdC90eXBlXCJcclxuaW1wb3J0IHtsYWJBZ2VudCxCZHRQZWVyQ2xpZW50Q29uZmlnLExhYlNuTGlzdH0gZnJvbSBcIi4uLy4uL3Rhc2tUb29scy9jeWZzX2JkdC9sYWJBZ2VudFwiXHJcbmltcG9ydCAgKiBhcyBCRFRBY3Rpb24gZnJvbSBcIi4uLy4uL3Rhc2tUb29scy9jeWZzX2JkdC9iZHRBY3Rpb25cIlxyXG5pbXBvcnQge0FnZW50TWFuYWdlcn0gZnJvbSAnLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L2FnZW50TWFuYWdlcidcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBUYXNrTWFpbihfaW50ZXJmYWNlOiBUYXNrQ2xpZW50SW50ZXJmYWNlKSB7XHJcbiAgICAvLygxKSDov57mjqXmtYvor5XoioLngrlcclxuICAgIGxldCBhZ2VudE1hbmFnZXIgPSBBZ2VudE1hbmFnZXIuY3JlYXRlSW5zdGFuY2UoX2ludGVyZmFjZSk7XHJcbiAgICBhd2FpdCBhZ2VudE1hbmFnZXIuaW5pdEFnZW50TGlzdChsYWJBZ2VudCk7XHJcbiAgICAvLygyKSDliJvlu7rmtYvor5XnlKjkvovmiafooYzlmaggVGVzdFJ1bm5lclxyXG4gICAgbGV0IHRlc3RSdW5uZXIgPSBuZXcgVGVzdFJ1bm5lcihfaW50ZXJmYWNlKTtcclxuICAgIGxldCB0ZXN0Y2FzZU5hbWUgPSBcIkNvbm5lY3RfQWxsRVBfVHVubmVsU2VsZWN0XCJcclxuICAgIGxldCB0ZXN0Y2FzZTpUZXN0Y2FzZSA9IHtcclxuICAgICAgICBUZXN0Y2FzZU5hbWU6IHRlc3RjYXNlTmFtZSxcclxuICAgICAgICB0ZXN0Y2FzZUlkOiBgJHt0ZXN0Y2FzZU5hbWV9XyR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICAgIHJlbWFyazogYCMg5pON5L2c5rWB56iL77yaXFxuXHJcbiAgICAgICAgKyDvvIgx77yJTE4vUk4g5Yid5aeL5YyW5pys5ZywQkRU5Y2P6K6u5qCIXHJcbiAgICAgICAgKyDvvIgy77yJTE4g5ZCRIFJOIOWPkei1t+mmluasoei/nuaOpe+8jOWPkemAgTEwTeWkp+Wwj3N0cmVhbSDmlbDmja7vvIzlhbPpl63ov57mjqVcclxuICAgICAgICArIO+8iDPvvIlMTiDlkJEgUk4g5Y+R6LW35LqM5qyh6L+e5o6l77yM5Y+R6YCBMTBN5aSn5bCPc3RyZWFtIOaVsOaNru+8jOWFs+mXrei/nuaOpVxyXG4gICAgICAgICsg77yINO+8iVJOIOWQkSBMTiDlj5Hotbflj43lkJHov57mjqXvvIzlj5HpgIExME3lpKflsI9zdHJlYW0g5pWw5o2u77yM5YWz6Zet6L+e5o6lXHJcbiAgICAgICAgKyAgKDUpIOWFs+mXreaJgOaciei/nuaOpSBgLFxyXG4gICAgICAgIGVudmlyb25tZW50OiBcImxhYlwiLFxyXG4gICAgfTtcclxuICAgIGF3YWl0IHRlc3RSdW5uZXIuaW5pdFRlc3RjYXNlKHRlc3RjYXNlKTtcclxuICAgIC8vKDMpIOWIm+W7ukJEVOa1i+ivleWuouaIt+err1xyXG4gICAgbGV0IGNvbmZpZyA6IEJkdFBlZXJDbGllbnRDb25maWcgPSB7XHJcbiAgICAgICAgICAgIGVwczp7XHJcbiAgICAgICAgICAgICAgICBpcHY0OntcclxuICAgICAgICAgICAgICAgICAgICB1ZHA6dHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0Y3A6dHJ1ZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBpcHY2OntcclxuICAgICAgICAgICAgICAgICAgICB1ZHA6dHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0Y3A6dHJ1ZSxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbG9nVHlwZTpcImluZm9cIixcclxuICAgICAgICAgICAgU04gOkxhYlNuTGlzdCxcclxuICAgICAgICAgICAgcmVzcF9lcF90eXBlOlJlc3BfZXBfdHlwZS5TTl9SZXNwLCBcclxuICAgIH1cclxuICAgIC8vIOavj+WPsOacuuWZqOi/kOihjOS4gOS4qmJkdCDlrqLmiLfnq69cclxuICAgIGF3YWl0IGFnZW50TWFuYWdlci5hbGxBZ2VudFN0YXJ0QmR0UGVlcihjb25maWcpXHJcbiAgICAvLyg0KSDmtYvor5XnlKjkvovmiafooYzlmajmt7vliqDmtYvor5Xku7vliqFcclxuICAgIFxyXG4gICAgZm9yKGxldCBpIGluIGxhYkFnZW50KXtcclxuICAgICAgICBmb3IobGV0IGogaW4gbGFiQWdlbnQpe1xyXG4gICAgICAgICAgICBpZihpICE9IGogJiYgbGFiQWdlbnRbaV0uTkFUICsgbGFiQWdlbnRbal0uTkFUIDwgNSApe1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLmNyZWF0ZVByZXZUYXNrKHtcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uIDogW11cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNvbm5lY3RBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLmNvbm5lY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgTE4gOiBgJHtsYWJBZ2VudFtpXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBSTiA6IGAke2xhYkFnZW50W2pdLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLlNlbmRTdHJlYW1BY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfc3RyZWFtLFxyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgUk4gOiBgJHtsYWJBZ2VudFtqXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZSA6IDEwKjEwMjQqMTAyNCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uX3RhZzogXCJjb25uZWN0XzFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBlY3QgOiB7ZXJyOjB9LCAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNsb3NlQ29ubmVjdEFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuY2xvc2VfY29ubmVjdCxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uQ29ubmVjdEFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuY29ubmVjdF9zZWNvbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgTE4gOiBgJHtsYWJBZ2VudFtpXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBSTiA6IGAke2xhYkFnZW50W2pdLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLlNlbmRTdHJlYW1BY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfc3RyZWFtLFxyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgUk4gOiBgJHtsYWJBZ2VudFtqXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZSA6IDEwKjEwMjQqMTAyNCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uX3RhZzogXCJjb25uZWN0XzJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dCA6IDYwKjEwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBlY3QgOiB7ZXJyOjB9LCAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNsb3NlQ29ubmVjdEFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuY2xvc2VfY29ubmVjdCxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSkgXHJcbiAgICAgICAgICAgICAgICBpbmZvID0gYXdhaXQgdGVzdFJ1bm5lci5wcmV2VGFza0FkZEFjdGlvbihuZXcgQkRUQWN0aW9uLkNvbm5lY3RBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLmNvbm5lY3RfcmV2ZXJzZSxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2pdLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnOntcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubl90YWc6IFwiY29ubmVjdF8zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQgOiA2MCoxMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0IDoge2VycjowfSwgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uU2VuZFN0cmVhbUFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuc2VuZF9zdHJlYW0sXHJcbiAgICAgICAgICAgICAgICAgICAgTE4gOiBgJHtsYWJBZ2VudFtqXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICBSTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplIDogMTAqMTAyNCoxMDI0LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzp7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5fdGFnOiBcImNvbm5lY3RfM1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uQ2xvc2VDb25uZWN0QWN0aW9uKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlIDogQWN0aW9uVHlwZS5jbG9zZV9jb25uZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnOntcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubl90YWc6IFwiY29ubmVjdF8zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQgOiA2MCoxMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0IDoge2VycjowfSwgICAgICBcclxuICAgICAgICAgICAgICAgIH0pKSAgXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrUnVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgdGVzdFJ1bm5lci53YWl0RmluaXNoZWQoKVxyXG4gICAgXHJcbiAgICBcclxufVxyXG4iXX0=
