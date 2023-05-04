export declare class FileUploader {
    static s_FileUploader: FileUploader;
    m_host: string;
    m_port: number;
    m_rootPath: string;
    m_uploadEventList: any;
    static getInstance(): FileUploader;
    constructor();
    init(host: string, port: number): void;
    upload(filePath: string, remoteDir?: string): Promise<unknown>;
    _uploadOneFile(filePath: string, remoteDir?: string): Promise<unknown>;
}
