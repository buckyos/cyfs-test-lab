import {ErrorCode,Logger} from '../../cyfs-test-base';
import * as fs from 'fs-extra';

/**
 * 
 * 对磁盘中json文件进行操作
 * 
 */
export class LocalStorageJson {
    private m_file: string;
    private m_values: any;
    constructor(options: {file: string}) {
        this.m_file = options.file;
    }

    async load(): Promise<ErrorCode> {
        try {
            if (fs.existsSync(this.m_file)) {
                let context = fs.readFileSync(this.m_file);
                this.m_values = JSON.parse(context.toString('utf-8'));
                return ErrorCode.succ;
            }

            this.m_values = {};
            return ErrorCode.succ;
        } catch (err) {
            this.m_values = {};
            await this.save();
            console.error(`load '${this.m_file}' exception, err=${err}`);
            return ErrorCode.exception;
        }
    }

    async save(): Promise<ErrorCode> {
        try {
            fs.writeFileSync(this.m_file, JSON.stringify(this.m_values));
            return ErrorCode.succ;
        } catch (err) {
            console.error(`save '${this.m_file}' exception, err=${err}`);
            return ErrorCode.exception;
        }
    }

    async set(key: string, value: any): Promise<ErrorCode> {
        this.m_values[key] = value;
        await this.save();
        return ErrorCode.succ;
    }

    async get(key: string): Promise<{err: ErrorCode, value?: any}> {
        if (!this.m_values[key]) {
            return {err: ErrorCode.notExist};
        }

        return {err: ErrorCode.succ, value: this.m_values[key]};
    }
}