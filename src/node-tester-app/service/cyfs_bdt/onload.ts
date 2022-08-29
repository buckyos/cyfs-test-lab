import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep} from '../../base';
import {BdtPeerManager} from './peer_manager';
import {BdtPeer} from "./peer"

export async function ServiceMain(_interface: ServiceClientInterface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: BdtPeerManager = BdtPeerManager.createInstance(_interface);
    await manager.init();
    _interface.registerApi('startPeerClient', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote call startPeer`);
        let startInfo = await manager.startPeer(param.RUST_LOG);
        if (startInfo.err) {
            return {err: startInfo.err, bytes: Buffer.from(''), value: {}};
        }
        return {err: startInfo.err, bytes: Buffer.from(""), value: {peerName: startInfo.peerName}};
    });

    
    // send command to bdt-tools
    _interface.registerApi('sendBdtLpcCommand', async (from: Namespace, bytes: Buffer, param : any): Promise<any> => {
        _interface.getLogger().debug(`remote ${from.agentid} call sendBdtLpcCommand ${param.name}`);
        let result =  await manager.sendBdtLpcCommand({json:param,bytes})
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
    // send command to bdt-tools ,local create handler,Listener event from bdt-tools
    _interface.registerApi('createBdtLpcListener', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
        let result =  await manager.createBdtLpcListener({json:param,bytes})
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
    // local util,it can start bdt-tools and create test data
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