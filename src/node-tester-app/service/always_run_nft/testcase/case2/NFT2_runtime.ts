import * as cyfs from "../../cyfs";
import assert from "assert";
import {ErrorCode} from '../../../../base';
import {stop_nft_creator,uploadNFT,updateNFT,stack,stackInfo,init_stack} from "../opt";
import {request,ContentType} from "../../common/request"
var date = require("silly-datetime");
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import  {CyfsNftClient,NFTSummaryInfo,NFTType,NFTState} from "../../nft_client/nft_client"
import {dingding_test} from "../../common/dingding"
async function NFT2_runtime_case2() {
    // 创建NFT
    console.info(`#####NFT2_runtime_case2`)
    await stop_nft_creator();
    let info = await uploadNFT(stack);
    assert(info.err ==ErrorCode.succ,JSON.stringify(info))
    //将NFT 数据保存到测试数据库
    let nft  = {
        name:info.nft!.name,
        author_id:stackInfo.owner,
        owner_id:stackInfo.owner,
        nft_id:info.nft!.nft_id,
        status:"new",
        cyfs_link:`cyfs://static/nfttool/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        nft_link:`http://gate.cyfs.com/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        create_time:Date.now(),
        testcase_date: date.format(new Date(),'YYYY/MM/DD'),
        data:"always_run_case2",
    }
    //设置出售NFT
    let info2 =  await updateNFT(info.nft!,"Atomic",{"Selling": [100000000,{"Coin": 0}]});
    if(info2.err ==ErrorCode.fail){
        assert.ok(false,`NFT2_runtime 更新NFT失败:${JSON.stringify(info2)}`)

    }else if(info2.err ==ErrorCode.timeout){
        assert.ok(false,`NFT2_runtime 更新NFT超时:${JSON.stringify(info2)}`)
    }else if(info2.err ==ErrorCode.succ){
        nft.status =  "action";
    }
    let online = await request("POST","api/nft/nft_info/recordNft",JSON.stringify(nft),ContentType.json)
    console.info(`resp: ${online}`)
    console.info(`保存 NFT 记录成功`)
    return;
}


async function  always_run_testcase(agent:string,time:number,testcase_name:string) {
    try {
        await init_stack();
        while(true){
            switch(testcase_name){
                case  "NFT2_runtime_case2" : {
                    await NFT2_runtime_case2();
                    break;
                }
            }
            await cyfs.sleep(time);
        }
    } catch (error) {
        console.info(error);
        let online = await request("POST","api/base/error",JSON.stringify({agent,error_message:`${error}`,testcase:testcase_name}),ContentType.json)
        console.info(`resp: ${online}`)
        await dingding_test(`${error}`);
        await cyfs.sleep(time);
    }
    return;
}

async function main() {
    let agent =  SysProcess.argv[2];
    let time =  Number(SysProcess.argv[3]);
    let name =  SysProcess.argv[4];
    cyfs.clog.enable_file_log({
        name: `${agent}_${name}`,
        dir: cyfs.get_app_log_dir("nft_always_run"),
    });
    await always_run_testcase(agent,time,"NFT2_runtime_case2");
    console.info("########run finshed");
    return;
    
}
main().finally(()=>{
    process.exit(0);
});