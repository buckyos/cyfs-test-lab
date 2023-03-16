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
const common_1 = require("../common");
const dec_app_action_1 = require("../dec-app-action");
async function rand_cyfs_chunk_cache(chunk_size) {
    console.info(`rand_cyfs_chunk_cache data_size = ${chunk_size}`);
    let chunk_data = dec_app_action_1.string_to_Uint8Array(common_1.RandomGenerator.string(chunk_size));
    console.info(chunk_data);
    let chunk_id = cyfs.ChunkId.calculate(chunk_data);
    return { err: 0, chunk_id, chunk_data };
}
async function main() {
    let chunk_data = dec_app_action_1.string_to_Uint8Array(common_1.RandomGenerator.string(100 * 1024));
    let data = cyfs.HashValue.hash_data(chunk_data);
    console.info(`result1 = ${JSON.stringify(data)}`);
    chunk_data = dec_app_action_1.string_to_Uint8Array(common_1.RandomGenerator.string(1024 * 1024));
    data = cyfs.HashValue.hash_data(chunk_data);
    console.info(`result2 = ${JSON.stringify(data)}`);
}
main();
