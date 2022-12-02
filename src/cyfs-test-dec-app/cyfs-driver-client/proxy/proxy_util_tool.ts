import { ErrorCode, Logger, TaskClientInterface } from '../../base';
import { UtilTool } from "../cyfs_driver"

export class ProxyUtilTool implements UtilTool {
    public peer_name: string; //  
    private m_agentid: string;
    private logger: Logger;
    private m_interface: TaskClientInterface;
    public tags: string;
    constructor(_interface: TaskClientInterface, agentid: string, tags: string, peer_name: string) {
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.peer_name = peer_name;
    }
    async create_file(file_size: number): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }> {
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_file",
            peer_name: this.peer_name,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        return result.value;
    }
    async create_dir(file_number: number, file_size: number, dir_number: number, deep: string): Promise<{ err: ErrorCode, log?: string, dir_name?: string, dir_path?: string }> {
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_dir",
            peer_name: this.peer_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        return result.value;
    }
    async md5_file(file_path: string): Promise<{ err: ErrorCode, md5?: string }> {
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "md5",
            peer_name: this.peer_name,
            file_path,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`)
        return result.value;
    }
    async get_cache_path(): Promise<{ err: ErrorCode, cache_path?: { file_upload: string, file_download: string } }> {
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "get_cache_path",
            peer_name: this.peer_name,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`)
        return result.value;
    }

}
