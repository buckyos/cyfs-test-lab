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
exports.LocalStorageJson = void 0;
const errcode_1 = require("./errcode");
const fs = __importStar(require("fs-extra"));
class LocalStorageJson {
    constructor(options) {
        this.m_file = options.file;
        this.m_logger = options.logger;
    }
    async load() {
        try {
            if (fs.existsSync(this.m_file)) {
                let context = fs.readFileSync(this.m_file);
                this.m_values = JSON.parse(context.toString('utf-8'));
                return errcode_1.ErrorCode.succ;
            }
            this.m_values = {};
            return errcode_1.ErrorCode.succ;
        }
        catch (err) {
            this.m_values = {};
            await this.save();
            this.m_logger.error(`load '${this.m_file}' exception, err=${err}`);
            return errcode_1.ErrorCode.exception;
        }
    }
    async save() {
        try {
            fs.writeFileSync(this.m_file, JSON.stringify(this.m_values));
            return errcode_1.ErrorCode.succ;
        }
        catch (err) {
            this.m_logger.error(`save '${this.m_file}' exception, err=${err}`);
            return errcode_1.ErrorCode.exception;
        }
    }
    async set(key, value) {
        this.m_values[key] = value;
        await this.save();
        return errcode_1.ErrorCode.succ;
    }
    async get(key) {
        if (!this.m_values[key]) {
            return { err: errcode_1.ErrorCode.notExist };
        }
        return { err: errcode_1.ErrorCode.succ, value: this.m_values[key] };
    }
}
exports.LocalStorageJson = LocalStorageJson;
