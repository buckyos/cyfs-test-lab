import { ErrorCode } from './errcode';
export declare class LocalStorageJson {
    private m_file;
    private m_values;
    constructor(options: {
        file: string;
    });
    load(): Promise<ErrorCode>;
    save(): Promise<ErrorCode>;
    set(key: string, value: any): Promise<ErrorCode>;
    get(key: string): Promise<{
        err: ErrorCode;
        value?: any;
    }>;
}
