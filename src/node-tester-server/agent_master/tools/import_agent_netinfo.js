// .csv:
// agentId,netName,netType,ipv4,ipv6,udpEnable,tcpEnable
// ipv4/ipv6: "ip1;ip2;...;ipn"

/**
 * usage:
 * node import_agents.js path.csv
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const Storage = require('../storage');
const {Constant} = require('../protocol');

function importOne(line, storageHandle, sameAgentIdCount) {
    let fields = line.split(',');
    if (fields.length < 7) {
        return;
    }

    let [agentId, netName, netType, ipv4Str, ipv6Str, udpEnable, tcpEnable] = fields;

    if (`${parseInt(netType)}` !== netType) {
        switch (netType) {
            case 'wifi':
                netType = Constant.netInfo.type.wifi;
                break;
            case 'wire':
                netType = Constant.netInfo.type.wire;
                break;
            default:
                netType = Constant.netInfo.type.any;
        }
    }
    netType = parseInt(netType);

    if (`${parseInt(udpEnable)}` !== udpEnable) {
        switch (udpEnable) {
            case 'open':
                udpEnable = Constant.netInfo.udpEnable.open;
                break;
            case 'close':
                udpEnable = Constant.netInfo.udpEnable.close;
                break;
            default:
                udpEnable = Constant.netInfo.udpEnable.any;
        }
    }
    udpEnable = parseInt(udpEnable);

    if (`${parseInt(tcpEnable)}` !== tcpEnable) {
        switch (tcpEnable) {
            case 'open':
                tcpEnable = Constant.netInfo.tcpEnable.open;
                break;
            case 'close':
                tcpEnable = Constant.netInfo.tcpEnable.close;
                break;
            default:
                tcpEnable = Constant.netInfo.tcpEnable.any;
        }
    }
    tcpEnable = parseInt(tcpEnable);
    
    if (ipv4Str[0] == '"') {
        ipv4Str = ipv4Str.slice(1, ipv4Str.length - 1);
    }
    
    if (ipv6Str[0] == '"') {
        ipv6Str = ipv6Str.slice(1, ipv6Str.length - 1);
    }

    const netInfo = {
        id: sameAgentIdCount,
        name: netName,
        type: netType,
        ipv4: ipv4Str.length === 0? [] : ipv4Str.split(';'),
        ipv6: ipv6Str.length === 0? [] : ipv6Str.split(';'),
        udpEnable,
        tcpEnable,
    };

    storageHandle.addAgentNetInfo(agentId, netInfo);
    return agentId;
}

async function main(csvPath) {
    const workFolder = path.dirname(path.dirname(__dirname));
    let storageHandle = new Storage(workFolder);
    await storageHandle.init();

    return new Promise(reslove => {
        storageHandle.beginTranaction();

        const rl = readline.createInterface({
            input: fs.createReadStream(csvPath),
            crlfDelay: Infinity
        });
        
        let importCount = 0;
        let lastAgentId = '';
        let sameAgentIdCount = 0;

        rl.on('line', (line) => {
            if (importCount === 0) {
                importCount++;
                return;
            }

            try {
                let agentId = importOne(line, storageHandle, sameAgentIdCount);
                if (agentId === lastAgentId) {
                    sameAgentIdCount++;
                } else {
                    sameAgentIdCount = 0;
                }
                importCount++;
            } catch (error) {
                console.warn(`line:${line} import failed(${error.message}).`);
            }
        });
    
        rl.on('close', () => {
            storageHandle.commitTransaction();
            console.log(`${importCount - 1} agents imported.`);
            reslove(0);
        });
    });
}

main(process.argv[2]);