"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToUint8Array = exports.Uint8ArrayToString = exports.RandomGenerator = void 0;
const assert = require("assert");
const common_1 = require("../../common");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class RandomGenerator {
    static string(length = 32) {
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
    }
    ;
    static accurateString(length = 32) {
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
    static integer(max, min = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    static async createRandomFile(pathDir, name, size) {
        if (!fs.pathExistsSync(pathDir)) {
            fs.mkdirpSync(pathDir);
        }
        let file = path.join(pathDir, name);
        const strRandom = RandomGenerator.string(1000);
        let len = Buffer.byteLength(strRandom, 'utf-8');
        while (size > len) {
            let err = fs.appendFileSync(file, strRandom);
            size = size - len;
        }
        fs.appendFileSync(file, RandomGenerator.string(size));
        assert(fs.pathExistsSync(file), `创建文件${path} 失败`);
    }
    static async createRandomDir(root, dirNumber, fileNumber, fileSize, deep = 1) {
        if (!fs.pathExistsSync(root)) {
            fs.mkdirpSync(root);
        }
        let dir_map = [];
        console.info(`开始生成随机文件名列表`);
        let list = [];
        for (let i = 0; i < fileNumber; i++) {
            let file_name = `${RandomGenerator.string(10)}.txt`;
            dir_map.push(file_name);
            list.push(RandomGenerator.createRandomFile(root, file_name, fileSize));
            await common_1.sleep(100);
        }
        for (let i in list) {
            await list[i];
        }
        return dir_map;
    }
}
exports.RandomGenerator = RandomGenerator;
// 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
RandomGenerator.CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789'; //0123456789
;
function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
exports.Uint8ArrayToString = Uint8ArrayToString;
function stringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
exports.stringToUint8Array = stringToUint8Array;
