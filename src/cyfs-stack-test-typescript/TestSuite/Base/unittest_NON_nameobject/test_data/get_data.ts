
import * as cyfs from "../../../../cyfs_node"
import * as path from 'path'
import * as fs from 'fs-extra';
const crypto = require("crypto")
import { RandomGenerator } from "../../../../common";
import { dir } from "console";



//读取json 测试数据
export function get_path(testlist: string) {
    
    let allfile: string[] = []
    let allpath = fs.readdirSync(testlist)
    for (let filedir of allpath) {
        let filepath = path.join(testlist,filedir) 
        let stats = fs.statSync(filepath)
        if (stats.isFile()){
            let fileinner = path.join(testlist, filedir)
                allfile!.push(fileinner)
        }
        if (stats.isDirectory()) {
            let files = fs.readdirSync(filepath)
            for (let f of files) {
                let filename = f;
                let fileinner = path.join(filepath, filename)
                allfile!.push(fileinner)
            }
        }
    };
    return allfile
}

export function get_big_str(size: number) {
    let tmppath = path.join(cyfs.get_temp_path(), "strfile.txt");
    fs.removeSync(tmppath)
    let insertstr = ""
    let basestr = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789/测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹有一个菇凉他有些任性还有些嚣张/##$&@æ。？！.《》……&（)+-=/*"
    let maxnum = basestr.length
    for (let i = 0; i < 3000; i++) {
        insertstr += basestr.charAt(Math.floor(Math.random() * (maxnum - 0)) + 0);
    }
    let len = Buffer.byteLength(insertstr, 'utf-8');
    let thesize = size * 1024 * 1024
    while (thesize > len) {
        fs.appendFileSync(tmppath, insertstr, "utf-8")
        thesize = thesize - len;
    }
    let strdata = fs.readFileSync(tmppath).toString()
    return strdata
}


export function create_fileObject() {

}
