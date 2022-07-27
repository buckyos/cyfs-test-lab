const base = require('./common/base');

const {PackageCodecCreator} = require('./package_codec');
const {TcpServer} = require('./tcp_server');
const {AgentMgr} = require('./agent_mgr');

const CONNECTION_TIMEOUT_MS = 600000;

async function RunAgentServer(agentMgr, Config) {
    let server = new TcpServer(new PackageCodecCreator(), Config.server.port || 1108, '0.0.0.0');
    let newConnectionSet = new Set();
    let timewaitConnectionSet = new Set();

    let err = await agentMgr.init();
    if (err) {
        base.blog.error('agent manager init failed: ', err.message);
        return;
    }

    const connectionCheckTimer = setInterval(() => {
        timewaitConnectionSet.forEach(connection => {
            if (!agentMgr.getAgentKeyByConnection(connection)) {
                connection.close();
            }
        });
        timewaitConnectionSet = newConnectionSet;
        newConnectionSet = new Set();
    }, CONNECTION_TIMEOUT_MS);

    const clean = () => {
        timewaitConnectionSet.forEach(connection => connection.close());
        timewaitConnectionSet.clear();
        newConnectionSet.forEach(connection => connection.close());
        newConnectionSet.clear();
        agentMgr.forEachConnections(connection => connection.close());
        clearInterval(connectionCheckTimer);
        connectionCheckTimer = null;
        server.stop();
    };

    server.once('close', clean);
    server.once('error', clean);
    server.on('connection', connection => {
        newConnectionSet.add(connection);

        const removeConnection = () => {
            if (agentMgr.getAgentKeyByConnection(connection)) {
                agentMgr.removeConnection(connection);
            } else {
                newConnectionSet.delete(connection);
                timewaitConnectionSet.delete(connection);
            }
            connection.close();
        }

        connection.once('close', removeConnection);
        connection.once('error', removeConnection);
        connection.on('packages', pkgs => {
            if (!pkgs || !pkgs.length) {
                return;
            }

            if (!agentMgr.getAgentKeyByConnection(connection)) {
                if (!newConnectionSet.delete(connection)) {
                    timewaitConnectionSet.delete(connection);
                }
                
                timewaitConnectionSet.delete(connection);
                let oldConnection = agentMgr.addNewConnection(connection, pkgs[0]);
                if (oldConnection) {
                    oldConnection.close();
                }
            }

            for (let pkg of pkgs) {
                agentMgr.handle(pkg, connection);
            }
        });

        connection.setTimeout(CONNECTION_TIMEOUT_MS);
        connection.start();
    });

    await server.start();
}

module.exports = RunAgentServer;