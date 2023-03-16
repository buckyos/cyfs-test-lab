"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(info, debug, error, dir) {
        this.m_dir = '';
        this.info = info;
        this.debug = debug;
        this.error = error;
        this.m_dir = dir;
    }
    dir() {
        return this.m_dir;
    }
}
exports.Logger = Logger;
