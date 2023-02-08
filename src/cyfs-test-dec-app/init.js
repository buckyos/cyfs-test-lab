const path =require("path");
const fs =require("fs-extra");
const child_process = require('child_process');
var CyfsSDKType;
(function (CyfsSDKType) {
    CyfsSDKType["cyfs_beta_ts"] = "export * from 'cyfs-sdk';";
    CyfsSDKType["cyfs_nightly_ts"] = "export * from 'cyfs-sdk-nightly';";
    CyfsSDKType["cyfs_node_ts"] = "export * from './cyfs_node';";
    CyfsSDKType["cyfs_source_ts"] = "export * from '../../../cyfs-ts-sdk/src/sdk';";
})(CyfsSDKType = exports.CyfsSDKType || (exports.CyfsSDKType = {}));
async function changeImport(type) {
    let path_ts = path.join(__dirname, "./cyfs/index.ts");
    console.info(`change cyfs sdk type to ${type}`);
    if (fs.pathExistsSync(path_ts)) {
        fs.writeFileSync(path_ts, type);
    }
}
async function sleep(time) {
    return new Promise(async (V) => {
        setTimeout(() => {
            V("");
        }, time);
    });
}
const SysProcess = require("process");
async function main() {
    var type = SysProcess.argv[2];
    if (type == "source") {
        console.info(`You will use cyfs-sdk source code`);
        //child_process.execSync("init_source.bat master");
        await changeImport(CyfsSDKType.cyfs_source_ts);
    }else if (type == "cyfs-node") {
        console.info(`You will use cyfs-sdk complite cyfs_node`);
        if (!fs.pathExistsSync(path.join(__dirname, "./cyfs_node/index.ts"))) {
            console.error("Please complite cyfs-sdk frist ");
        }
        await changeImport(CyfsSDKType.cyfs_node_ts);
    }
    else if (type == "cyfs-sdk-nightly") {
        console.info(`You will use cyfs-sdk-nightly`);
        await changeImport(CyfsSDKType.cyfs_nightly_ts);
    }
    else if (type == "cyfs-sdk") {
        console.info(`You will use cyfs-sdk beta`);
        await changeImport(CyfsSDKType.cyfs_beta_ts);
    }
    else {
        console.error("Please check your params ");
    }
}
main().finally(() => {
    console.info("修改完成");
});
