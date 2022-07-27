// .csv:
// serviceId,version,name,url,md5

/**
 * usage:
 * node import_services.js path.csv
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const Storage = require('../storage');
const {Constant} = require('../protocol');

function importOne(line, storageHandle) {
    let fields = line.split(',');
    if (fields.length < 5) {
        return;
    }

    let [id, version, name, url, md5] = fields;

    const service = {
        id,
        version,
        name,
        url,
        md5,
    };

    storageHandle.addService(service);
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