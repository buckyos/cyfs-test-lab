const path = require('path');
const Config = require('./common/config')
const base = require('./common/base');
const CrashListener = require('./common/crash_listener');

const {AgentMgr} = require('./agent_mgr');
const RunAgentServer = require('./agent_server');
const RunAgentControl = require('./agent_control');

function main() {
    const workFolder = path.dirname(__dirname);
    process.chdir(workFolder);
    Config.init();

    let crashListener = new CrashListener();
    crashListener.listen((err) => {
        base.blog.info(err.stack);
    });

    let logFolder = `${workFolder}/blog/`;
    crashListener.enableFileLog(logFolder);
    base.BX_SetLogLevel(Config.logLevel || 'info');
    base.BX_EnableFileLog(logFolder, 'agent_master', '.log');
    base.blog.enableConsoleTarget(false);

    let agentMgr = new AgentMgr();
    RunAgentServer(agentMgr, Config);
    RunAgentControl(agentMgr, Config);
}

main();