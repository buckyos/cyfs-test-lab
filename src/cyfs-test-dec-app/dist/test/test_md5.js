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
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs-extra"));
async function _md5(file_path) {
    try {
        let fsHash = crypto.createHash('md5');
        let fileInfo = fs.readFileSync(file_path);
        fsHash.update(fileInfo);
        let md5 = fsHash.digest('hex');
        console.info(`${file_path} md5 =${md5}`);
        return md5;
    }
    catch (error) {
        console.error(`md5 file err = ${JSON.stringify(error)}`);
        return JSON.stringify(error);
    }
}
async function main() {
    let md5_1 = await _md5("E:\\git_test\\cyfs-test-lab\\src\\cyfs-test-dec-app\\blog\\cache\\zone1_device1\\file_upload\\xXX0EppWQk.txt");
    let md5_2 = await _md5("E:\\git_test\\cyfs-test-lab\\src\\cyfs-test-dec-app\\blog\\cache\\zone1_device2\\file_download\\xXX0EppWQk.txt");
}
main();
