"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_channel = void 0;
let CYFS_CHANNEL = 'nightly';
console.log(`process.env.NODE_ENV = `, process.env.NODE_ENV);
if (process.env.NODE_ENV == "beta") {
    CYFS_CHANNEL = 'beta';
}
else {
    CYFS_CHANNEL = 'nightly';
}
function get_channel() {
    return CYFS_CHANNEL;
}
exports.get_channel = get_channel;
