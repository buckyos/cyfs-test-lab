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
async function main() {
    let param1 = {
        id: cyfs.ObjectId.from_base_58("5aSixgLx9pSDX3SAYnTY2KnunaxiMP85C6DuWPEsvKck").unwrap()
    };
    console.info(`初始参数param1 ： ${param1.id} ${param1.id.obj_type_code()}  `);
    let param_str = JSON.stringify(param1);
    console.info(`字符串 param_str ： ${param_str}`);
    let param_json = JSON.parse(param_str);
    console.info(`param_json ： ${param_json.id}  ${param_json.id}`);
    let device_id = cyfs.DeviceId.from_base_58(param_json.id.toString()).unwrap();
    console.info(device_id);
}
main();
