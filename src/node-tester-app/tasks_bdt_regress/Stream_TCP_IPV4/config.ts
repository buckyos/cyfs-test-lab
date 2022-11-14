export const MaxConcurrency = 10; // 测试任务最大并发数
export const ErrorBreak = false; // 错误是否退出 
export const MaxTaskNum = 200; // 测试任务最大执行次数，目的快速执行全部用例
export const saveJson = true; //保存测试数据到JSON
export const ReportAction = true; //Action 操作是否数据上报Mysql
export const ReportTask = true; //Task 操作是否数据上报Mysql
export const ReportTestcase = true; //Testcase 操作是否数据上报Mysql
export const ReportAgent = true; //上报Agent测试节点数据
export const ListenerAgentPerf = 2000;
export const ReportAgentPerfInfo = true;
export const ReportAgentPerfWait = 5000;
export const AgentConcurrencyIgnoreWAN = true;
export const ReportAgentCheckRun = true; 
export const ReportBDTPeer = true; //上报BDT客户端数据
export const RUST_LOG = "info"; //BDT 日志级别