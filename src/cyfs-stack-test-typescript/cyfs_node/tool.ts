import * as path from "path";
import * as fs from "fs-extra";
export enum CyfsSDKType{
    cyfs_beta = "cyfs_beta",
    cyfs_nightly = "cyfs_nightly",
    cyfs_node = "cyfs_node",
    cyfs_source = "cyfs_source",
}
export async function changeImport(type:CyfsSDKType) {
    let path_ts = path.join(__dirname,"./index.ts")
    let path_js = path.join(__dirname,"./index.js")
    console.info(`change cyfs sdk type to ${type}`)
    if(fs.pathExistsSync(path_ts)){
        let read = fs.readFileSync(path_ts).toString().replace("cyfs_node",`${type}`)
        fs.writeFileSync(path_ts,read);
    }
    if(fs.pathExistsSync(path_js)){
        let read = fs.readFileSync(path_js).toString().replace("cyfs_node",`${type}`)
        fs.writeFileSync(path_js,read);
    }
}
