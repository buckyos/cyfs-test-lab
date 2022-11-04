"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = exports.ContentType = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.ContentType = {
    urlencoded: 'application/x-www-form-urlencoded',
    json: 'application/json',
    raw: 'text/plain'
};
//const hostname = "106.12.128.114";
const hostname = "http://192.168.100.205";
//const hostname = "http://106.12.128.114"
const port = 5000;
async function request(method, route, postData, psotType) {
    let url = `${hostname}:${port}/${route}`;
    let sendResp = false;
    const response = await node_fetch_1.default(url, {
        method: method,
        body: JSON.stringify(postData),
        headers: { 'Content-Type': psotType },
        timeout: 5 * 60 * 100
    });
    sendResp = true;
    if (response.status != 200) {
        return { status: response.status };
    }
    const data = await response.json();
    console.info(`${JSON.stringify(data)}`);
    return data;
}
exports.request = request;

