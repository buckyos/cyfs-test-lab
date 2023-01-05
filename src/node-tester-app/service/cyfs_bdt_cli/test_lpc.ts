
import { ErrorCode, Logger, BufferReader, sleep, RandomGenerator } from '../../base';
import { LpcClient } from "./lpc_client";
import { BdtLpc, BdtLpcCommand, BdtLpcResp } from './lpc';
import {Started,LpcActionApi} from "./action_api";


let test = {"CreateStackReq":{"peer_name":"3NM6bNd8RiNmisa2ESKp","addrs":["L4tcp10.1.1.236","L4udp10.1.1.236"],"bdt_port":50010,"sn":["sn-miner_lab1.desc","sn-miner_lab2.desc","sn-miner_lab3.desc"],"active_pn":[],"passive_pn":[],"local":"PC_0006","area":"1:0:0:1","device_tag":"PC_0006_QWDSs8BaWF","chunk_cache":"file","ep_type":"effectiveEP_WAN","sn_only":true}}
async function case1() {
    let log_path = "E:\\BDT\\BUG\\log";
    let logger = new Logger(console.info, console.debug, console.error, log_path);
    let peer : LpcClient;
    let lpc: BdtLpc = new BdtLpc({
        logger: logger,
    });
    let result =await lpc.initFromListener(22222);
    logger.info(result)
    
    let onCommand = (l: BdtLpc, c: BdtLpcCommand) => {
        let action : LpcActionApi = c.json;
        
        logger.info(action.Started);
        logger.info(action);
        if (!action.Started?.client_name) {
            logger.error(`peer manager start bdtpeer failed, for first command not started`);
        } else {
            
            logger.info(`recv new connection  from bdt-tools,command =  ${JSON.stringify(c.json)} `)
            peer = new LpcClient({
                client_name:  "lizhihong_test",
                logger:  logger,
            })
            let result = peer.initFromLpc(lpc);
            lpc.on('close', (l: BdtLpc, err: boolean) => {
                logger.error(`peer manager delete peer name=${peer.client_name}`);
 
            });
            lpc.on('error', () => {
                logger.error(`peer manager error name=${peer.client_name}`);
                
            });
        }
    };
    lpc.once('command', onCommand);
    
    await sleep(10 * 1000);

    let action : LpcActionApi = {
        "CreateStackReq": {
            peer_name: "lizhihong_test",
            sn: [],
            active_pn: [],
            passive_pn: [],
            addrs: [],
            bdt_port: 30000,
            chunk_cache: "mem",
            sn_only: false,
            area: "226:0:0:0",
        }
    }

    let command = {
        bytes : Buffer.from(""),
        json : test
        
    }
    
    let send = await peer!.sendBdtLpcCommand(command);
    await sleep(2 * 1000);
    let command2 = {
        bytes : Buffer.from(""),
        json : {
            "CloseLpc": {}
        }
    }
    send = await peer!.sendBdtLpcCommand(command2);
    await sleep(5 * 1000);
}

async function case2(){
    return new Promise(async(V)=>{
        setTimeout(() => {
            console.info("timeout");
            V(ErrorCode.timeout)
        }, 5*1000);
        return V(ErrorCode.succ);
        
    })
}
async function main() {
    console.info(await case1());
}
main();