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
    let testcaseName = "NDN_DownloadUpload_together_File";
    let testcase = {
        TestcaseName: testcaseName,
        testcaseId: `${testcaseName}_${Date.now()}`,
        remark: `# 操作流程：\n
        + (1) LN、RN 初始化协议栈
        + (2) LN track上传一个10Mb文件，RN 进行Interest
        + (3) RN track上传一个10Mb文件，LN 进行Interest\n`,
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
                info = await testRunner.prevTaskAddAction(new BDTAction.SendFileAction({
                    type: "send-file" /* send_file */,
                    LN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    fileSize: 50 * 1024 * 1024,
                    chunkSize: 4 * 1024 * 1024,
                    config: {
                        timeout: 60 * 1000,
                        //not_wait_upload_finished: true,
                    },
                    expect: { err: 0 },
                }));
                info = await testRunner.prevTaskAddAction(new BDTAction.SendFileAction({
                    type: "send-file" /* send_file */,
                    LN: `${labAgent_1.labAgent[j].tags[0]}$1`,
                    RN: `${labAgent_1.labAgent[i].tags[0]}$1`,
                    fileSize: 50 * 1024 * 1024,
                    chunkSize: 4 * 1024 * 1024,
                    config: {
                        timeout: 60 * 1000,
                        //not_wait_upload_finished: true,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza3NfQkRUX05ETi9ORE5fRG93bmxvYWRVcGxvYWRfdG9nZXRoZXJfRmlsZS9vbmxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLG9FQUErRDtBQUUvRCxnRUFBd0Y7QUFDeEYsOEVBQWdFO0FBQ2hFLHdFQUFrRTtBQUUzRCxLQUFLLFVBQVUsUUFBUSxDQUFDLFVBQStCO0lBQzFELFlBQVk7SUFDWixJQUFJLFlBQVksR0FBRywyQkFBWSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRCxNQUFNLFlBQVksQ0FBQyxhQUFhLENBQUMsbUJBQVEsQ0FBQyxDQUFDO0lBQzNDLDBCQUEwQjtJQUMxQixJQUFJLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsSUFBSSxZQUFZLEdBQUcsa0NBQWtDLENBQUE7SUFDckQsSUFBSSxRQUFRLEdBQVk7UUFDcEIsWUFBWSxFQUFFLFlBQVk7UUFDMUIsVUFBVSxFQUFFLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUMzQyxNQUFNLEVBQUU7OztpREFHaUM7UUFDekMsV0FBVyxFQUFFLEtBQUs7S0FDckIsQ0FBQztJQUNGLE1BQU0sVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QyxnQkFBZ0I7SUFDaEIsSUFBSSxNQUFNLEdBQXlCO1FBQzNCLEdBQUcsRUFBQztZQUNBLElBQUksRUFBQztnQkFDRCxHQUFHLEVBQUMsSUFBSTtnQkFDUixHQUFHLEVBQUMsSUFBSTthQUNYO1lBQ0QsSUFBSSxFQUFDO2dCQUNELEdBQUcsRUFBQyxJQUFJO2dCQUNSLEdBQUcsRUFBQyxJQUFJO2FBQ1g7U0FDSjtRQUNELE9BQU8sRUFBQyxNQUFNO1FBQ2QsRUFBRSxFQUFFLG9CQUFTO1FBQ2IsWUFBWSx5QkFBcUI7S0FDeEMsQ0FBQTtJ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QUMsQ0FBQyxDQUFBO2dCQUNILE1BQU0sVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ2xDO1NBQ0o7S0FDSjtJQUVELE1BQU0sVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFBO0FBR25DLENBQUM7QUF4RkQsNEJBd0ZDIiwiZmlsZSI6InRhc2tzX0JEVF9ORE4vTkROX0Rvd25sb2FkVXBsb2FkX3RvZ2V0aGVyX0ZpbGUvb25sb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFcnJvckNvZGUsIE5ldEVudHJ5LCBOYW1lc3BhY2UsIEFjY2Vzc05ldFR5cGUsIEJ1ZmZlclJlYWRlciwgTG9nZ2VyLCBUYXNrQ2xpZW50SW50ZXJmYWNlLCBDbGllbnRFeGl0Q29kZSwgQnVmZmVyV3JpdGVyLCBSYW5kb21HZW5lcmF0b3J9IGZyb20gJy4uLy4uL2Jhc2UnO1xyXG5pbXBvcnQge1Rlc3RSdW5uZXJ9IGZyb20gJy4uLy4uL3Rhc2tUb29scy9jeWZzX2JkdC90ZXN0UnVubmVyJztcclxuaW1wb3J0IHtUZXN0Y2FzZSxUYXNrLEFjdGlvblR5cGUsUmVzcF9lcF90eXBlfSBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L3R5cGVcIlxyXG5pbXBvcnQge2xhYkFnZW50LEJkdFBlZXJDbGllbnRDb25maWcsTGFiU25MaXN0fSBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L2xhYkFnZW50XCJcclxuaW1wb3J0ICAqIGFzIEJEVEFjdGlvbiBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfYmR0L2JkdEFjdGlvblwiXHJcbmltcG9ydCB7QWdlbnRNYW5hZ2VyfSBmcm9tICcuLi8uLi90YXNrVG9vbHMvY3lmc19iZHQvYWdlbnRNYW5hZ2VyJ1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFRhc2tNYWluKF9pbnRlcmZhY2U6IFRhc2tDbGllbnRJbnRlcmZhY2UpIHtcclxuICAgIC8vKDEpIOi/nuaOpea1i+ivleiKgueCuVxyXG4gICAgbGV0IGFnZW50TWFuYWdlciA9IEFnZW50TWFuYWdlci5jcmVhdGVJbnN0YW5jZShfaW50ZXJmYWNlKTtcclxuICAgIGF3YWl0IGFnZW50TWFuYWdlci5pbml0QWdlbnRMaXN0KGxhYkFnZW50KTtcclxuICAgIC8vKDIpIOWIm+W7uua1i+ivleeUqOS+i+aJp+ihjOWZqCBUZXN0UnVubmVyXHJcbiAgICBsZXQgdGVzdFJ1bm5lciA9IG5ldyBUZXN0UnVubmVyKF9pbnRlcmZhY2UpO1xyXG4gICAgbGV0IHRlc3RjYXNlTmFtZSA9IFwiTkROX0Rvd25sb2FkVXBsb2FkX3RvZ2V0aGVyX0ZpbGVcIlxyXG4gICAgbGV0IHRlc3RjYXNlOlRlc3RjYXNlID0ge1xyXG4gICAgICAgIFRlc3RjYXNlTmFtZTogdGVzdGNhc2VOYW1lLFxyXG4gICAgICAgIHRlc3RjYXNlSWQ6IGAke3Rlc3RjYXNlTmFtZX1fJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgICAgcmVtYXJrOiBgIyDmk43kvZzmtYHnqIvvvJpcXG5cclxuICAgICAgICArICgxKSBMTuOAgVJOIOWIneWni+WMluWNj+iuruagiFxyXG4gICAgICAgICsgKDIpIExOIHRyYWNr5LiK5Lyg5LiA5LiqMTBNYuaWh+S7tu+8jFJOIOi/m+ihjEludGVyZXN0XHJcbiAgICAgICAgKyAoMykgUk4gdHJhY2vkuIrkvKDkuIDkuKoxME1i5paH5Lu277yMTE4g6L+b6KGMSW50ZXJlc3RcXG5gLFxyXG4gICAgICAgIGVudmlyb25tZW50OiBcImxhYlwiLFxyXG4gICAgfTtcclxuICAgIGF3YWl0IHRlc3RSdW5uZXIuaW5pdFRlc3RjYXNlKHRlc3RjYXNlKTtcclxuICAgIC8vKDMpIOWIm+W7ukJEVOa1i+ivleWuouaIt+err1xyXG4gICAgbGV0IGNvbmZpZyA6IEJkdFBlZXJDbGllbnRDb25maWcgPSB7XHJcbiAgICAgICAgICAgIGVwczp7XHJcbiAgICAgICAgICAgICAgICBpcHY0OntcclxuICAgICAgICAgICAgICAgICAgICB1ZHA6dHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0Y3A6dHJ1ZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBpcHY2OntcclxuICAgICAgICAgICAgICAgICAgICB1ZHA6dHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0Y3A6dHJ1ZSxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbG9nVHlwZTpcImluZm9cIixcclxuICAgICAgICAgICAgU04gOkxhYlNuTGlzdCxcclxuICAgICAgICAgICAgcmVzcF9lcF90eXBlOlJlc3BfZXBfdHlwZS5TTl9SZXNwLCBcclxuICAgIH1cclxuICAgIC8vIOavj+WPsOacuuWZqOi/kOihjOS4gOS4qmJkdCDlrqLmiLfnq69cclxuICAgIGF3YWl0IGFnZW50TWFuYWdlci5hbGxBZ2VudFN0YXJ0QmR0UGVlcihjb25maWcpXHJcbiAgICAvLyg0KSDmtYvor5XnlKjkvovmiafooYzlmajmt7vliqDmtYvor5Xku7vliqFcclxuICAgIFxyXG4gICAgZm9yKGxldCBpIGluIGxhYkFnZW50KXtcclxuICAgICAgICBmb3IobGV0IGogaW4gbGFiQWdlbnQpe1xyXG4gICAgICAgICAgICBpZihpICE9IGogJiYgbGFiQWdlbnRbaV0uTkFUICsgbGFiQWdlbnRbal0uTkFUIDwgNSl7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5mbyA9IGF3YWl0IHRlc3RSdW5uZXIuY3JlYXRlUHJldlRhc2soe1xyXG4gICAgICAgICAgICAgICAgICAgIExOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgUk4gOiBgJHtsYWJBZ2VudFtqXS50YWdzWzBdfSQxYCxcclxuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gOiBbXVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uQ29ubmVjdEFjdGlvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IEFjdGlvblR5cGUuY29ubmVjdCxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnOntcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubl90YWc6IFwiY29ubmVjdF8xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQgOiA2MCoxMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0IDoge2VycjowfSwgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uU2VuZEZpbGVBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfZmlsZSxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2ldLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbal0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVNpemUgOiA1MCoxMDI0KjEwMjQsXHJcbiAgICAgICAgICAgICAgICAgICAgY2h1bmtTaXplIDogNCoxMDI0KjEwMjQsXHJcbiAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm90X3dhaXRfdXBsb2FkX2ZpbmlzaGVkIDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGluZm8gPSBhd2FpdCB0ZXN0UnVubmVyLnByZXZUYXNrQWRkQWN0aW9uKG5ldyBCRFRBY3Rpb24uU2VuZEZpbGVBY3Rpb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiBBY3Rpb25UeXBlLnNlbmRfZmlsZSxcclxuICAgICAgICAgICAgICAgICAgICBMTiA6IGAke2xhYkFnZW50W2pdLnRhZ3NbMF19JDFgLFxyXG4gICAgICAgICAgICAgICAgICAgIFJOIDogYCR7bGFiQWdlbnRbaV0udGFnc1swXX0kMWAsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVNpemUgOiA1MCoxMDI0KjEwMjQsXHJcbiAgICAgICAgICAgICAgICAgICAgY2h1bmtTaXplIDogNCoxMDI0KjEwMjQsXHJcbiAgICAgICAgICAgICAgICAgICBjb25maWc6e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0IDogNjAqMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm90X3dhaXRfdXBsb2FkX2ZpbmlzaGVkIDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCA6IHtlcnI6MH0sICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRlc3RSdW5uZXIucHJldlRhc2tSdW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCB0ZXN0UnVubmVyLndhaXRGaW5pc2hlZCgpXHJcbiAgICBcclxuICAgIFxyXG59XHJcbiJdfQ==
