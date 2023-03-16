"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalConfig = exports.host = exports.dev_host = exports.lab_host = exports.public_host = void 0;
exports.public_host = "bdttest.tinyappcloud.com";
exports.lab_host = "192.168.100.205";
exports.dev_host = "192.168.100.205";
exports.host = exports.dev_host;
class GlobalConfig {
}
exports.GlobalConfig = GlobalConfig;
GlobalConfig.heartbeatIntervalTime = 60 * 1000;
GlobalConfig.version = '2.12';
GlobalConfig.ip = exports.host;
// 公司内网100网段支持三个端口 11070（lizhihong） 11080(lixiang)  11090 (未使用)
GlobalConfig.port = 11080;
GlobalConfig.updateServer = {
    host: exports.host,
    port: 9012,
};
GlobalConfig.reportServer = {
    host: exports.host,
    port: 11000
};
GlobalConfig.fileUploadServer = {
    host: exports.host,
    port: 11000
};
GlobalConfig.reportCrash = false;
GlobalConfig.removeLog = false;
