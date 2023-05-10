import {TaskClientInterface,ErrorCode} from "../cyfs-driver-base"

export class ProxyUtilTool  {
    public peer_name: string; //  
    private m_agentid: string;
    private m_interface: TaskClientInterface;
    public tags: string;
    constructor(_interface: TaskClientInterface, agentid: string, tags: string, peer_name: string) {
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.peer_name = peer_name;
    }

    async create_file(file_size: number): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }> {
        console.info(`proxy_util create_file`)
        let result = await this.m_interface.callApi('util-request', Buffer.from(''), {
            name: "create_file",
            peer_name: this.peer_name,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        return {
            err : result.err,
            file_name : result.value.file_name,
            file_path : result.value.file_path,
            md5 : result.value.md5,
        };
    }
    async create_dir(file_number: number, file_size: number, dir_number: number, deep: number): Promise<{
        err: ErrorCode, log?: string, dir_name?: string, dir_path?: string, file_list?: Array<{
            file_name: string, md5: string,
        }> }> {
        console.info(`proxy_util create_dir`)
        let result = await this.m_interface.callApi('util-request', Buffer.from(''), {
            name: "create_dir",
            peer_name: this.peer_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        return {
            err : result.err,
            dir_name : result.value.dir_name,
            dir_path : result.value.dir_path,
        };
    }
    async md5_file(file_path: string): Promise<{ err: ErrorCode, md5?: string }> {
        console.info(`proxy_util md5_file ${file_path}`)
        let result = await this.m_interface.callApi('util-request', Buffer.from(''), {
            name: "md5",
            peer_name: this.peer_name,
            file_path,
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.tags} md5File = ${JSON.stringify(result)}`)
        return result.value;
    }
    async get_cache_path(): Promise<{ err: ErrorCode,platform?:string, cache_path?: { file_upload: string, file_download: string } }> {
        console.info(`proxy_util get_cache_path`)
        let result = await this.m_interface.callApi('util-request', Buffer.from(''), {
            name: "get_cache_path",
            peer_name: this.peer_name,
        }, this.m_agentid!, 10 * 1000);
        console.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`)
        return result.value;
    }
}
