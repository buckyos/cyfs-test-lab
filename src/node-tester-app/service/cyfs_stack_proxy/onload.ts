import {  Namespace,  ServiceClientInterface, } from '../../base';
import {ErrorCode} from "../../base"
import { ProxyManager } from './proxyManager';



export async function ServiceMain(_interface: ServiceClientInterface) {

    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: ProxyManager = new ProxyManager(_interface);
    _interface.registerApi('start_client', async (from: Namespace, bytes: Buffer, param: { stack_type: string }): Promise<any> => {
        _interface.getLogger().debug(`remote call start_client,cyfs stack proxy will be inited`);
        let start_info = await manager.init(param.stack_type);
        return { err: start_info.err, bytes: Buffer.from(''), value: start_info };
    });
    _interface.registerApi('proxy_data', async (from: Namespace, bytes: Buffer, param: { seq: number, type: string, remote_address: string, remote_port: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.proxy_data(param.type, param.remote_address, param.remote_port, param.seq, bytes)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('build_tunnel', async (from: Namespace, bytes: Buffer, param: { type: string, remote_address: string, remote_port: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.build_tunnel(param.type, param.remote_address, param.remote_port)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('end_tunnel', async (from: Namespace, bytes: Buffer, param: { seq: number, type: string, remote_address: string, remote_port: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.end_tunnel(param.type, param.remote_address, param.remote_port)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('util_request', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        let result = await manager.util_request({ json: param, bytes })
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if (result.resp?.bytes) {
            respBytes = result.resp?.bytes;
        }
        if (result.resp?.json) {
            respJson = result.resp?.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
}