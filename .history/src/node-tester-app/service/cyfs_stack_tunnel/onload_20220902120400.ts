import { ErrorCode, Namespace, Logger, ServiceClientInterface, RandomGenerator } from '../../base';
import {ProxyManager}  from './proxyManager';



export async function ServiceMain(_interface: ServiceClientInterface) {

    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: ProxyManager = new ProxyManager(_interface);
    _interface.registerApi('start_client', async (from: Namespace, bytes: Buffer, param: { stack_type: string }): Promise<any> => {
        _interface.getLogger().debug(`remote call start_client,cyfs stack proxy will be inited`);
        let startInfo = await manager.init(param.stack_type);
        return { err: startInfo.err, bytes: Buffer.from(''), value: startInfo };
    });
    _interface.registerApi('proxy_data', async (from: Namespace, bytes: Buffer, param: { seq: number, type: string, remoteAddress: string, remotePort: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.proxy_data(param.type, param.remoteAddress, param.remotePort, param.seq, bytes)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('build_tunnel', async (from: Namespace, bytes: Buffer, param: { type: string, remoteAddress: string, remotePort: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.build_tunnel(param.type, param.remoteAddress, param.remotePort)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('end_tunnel', async (from: Namespace, bytes: Buffer, param: { seq: number, type: string, remoteAddress: string, remotePort: number }): Promise<any> => {
        _interface.getLogger().debug(`remote call proxy_data,${JSON.stringify(param)}`);
        let result = await manager.proxy_data(param.type, param.remoteAddress, param.remotePort)
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value: result };
    });
    _interface.registerApi('utilRequest', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
        let result =  await manager.utilRequest({json:param,bytes})
        // set resp package
        let  respBytes = Buffer.from('');
        let respJson = {};
        if(result.resp?.bytes){
            respBytes = result.resp?.bytes;
        }
        if(result.resp?.json){
            respJson = result.resp?.json;
        }
        return {err: result.err, bytes: respBytes, value: respJson};
    });
}