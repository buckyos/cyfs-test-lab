import assert = require('assert');
import { sleep } from '../../base';
import * as fs from "fs-extra";
import * as path from "path";




export class RandomGenerator {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    static CHAR_SET: string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789'; //0123456789

    static string(length: number = 32) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        if (Buffer.byteLength(result) < length) {
            let accurate_len = length - Buffer.byteLength(result);
            result += RandomGenerator.accurateString(accurate_len);
        }
        return result;
    };

    static accurateString(length: number = 32) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        while (Buffer.byteLength(result) < length) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    }

    static integer(max: number, min: number = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    static async createRandomFile(pathDir: string, name: string, size: number) {
        if (!fs.pathExistsSync(pathDir)) {
            fs.mkdirpSync(pathDir)
        }
        let file = path.join(pathDir, name)
        const strRandom = RandomGenerator.string(1000);
        let len = Buffer.byteLength(strRandom, 'utf-8');
        while (size > len) {
            let err = fs.appendFileSync(file, strRandom);
            size = size - len;
        }
        fs.appendFileSync(file, RandomGenerator.string(size));
        assert(fs.pathExistsSync(file), `创建文件${path} 失败`)

    }

    static async createRandomDir(root: string, dirNumber: number, fileNumber: number, fileSize: number, deep: number = 1) {
        if (!fs.pathExistsSync(root)) {
            fs.mkdirpSync(root)
        }
        let dir_map = [];
        console.info(`开始生成随机文件名列表`)
        let list: Array<any> = []
        for (let i = 0; i < fileNumber; i++) {
            let file_name = `${RandomGenerator.string(10)}.txt`;
            dir_map.push(file_name);
            list.push(RandomGenerator.createRandomFile(root, file_name, fileSize))
            await sleep(100);
        }
        for (let i in list) {
            await list[i]
        }
        return dir_map;
    }

};

export function Uint8ArrayToString(fileData: Uint8Array) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }

    return dataString
}


export function stringToUint8Array(str: string) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }

    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

