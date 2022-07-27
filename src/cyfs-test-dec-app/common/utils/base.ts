
// ood base root. this is  for  repo rebuild dir
import * as path from "path"
import {NamedObject, ObjectId} from "../../cyfs"
import { stackInfo } from "./stack"
import * as os from "os"

export function baseDir() {
    return path.join(getRoot(), 'tmp', 'cyfs-git')
}

export  function getRoot() {
    return stackInfo.cyfs_root
}

export function getRootFilePath(fileID: ObjectId) {
    const ood_root = getRoot()
    const local_path = path.join(ood_root, "data", "cyfs-git", fileID.to_base_58())

    return local_path
}


// for cyfs-runtime
export function getUserHomeDataDir() {
    if ( process.platform == 'win32' ) {
        return path.join(os.homedir(), 'AppData/Roaming/cybergit')
    } else {
        return path.join(os.homedir(), 'cybergit')
    }
}

export function isNoShowContent(file: string): boolean {
    const MAP:{[key: string]: number} = {'.doc': 1, '.docx': 1, '.xls': 1, '.xlsx': 1, '.ppt': 1, '.pptx': 1 }
    const ext = path.extname(file)
    console.log(`current file ext ${file}`)

    return !!MAP[ext]
}


export function getOwnerIdByObject(obj: NamedObject<any, any>): string {
    const owner = obj.desc().owner()
    if (owner) {
        return owner.unwrap().toString()
    } else {
        return ''
    }
}
export function timeStampToTime(timestamp:number) {
    var date = new Date(timestamp);
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    var D = (date.getDate() < 10 ? '0' + (date.getDate() ) : date.getDate()) + ' ';
    var h = date.getHours() + ':';
    var m = date.getMinutes() + ':';
    var s = date.getSeconds();
    return Y+ M + D + h + m + s;
  }