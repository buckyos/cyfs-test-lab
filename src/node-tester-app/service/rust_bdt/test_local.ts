import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, Logger } from '../../base';

import {BdtPeerManager} from './peer_manager';
import { BdtPeer } from './peer';
import * as net from 'net';
import { fstat } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysProcess from 'process';
enum ProtocolType {
    udp = 0,
    tcp = 1,
    both = 2,
}

let param = {
    RUST_LOG : 'trace',
    addrInfo : ['L4tcp192.168.100.112','L4udp192.168.100.112'],
    bytes: Buffer.from(''),
    snFiles : ['sn-miner_pub.desc'],
    local : ''
}
let loggerFun = (info: string) => {
    console.log(info);
};

let logger = new Logger(loggerFun,loggerFun,loggerFun,'c:\\blog');

async function main(){
    let manager: BdtPeerManager = BdtPeerManager.createInstance(logger,'localhost');
    await manager.init();

    manager.on('unlive', (peerName: string) => {
        logger.error(`peer ${peerName} unlive, ${ErrorCode.fail}`);
    });
    manager.on('accept',(connName:string)=>{
        console.info(`accept connName = ${connName}`);
    })

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

        logger.info(`create stack addrinfo=${JSON.stringify(param.addrInfo)}`);
        if (!param.addrInfo.length) {
            logger.error(`addrInfo is null`);
            return {err: ErrorCode.invalidParam, bytes: Buffer.from(''), value: {}};
        }

        let info = await ret.peer!.create(param.addrInfo, param.bytes, param.snFiles, param.local);
        logger.info(`err:${info.err},peerInfo:${String(info.peerinfo!)},peerName = ${startInfo.peerName},peerid = ${info.peerid}`)
        if (info.err || info.err == undefined) {
            if(info.err == undefined){
                return {err: ErrorCode.unknownCommand, bytes: Buffer.from(''), value: {}};
            }
            return {err: info.err, bytes: Buffer.from(''), value: {}};
        }
}

main();