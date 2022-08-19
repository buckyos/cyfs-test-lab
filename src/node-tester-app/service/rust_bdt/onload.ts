import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep} from '../../base';
import {BdtPeerManager} from './peer_manager';
import { BdtPeer } from './peer';
import * as net from 'net';
import { fstat } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysProcess from 'process';

import {request,ContentType}  from './request'
enum ProtocolType {
    udp = 0,
    tcp = 1,
    both = 2,
}
//是否启用检测bdt进程性能
let performanceSwitch = 0;
let performanceWait = 10*1000;


export async function ServiceMain(_interface: ServiceClientInterface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager: BdtPeerManager = BdtPeerManager.createInstance(_interface.getLogger(), _interface.getPlatform());
    await manager.init();

    manager.on('unlive', (peerName: string) => {
        _interface.fireEvent('unlive', ErrorCode.fail, peerName);
    });
    manager.on('accept',(connName:string,peerName?:string,question?:string)=>{
        _interface.getLogger().debug(`###accept ${peerName} ${connName}`);
        _interface.fireEvent('accept', ErrorCode.succ, connName,peerName,question);
    })
    manager.on('recv_datagram',(name:string,remote_id: string,sequence:string,hash:string)=>{
        _interface.getLogger().debug(`###recv_datagram remote_id = ${remote_id} sequence = ${sequence}`);
        _interface.fireEvent('recv_datagram', ErrorCode.succ,name,remote_id,sequence,hash);
    })

    _interface.registerApi('startPeer', async (from: Namespace, bytes: Buffer, param: {addrInfo: string[], snFiles: string[], local: string ,RUST_LOG?:string,activePnFiles?:Array<string>, passivePnFiles?:Array<string>,knownPeerFiles?:Array<string>,chunk_cache?:string,ep_type?:string,ndn_event?:string,ndn_event_target?:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call startPeer`);

        let startInfo = await manager.startPeer(param.RUST_LOG);
        if (startInfo.err) {
            return {err: startInfo.err, bytes: Buffer.from(''), value: {}};
        }

        let ret = await new Promise<{err: ErrorCode, peer: BdtPeer}>((v) => {
            let newPeer = (p: BdtPeer) => {
                if (p.name === startInfo.peerName!) {
                    manager.removeListener('peer', newPeer);
                    v({err: ErrorCode.succ, peer: p});
                }
            }

            manager.on('peer', newPeer);
        });

        _interface.getLogger().info(`create stack addrinfo=${JSON.stringify(param.addrInfo)}`);
        if (!param.addrInfo.length) {
            _interface.getLogger().error(`addrInfo is null`);
            return {err: ErrorCode.invalidParam, bytes: Buffer.from(''), value: {}};
        }
        if(!param.chunk_cache){
            param.chunk_cache = "mem"
        }

        let info = await ret.peer!.create(param.addrInfo, bytes, param.snFiles, param.local,param.activePnFiles,param.passivePnFiles,param.knownPeerFiles,param.chunk_cache,param.ep_type,param.ndn_event,param.ndn_event_target);
        _interface.getLogger().info(`err:${info.err},peerInfo:${String(info.peerinfo!)},peerName = ${startInfo.peerName},peerid = ${info.peerid}`)
        if (info.err || info.err == undefined) {
            if(info.err == undefined){
                return {err: ErrorCode.unknownCommand, bytes: Buffer.from(''), value: {}};
            }
            return {err: info.err, bytes: Buffer.from(''), value: {}};
        }
        return {err: info.err, bytes: info.peerinfo!, value: {peerName: startInfo.peerName, peerid: info.peerid,ep_info:info.ep_info,ep_resp:info.ep_resp}};
    });
    _interface.registerApi('restartPeer', async (from: Namespace, bytes: Buffer, param: {addrInfo: string[], snFiles: string[], local: string ,RUST_LOG?:string,activePnFiles?:Array<string>, passivePnFiles?:Array<string>,knownPeerFiles?:Array<string>,chunk_cache?:string,ep_type?:string,ndn_event?:string,ndn_event_target?:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call restartPeer`);

        let startInfo = await manager.startPeer(param.RUST_LOG);
        if (startInfo.err) {
            return {err: startInfo.err, bytes: Buffer.from(''), value: {}};
        }

        let ret = await new Promise<{err: ErrorCode, peer: BdtPeer}>((v) => {
            let newPeer = (p: BdtPeer) => {
                if (p.name === startInfo.peerName!) {
                    manager.removeListener('peer', newPeer);
                    v({err: ErrorCode.succ, peer: p});
                }
            }

            manager.on('peer', newPeer);
        });

        _interface.getLogger().info(`create stack addrinfo=${JSON.stringify(param.addrInfo)}`);
        if (!param.addrInfo.length) {
            _interface.getLogger().error(`addrInfo is null`);
            return {err: ErrorCode.invalidParam, bytes: Buffer.from(''), value: {}};
        }
        if(!param.chunk_cache){
            param.chunk_cache = "mem"
        }

        let info = await ret.peer!.create(param.addrInfo, bytes, param.snFiles, param.local,param.activePnFiles,param.passivePnFiles,param.knownPeerFiles,param.chunk_cache,param.ep_type,param.ndn_event,param.ndn_event_target);
        _interface.getLogger().info(`err:${info.err},peerInfo:${String(info.peerinfo!)},peerName = ${startInfo.peerName},peerid = ${info.peerid}`)
        if (info.err || info.err == undefined) {
            if(info.err == undefined){
                return {err: ErrorCode.unknownCommand, bytes: Buffer.from(''), value: {}};
            }
            return {err: info.err, bytes: Buffer.from(''), value: {}};
        }
        return {err: info.err, bytes: info.peerinfo!, value: {peerName: startInfo.peerName, peerid: info.peerid,ep_info:info.ep_info,ep_resp:info.ep_resp}};
    });

    _interface.registerApi('destoryPeer', async (from: Namespace, bytes: Buffer, param: {peerName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call destoryPeer, peerName=${param.peerName}`);
        let info = await manager.destoryPeer(param.peerName);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });

    _interface.registerApi('connect', async (from: Namespace, bytes: Buffer, param: {peerName: string, question: string, known_eps: number,accept_answer: number, remote_sn?: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call connect, peername=${param.peerName}`);
        let info = await manager.connect(param.peerName, bytes, param.question, !!param.known_eps,!!param.accept_answer,param.remote_sn);
        return {err: info.err, bytes: Buffer.from(''), value: {connName: info.connName,time:info.time,answer:info.answer}};
    });

    _interface.registerApi('autoAccept', async (from: Namespace, bytes: Buffer, param: {peerName: string,answer:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call autoAccept, peername=${param.peerName},answer =${param.answer} `);
        
        let info = await manager.autoAccept(param.peerName,param.answer);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });

    _interface.registerApi('accept', async (from: Namespace, bytes: Buffer, param: {peerName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call accept, peername=${param.peerName}`);
        let info = await manager.accept(param.peerName);
        return {err: info.err, bytes: Buffer.from(''), value: {question: info.question, connName: info.connName}};
    });

    _interface.registerApi('confirm', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string, answer: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call confirm, peername=${param.peerName}, connName=${param.connName}, answer=${param.answer}`);
        let info = await manager.confirm(param.peerName, param.connName, param.answer);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });
    _interface.registerApi('set_answer', async (from: Namespace, bytes: Buffer, param: {peerName: string, answer: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call set_answer, peername=${param.peerName}, answer=${param.answer}`);
        let info = await manager.set_answer(param.peerName,param.answer);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });
    _interface.registerApi('sendFile', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string, fileSize: number}): Promise<any> => {
        _interface.getLogger().debug(`remote call sendFile, peername=${param.peerName}, connname=${param.connName}, filesize=${param.fileSize}`);
        let info = await manager.send(param.peerName, param.connName, param.fileSize);
        return {err: info.err, bytes: Buffer.from(''), value: {time: info.time, hash: info.hash}};
    });

    _interface.registerApi('recvFile', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call recvFile, peername=${param.peerName}, connname=${param.connName}`);
        let info = await manager.recv(param.peerName, param.connName);
        return {err: info.err, bytes: Buffer.from(''), value: {size: info.size, hash: info.hash}};
    });
    _interface.registerApi('sendDatagram', async (from: Namespace, bytes: Buffer, param: {peerName: string,contentSize: number,remote_id:string,plaintext:string,sequence?:string,create_time?:number,send_time?:number,author_id?:string,reservedVPort?:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call sendDatagram , peername=${param.peerName}`);
        let info = await manager.sendDatagram(param);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });

    _interface.registerApi('recvDatagram', async (from: Namespace, bytes: Buffer, param: {peerName: string,timeout:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call recvFile, peername=${param.peerName}`);
        let info = await manager.recvDatagram(param.peerName, param.timeout);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('sendObject', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string, object_id: string,obj_type:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call sendObject, peername=${param.peerName}, connname=${param.connName}, objPath=${param.object_id} ,obj_type = ${param.obj_type}`);
        let info = await manager.send_object(param.peerName, param.connName, param.object_id,param.obj_type);
        return {err: info.err, bytes: Buffer.from(''), value: {time: info.time, hash: info.hash}};
    });

    _interface.registerApi('recvObject', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string,objPath:string,object_id?:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call recvObject, peername=${param.peerName}, connname=${param.connName}`);
        let info = await manager.recv_object(param.peerName, param.connName,param.objPath,param.object_id);
        return {err: info.err, bytes: Buffer.from(''), value: {size: info.size, hash: info.hash}};
    });

    _interface.registerApi('closeConnection', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string, which: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call closeConnection, peername=${param.peerName}, connname=${param.connName}`);
        let info = await manager.close(param.peerName, param.connName, param.which);

        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });

    _interface.registerApi('resetConnection', async (from: Namespace, bytes: Buffer, param: {peerName: string, connName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call resetConnection, peername=${param.peerName}, connname=${param.connName}`);
        let info = await manager.reset(param.peerName, param.connName);

        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });

    _interface.registerApi('getNatType', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        _interface.getLogger().debug(`remote call get agent nat type`);
        let info = await manager.getNatType();
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('getIPInfo', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        _interface.getLogger().debug(`remote call get agent ip info`);
        let info = await manager.getIPInfo();
        return {err: info.err, bytes: Buffer.from(''), value: info };
    });

    _interface.registerApi('setChunk', async (from: Namespace, bytes: Buffer, param: {peerName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call set-chunk, peername=${param.peerName}`);
        let info = await manager.setChunk(param.peerName, bytes);
        return {err: info.err, bytes: Buffer.from(''), value: {chunkid: info.chunkid}};
    });

    _interface.registerApi('interestChunk', async (from: Namespace, bytes: Buffer, param: {peerName: string, chunkid: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call interest-chunk, peername=${param.peerName},chunkid=${param.chunkid}`);
        let info = await manager.interestChunk(param.peerName, bytes, param.chunkid);
        return {err: info.err, bytes: Buffer.from(''), value: {}};
    });

    _interface.registerApi('checkChunk', async (from: Namespace, bytes: Buffer, param: {peerName: string, chunkid: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call check-chunk, peername=${param.peerName},chunkid=${param.chunkid}`);
        let info = await manager.checkChunk(param.peerName, param.chunkid);
        return {err: info.err, bytes: Buffer.from(''), value: {state: info.state}};
    });
    _interface.registerApi('interestChunkList', async (from: Namespace, bytes: Buffer, param: {peerName: string, chunk_list: Array<{chunk_id:string}>,timeout:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call interest-chunk-list, peername=${param.peerName},chunkid=${param.chunk_list}`);
        let info = await manager.interestChunkList(param.peerName, bytes, param.chunk_list,param.timeout);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });

    _interface.registerApi('chunkSendFile', async (from: Namespace, bytes: Buffer, param: {peerName: string,fileSize:number,save?:boolean}): Promise<any> => {
        _interface.getLogger().debug(`remote chuckSendFile, peername=${param.peerName}`);
        let info = await manager.chunkSendFile(param.peerName,param.fileSize,param.save);
        _interface.getLogger().debug('chuckSendFile setChunk执行完成了');
        return {err: info.err, bytes: Buffer.from(''), value:info};
    });
    _interface.registerApi('chunkRecvFile', async (from: Namespace, bytes: Buffer, param: {peerName: string,chunkid:string,timeout:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call chuckRecvFile, peername=${param.peerName}`);
        let info = await manager.chunkRecvFile(param.peerName, bytes, param.chunkid,param.timeout);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });

    _interface.registerApi('startSendFile', async (from: Namespace, bytes: Buffer, param: {peerName: string,fileSize:number,save?:boolean,localFileName?:string,chunkSize:number}): Promise<any> => {
        _interface.getLogger().debug(`remote startSendFile, peername=${param.peerName}`);
        let info = await manager.startSendFile(param.peerName,param.fileSize,param.save,param.localFileName,param.chunkSize);
        _interface.getLogger().debug('startSendFile setChunk执行完成了');
        return {err: info.err, bytes: info.fileObject, value:{err: info.err,
            log: info.log,
            fileName:info.fileName,
            session: info.session,
            time: info.time,
            md5: info.md5,
            size: info.size}};
    });
    _interface.registerApi('startSendLocalFile', async (from: Namespace, bytes: Buffer, param: {peerName: string,fileName:string}): Promise<any> => {
        _interface.getLogger().debug(`remote startSendFile, peername=${param.peerName}`);
        let info = await manager.startSendLocalFile(param.peerName,param.fileName);
        _interface.getLogger().debug('startSendLocalFile setChunk执行完成了');

        return {err: info.err, bytes: info.fileObject, value:{err: info.err,
            log: info.log,
            fileName:info.fileName,
            session: info.session,
            time: info.time,
            md5: info.md5,
            size: info.size}};
    });
    _interface.registerApi('startDownloadFile', async (from: Namespace, bytes: Buffer, param: {peerName: string,fileName:string,remote:string,timeout:number,secondPeerId:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call startDownloadFile, peername=${param.peerName}`);
        _interface.getLogger().debug(`remote call startDownloadFile 文件对象, bytes=${bytes}`);
        let info = await manager.startDownloadFile(param.peerName, param.fileName,bytes,param.remote,param.timeout,param.secondPeerId);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('startDownloadFileRange', async (from: Namespace, bytes: Buffer, param: {peerName: string,fileName:string,remote:string,timeout:number,secondPeerId:string,range:Array<{begin:number,end:number}>}): Promise<any> => {
        _interface.getLogger().debug(`remote call startDownloadFile, peername=${param.peerName}`);
        _interface.getLogger().debug(`remote call startDownloadFile 文件对象, range = ${JSON.stringify(param.range    
            )} `);
        let info = await manager.startDownloadFileRange(param.peerName, param.fileName,bytes,param.remote,param.timeout,param.range ,param.secondPeerId);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('startSendDir', async (from: Namespace, bytes: Buffer, param: {peerName:string ,dirPath:string,fileNum:number,fileSize:number,chunkSize:number}): Promise<any> => {
        _interface.getLogger().debug(`remote startSendDir, peername=${param.peerName}`);
        let info = await manager.startSendDir(param.peerName,param.dirPath,param.fileNum,param.fileSize,param.chunkSize);
        _interface.getLogger().debug('startSendDir setChunk执行完成了');
        return {err: info.err, bytes: info.dir_map_buffer, value:{err:info.err,log:info.log,session:info.session,time:info.time,dir_id:info.dir_id,dir_obj_path:info.dir_obj_path}};
    });
    _interface.registerApi('startDownloadDir', async (from: Namespace, bytes: Buffer, param: {peerName: string,dir_id:string ,dirPath:string,dir_obj_path:string,remote:string,timeout:number,secondPeerId:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call startDownloadDir, peername=${param.peerName}`);
        let info = await manager.startDownloadDir(param.peerName, param.dirPath,bytes,param.dir_id,param.remote,param.timeout,param.secondPeerId);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('createFileSession', async (from: Namespace, bytes: Buffer, param: {peerName: string,hubName:string,fileSize:number,fileName:string,timeout:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call create_hub_sesssion, peername=${param.peerName},fileSize =${param.fileSize}`);
        let info = await manager.createFileSession(param.peerName,param.hubName,param.timeout,param.fileName,bytes,param.fileSize);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });

    _interface.registerApi('startTransSession', async (from: Namespace, bytes: Buffer, param: {peerName: string,session:string,fileName:string,timeout:number,options?: {enable_upload: boolean}}): Promise<any> => {
        _interface.getLogger().debug(`remote call download file by bdt file hub, peername=${param.peerName}`);
        let info = await manager.startTransSession(param.peerName, param.session,param.fileName ,param.timeout,param.options);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });

    _interface.registerApi('getTransSessionState', async (from: Namespace, bytes: Buffer, param: {peerName: string,session:string,timeout:number}): Promise<any> => {
        _interface.getLogger().debug(`remote call download file by bdt file hub, peername=${param.peerName}`);
        let info = await manager.getTransSessionState(param.peerName, param.session,param.timeout);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('addDevice', async (from: Namespace, bytes: Buffer, param: {peerName: string}): Promise<any> => {
        _interface.getLogger().debug(`remote call addDevice peername=${param.peerName}`);
        let info = await manager.addDevice(param.peerName, bytes);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('start_report', async (from: Namespace, bytes: Buffer, param: {agent:string, time:number,testcaseId:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call start_report`);
        let info = await manager.reportSystemInfo ( param.agent,param.time,param.testcaseId);
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    _interface.registerApi('stop_report', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        _interface.getLogger().debug(`remote call stop_report`);
        let info = await manager.stopReport();
        return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    

    _interface.registerApi('reportLog', async (from: Namespace, bytes: Buffer, param: {logName:string}): Promise<any> => {
        _interface.getLogger().debug(`remote call reportLog`);
        let zip = await _interface.zip(_interface.getLogger().dir(),param.logName)
        let upload = await _interface.uploadFile(zip.dstPath!,"logs");
        return {err: ErrorCode.succ,bytes: Buffer.from(''),value:upload};
    });
    _interface.registerApi('removeBdtCache', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        _interface.getLogger().debug(`remote call removeBdtCache`);
        if(_interface.getPlatform() === 'win32'){
            await fs.removeSync('C:/cyfs/bdt')
            await fs.removeSync('C:/cyfs/data')

        }else if(_interface.getPlatform() === 'linux'){
            await fs.removeSync('/cyfs/bdt')
            await fs.removeSync('/cyfs/data')
        }else {
            return {err:ErrorCode.fail,log:'Platform is exception'}
        }
        return {err: ErrorCode.succ,bytes: Buffer.from(''),value:{}};
    });
    _interface.registerApi('removeBlog', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        _interface.getLogger().debug(`remote call removeBdtCache`);
        try {
            await fs.removeSync(path.join(SysProcess.cwd(),'../blog/'))
        } catch (error) {
            return {err: ErrorCode.succ,bytes: Buffer.from(''),log:`remove test log failed ${error}`};
        }
            
        return {err: ErrorCode.succ,bytes: Buffer.from(''),value:{}};
    });
    

}