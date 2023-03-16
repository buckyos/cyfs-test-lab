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
const cyfs = __importStar(require("../cyfs"));
async function test_fun(data) {
    if (data > 0) {
        return cyfs.Ok(data);
    }
    else {
        const error = new cyfs.BuckyError(cyfs.BuckyErrorCode.Failed, `error resp data`);
        return cyfs.Err(error);
    }
}
async function main() {
    cyfs.clog.enable_file_log({
        name: "cyfs_stack",
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    let result = await test_fun(-1);
    console.info(`${result}`);
}
main();
