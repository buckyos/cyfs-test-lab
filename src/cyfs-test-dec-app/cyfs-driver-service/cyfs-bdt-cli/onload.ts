import { ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep } from '../../base';
import { BdtClientManager } from './client_manager';
import { LpcClient } from "./lpc_client"

export async function ServiceMain(_interface: ServiceClientInterface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: BdtClientManager = BdtClientManager.createInstance(_interface);
    await manager.init();
    _interface.registerApi('startPeerClient', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote call startPeer`);
        let startInfo = await manager.start_peer(param.RUST_LOG);
        if (startInfo.err) {
            return { err: startInfo.err, bytes: Buffer.from(''), value: {} };
        }
        return { err: startInfo.err, bytes: Buffer.from(""), value: { client_name: startInfo.client_name } };
    });


    // send command to bdt-tools
    _interface.registerApi('sendBdtLpcCommand', async (from: Namespace, bytes: Buffer, param: {cleint_name:string,action:any}): Promise<any> => {
        _interface.getLogger().debug(`remote ${from.agentid} call sendBdtLpcCommand ${param.cleint_name}`);
        let result = await manager.send_bdt_lpc_command(param.cleint_name,{ json: param.action, bytes })
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
    // send command to bdt-tools ,local create handler,Listener event from bdt-tools
    _interface.registerApi('createBdtLpcListener', async (from: Namespace, bytes: Buffer, param: {cleint_name:string,event_name:string,action:any}): Promise<any> => {
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.cleint_name} ${param.event_name} `);
        let result = await manager.create_bdt_lpc_listener(param.cleint_name,param.event_name,{ json: param.action, bytes })
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
    // local util,it can start bdt-tools and create test data
    _interface.registerApi('utilRequest', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
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