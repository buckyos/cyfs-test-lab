import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep} from '../base';
import * as net from 'net';
import { fstat } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysProcess from 'process';
import {request,ContentType}  from './request'
import {StackManager} from "./stack_manager"
import * as WSParams from "./ws_params"



export async function ServiceMain(_interface: ServiceClientInterface) {
    
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: StackManager = StackManager.createInstance(_interface.getLogger(), _interface.getPlatform());
    await manager.init();

    manager.on('unlive', (peerName: string) => {
        _interface.fireEvent('unlive', ErrorCode.fail, peerName);
    });
    /*
    handler 测试也需要使用fireEvent
    */


    _interface.registerApi('start_client', async (from: Namespace, bytes: Buffer, param: {stack_type: string, SDK_type: string, log_type?: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call start_client`);
        let startInfo = await manager.start_client(param.stack_type,param.SDK_type,param.log_type);
        return {err: startInfo.err, bytes: Buffer.from(''), value: startInfo};
    });
    _interface.registerApi('open_stack', async (from: Namespace, bytes: Buffer, param: {peerName:string,stack_type:string,dec_id?:string,http_port?:number,ws_port?:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call open_stack`);
        let startInfo = await manager.open_stack(param.peerName,param.stack_type,param.dec_id,param.http_port,param.ws_port);
        return {err: startInfo.err, bytes: Buffer.from(''), value: startInfo};
    });
    _interface.registerApi('put_obejct', async (from: Namespace, bytes: Buffer, param: {peerName: string, obj_type: number, put_object_params: WSParams.PutObjectParmas}): Promise<any> => {
        _interface.getLogger().debug(`remote call put_obejct`);
        let startInfo = await manager.put_obejct(param.peerName,param.obj_type,param.put_object_params);
        return {err: startInfo.err, bytes: Buffer.from(''), value: startInfo};
    });
    _interface.registerApi('get_obejct', async (from: Namespace, bytes: Buffer, param: {peerName:string,obj_type:number,get_object_params:WSParams.GetObjectParmas}): Promise<any> => {
        _interface.getLogger().debug(`remote call get_obejct`);
        let startInfo = await manager.get_obejct(param.peerName,param.obj_type,param.get_object_params);
        return {err: startInfo.err, bytes: Buffer.from(''), value: startInfo};
    });

    _interface.registerApi('destoryPeer', async (from: Namespace, bytes: Buffer, param: {peerName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call destoryPeer, peerName=${param.peerName}`);
        let info = await manager.destoryPeer(param.peerName);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });
}