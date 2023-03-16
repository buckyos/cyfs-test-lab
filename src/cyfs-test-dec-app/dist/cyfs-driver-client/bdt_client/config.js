"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUST_LOG = exports.ReportBDTPeer = exports.ReportAgentCheckRun = exports.AgentConcurrencyIgnoreWAN = exports.ReportAgentPerfWait = exports.ReportAgentPerfInfo = exports.ListenerAgentPerf = exports.ReportAgent = exports.ReportTestcase = exports.ReportTask = exports.ReportAction = exports.saveJson = exports.MaxTaskNum = exports.ErrorBreak = exports.MaxConcurrency = void 0;
exports.MaxConcurrency = 10; // 测试任务最大并发数
exports.ErrorBreak = false; // 错误是否退出 
exports.MaxTaskNum = 150; // 测试任务最大执行次数，目的快速执行全部用例
exports.saveJson = true; //保存测试数据到JSON
exports.ReportAction = true; //Action 操作是否数据上报Mysql
exports.ReportTask = true; //Task 操作是否数据上报Mysql
exports.ReportTestcase = true; //Testcase 操作是否数据上报Mysql
exports.ReportAgent = true; //上报Agent测试节点数据
exports.ListenerAgentPerf = 2000;
exports.ReportAgentPerfInfo = true;
exports.ReportAgentPerfWait = 5000;
exports.AgentConcurrencyIgnoreWAN = true;
exports.ReportAgentCheckRun = true;
exports.ReportBDTPeer = true; //上报BDT客户端数据
exports.RUST_LOG = "info"; //BDT 日志级别
