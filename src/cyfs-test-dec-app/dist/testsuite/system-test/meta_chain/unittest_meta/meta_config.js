"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check_array_contain = exports.Meta_spv_host_formal = exports.Meta_spv_host_beta = exports.Meta_spv_host_nightly = exports.Meta_miner_host_formal = exports.Meta_miner_host_beta = exports.Meta_miner_host_nightly = void 0;
exports.Meta_miner_host_nightly = ["http://120.24.6.201:1423"];
exports.Meta_miner_host_beta = ["http://106.75.156.225:1523", "http://106.75.152.253:1523", "http://106.75.136.42:1523"];
exports.Meta_miner_host_formal = [];
exports.Meta_spv_host_nightly = "http://120.24.6.201:3516";
exports.Meta_spv_host_beta = "http://106.75.152.253:1563";
exports.Meta_spv_host_formal = "";
function check_array_contain(arr, str) {
    for (let i in arr) {
        if (arr[i] == str) {
            return true;
        }
    }
    return false;
}
exports.check_array_contain = check_array_contain;
