import { ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep } from '../../base';
import { BdtClientManager } from './client_manager';
import { LpcClient } from "./lpc_client"

export async function ServiceMain(_interface: ServiceClientInterface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: BdtClientManager = BdtClientManager.create_instance(_interface);
    await manager.init();
    manager.on("unlive",async()=>{
        _interface.fireEvent(`unlive`, ErrorCode.succ)
    })
    _interface.registerApi('startPeerClient', async (from: Namespace, bytes: Buffer, param: {RUST_LOG :string,client_name:string,port:number,kill_server:boolean}): Promise<any> => {
        _interface.getLogger().info(`remote call startPeer`);
        let startInfo = await manager.start_peer(param.RUST_LOG,param.client_name,param.port,param.kill_server);
        if (startInfo.err) {
            return { err: startInfo.err, bytes: Buffer.from(''), value: {} };
        }
        return { err: startInfo.err, bytes: Buffer.from(""), value: { client_name: startInfo.client_name } };
    });


    // send command to bdt-tools
    _interface.registerApi('sendBdtLpcCommand', async (from: Namespace, bytes: Buffer, param: {client_name:string,action:any}): Promise<any> => {
        _interface.getLogger().info(`remote ${from.agentid} call sendBdtLpcCommand ${param.client_name}`);
        let result = await manager.send_bdt_lpc_command(param.client_name,{ json: param.action, bytes })
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
    _interface.registerApi('createBdtLpcListener', async (from: Namespace, bytes: Buffer, param: {client_name:string,event_type:string,event_name:string,action:any}): Promise<any> => {
        _interface.getLogger().info(`remote call createBdtLpcListener ${param.client_name} ${param.event_name} `);
        let result = await manager.create_bdt_lpc_listener(param.client_name,param.event_name,param.event_type,{ json: param.action, bytes })
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
        _interface.getLogger().info(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().info(`remote call createBdtLpcListener ${param.name} `);
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