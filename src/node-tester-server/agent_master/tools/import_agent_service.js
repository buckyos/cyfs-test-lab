// .csv:
// agentId,serviceId,serviceVersion

/**
 * usage:
 * node import_agent_service.js path.csv
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const Storage = require('../storage');
const {Constant} = require('../protocol');

function importOne(line, storageHandle) {
    let fields = line.split(',');
    if (fields.length < 3) {
        return;
    }

    let [agentId, serviceId, serviceVersion] = fields;

    storageHandle.addAgentService(serviceId, serviceVersion, agentId);
}

async function main(csvPath) {
    csvPath = 'E:\\project\\node_tester\\doc\\agent_service_map.csv';
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

        rl.on('line', (line) => {
            if (importCount === 0) {
                importCount++;
                return;
            }

            try {
                importOne(line, storageHandle);
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