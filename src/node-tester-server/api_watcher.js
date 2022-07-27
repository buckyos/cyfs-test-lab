
const {exec} = require('child_process');
const path = require('path');

async function main() {
    while (true) {
        let rootPath = path.dirname(path.dirname(require.main.filename));
        exec(`${rootPath}/restart.sh`);
        await new Promise(resolve => setTimeout(() => resolve(), 600000));
    }
}

main();