import  assert from "assert"; 
import * as cyfs from '../cyfs';
import * as SysProcess from 'process';
//import { stack,stackInfo}from "../../common/utils/stack";
import * as fs from "fs-extra"
import * as path from "path"
import {RandomGenerator} from "../common/generator" ;
import * as ChildProcess from 'child_process';
 //import * as record from "./nft"
import  {CyfsNftClient,NFTSummaryInfo,NFTType,NFTState} from "../nft_client/nft_client"
var date = require("silly-datetime");
import {ErrorCode} from '../../../base';
import {dingding} from "../../../common/dingding"
import {Meta_client_nightly, Meta_miner_host_nightly} from "../common/meta_config"
import {dec_id,nft_tool_path} from "../common/config"



export const stack = cyfs.SharedCyfsStack.open_runtime();

export const stackInfo = {
    ood : "",
    owner : "",
    device : ""
}

export async function init_stack() {
    console.log("stack.online()")
    await stack.online();
    
    // 获取本地数据
    let result = await stack.util().get_device_static_info({common: {flags: 0}})
    console.log("stack.util()")
    console.log("result",JSON.stringify(result))
    let zone_info = await result.unwrap()
    stackInfo.ood =  zone_info.info.ood_device_id.to_base_58();
    stackInfo.owner =  zone_info.info.owner_id!.to_base_58();
    stackInfo.device = zone_info.info.device_id.to_base_58();
}


export async function uploadNFT(stack:cyfs.SharedCyfsStack):Promise<{
    err: ErrorCode;
    log: string;
    nft?: NFTSummaryInfo;
}> {

    let nft_client =  new CyfsNftClient(stack,cyfs.ObjectId.from_base_58(dec_id).unwrap());
    //获取总数
    let result = await nft_client.get_list(0,500);
    if(result.err){
        return {err:ErrorCode.fail,log:`获取NFT列表1失败:${JSON.stringify(result)}`}
    }
    let list = result.unwrap();
    console.info("list.sum",JSON.stringify(list.sum))
    //创建NFT
    let name = RandomGenerator.string(10)+".jpg"
    let save = path.join(__dirname,"file")
    await RandomGenerator.createImg(save,name);
    save= path.join(save,name);
    //await cyfs.sleep(10000);
    //NFT 上传到CYFS
    let cmd = `${nft_tool_path} ${save}`
    let pro: ChildProcess.ChildProcess = ChildProcess.exec(cmd);
    await cyfs.sleep(30000);
    
    //上传结果校验
    let offset = list.sum;
    let result2 = await nft_client.get_list(0,500);
    if(result2.err){
        return {err:ErrorCode.fail,log:`获取NFT列表2失败${JSON.stringify(result2)}`}
    }
    let list2 = result2.unwrap();
    console.info(`create nft get new nft: ${JSON.stringify(list2)}`)
    console.log("list.sum",list.sum)
    console.log("list2.sum",list2.sum)
    if(list.sum == list2.sum){
        return {err:ErrorCode.fail,log:`上传NFT${name}失败`}
    }
    if(name!=list2.list[0].name ){
        return {err:ErrorCode.fail,log:`上传NFT失败,${name}!=${list2.list[0].name}`}
    }
    return {err:ErrorCode.succ,log:`上传NFT成功`,nft:list2.list[0]}

}
export async function updateNFT(nft:NFTSummaryInfo,nft_type: NFTType, nft_state: NFTState):Promise<{
    err: ErrorCode;
    log: string;
    nft?: string;
}>{
    //连接协议栈
    let stack =  cyfs.SharedCyfsStack.open_runtime();
    let nft_client =  new CyfsNftClient(stack,cyfs.ObjectId.from_base_58(dec_id).unwrap());
    console.log("nftinfo",JSON.stringify(nft))
    let info =await nft_client.update(nft.nft_id,nft.name,nft_type,nft_state,[],[])
    //let nft2 = info.unwrap();
    console.info(`update nft ${JSON.stringify(info)}`)
    //检查上链成功
    if(info.err){
        return {err:ErrorCode.fail,log:`更新NFT失败${JSON.stringify(info)}`}
    }
    let txid  = await info.unwrap();
    if(txid != ""){
        console.info(`update NFT tx_id = ${txid}`)
    }
    
    
   /* ChildProcess.exec(' D:\\Project_Code\\TSTS\\cyfs_stack2\\node_tester_app\\service\\always_run_nft\\desc\\nft1\\'+ 'sign-tx.exe '+ txid + '' + Meta_miner_host_nightly[0], (err, stdout, stderr) => {
        console.log(stdout);
      });*/

    ChildProcess.exec('D:\\node_tester_app\\service\\always_run_nft\\desc\\nft1\\'+ 'sign-tx.exe '+ txid, (err, stdout, stderr) => {
        console.log(stdout);
      });

    for(let i =0;i<20;i++){
        let check = await Meta_client_nightly.nft_get(nft.nft_id);
        console.info(`检查更新上链结果： ${JSON.stringify(check.result)}`)
        if(check.result.state != "Normal"){
            console.info(`更新NFT上链成功： ${JSON.stringify(check.result)}`)
            return {err:ErrorCode.succ,log:`上传NFT成功`,nft: info.unwrap()!}
        }
        await cyfs.sleep(5*1000)
    }
    return {err:ErrorCode.timeout,log:`更新NFT超时`}
}

export async function stop_nft_creator(){
    return new Promise(async(v)=>{
        console.info(`触发 nft_creat kill`)
        let process = ChildProcess.exec(`taskkill /f /t /im nft-creator.exe`)
        process.on('exit', (code: number, singal: any)=> {
            console.info(`nft-creator.exe exit`);
            v('');

        });
        process.stdout?.on('data', (data) => {
            let str:string = `${data.toString()}`;
            console.info(`nft-creator output ${str}`)
        });
    })
    
}