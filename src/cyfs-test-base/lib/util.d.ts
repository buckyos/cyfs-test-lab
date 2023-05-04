import { ErrorCode } from './errcode';
export declare class DirHelper {
    static m_rootDir: string;
    static getTaskDir(task: string): string;
    static getServiceDir(service: string): string;
    static getUpdateDir(): string;
    static getConfigDir(): string;
    static getLogDir(folder?: string): string;
    static getTempDir(): string;
    static emptyDir(dir: string, removeDir?: boolean): void;
    static ensureDirExist(dir: string): void;
    static getRootDir(): string;
    static setRootDir(d: string): void;
    static clearExpired(filePath: string, validDay: number): Promise<void>;
}
export declare class VersionHelper {
    static compare(v1: string, v2: string): number;
}
export declare function sleep(time: number): Promise<void>;
export declare function getFileMd5(filePath: string): {
    err: ErrorCode;
    md5?: string;
};
export declare class HttpDownloader {
    static downloadByUrl(url: string, filePath: string, md5: string): Promise<ErrorCode>;
    static download(packageAddress: any, filePath: any, fileMD5?: any): Promise<any>;
}
export declare class FormatDateHelper {
    static now(fmt: string): string;
}
export declare class NetHelper {
    static getLocalIPs(withInternal: boolean): string[];
    static getLocalIPV4(withInternal: boolean): string[];
}
