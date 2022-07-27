import * as cyfs from "../../cyfs";
import assert from "assert";
import {ErrorCode} from '../../../../base';
import {stop_nft_creator,uploadNFT,updateNFT,stack,stackInfo,init_stack} from "../opt";
import {request,ContentType} from "../../common/request"
var date = require("silly-datetime");
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import  {CyfsNftClient,NFTSummaryInfo,NFTType,NFTState} from "../../nft_client/nft_client"
import {dec_id,nft_tool_path} from "../../common/config"
import {dingding_test} from "../../common/dingding"
async function NFT2_runtime_case1() {

    // 查询一个未支付的NFT进行购买
    let online:any = await request("POST","api/nft/nft_info/querySelling",JSON.stringify({author_id:stackInfo.owner,status:"Selling"}),ContentType.json)
    console.info(`resp: ${online}`)
    let nft = online.body;
    //console.info(JSON.stringify(nft));
    if(nft.length < 1){
        console.info(`当前无可购买NFT`)
        await cyfs.sleep(10*1000);
        return ;
    }
    let nft_client =  new CyfsNftClient(stack,cyfs.ObjectId.from_base_58(dec_id).unwrap());
    //获取NFT
    let get =await nft_client.get_nft_from_chain(nft[0]!.nft_id!);
    console.info(JSON.stringify(get.unwrap()));
    //购买NFT
    let buy =await nft_client.buy(nft[0]!.nft_id!,100000000);
    console.info(JSON.stringify(buy));
    if(buy.err){
        console.info(` NFT2 case1 提交购买记录失败 ${JSON.stringify(buy)}`)
    }else{
        console.info(` NFT2 case1 提交购买记录成功`)
        let save = await request("POST","api/nft/nft_info/buyNft",JSON.stringify({author_id:stackInfo.owner,status:"buy",nft_id:nft[0]!.nft_id!}),ContentType.json)
        console.info(`resp: ${save}`)
    }
    return;
    
}

async function  always_run_testcase(agent:string,time:number,testcase_name:string) {
    try {
        await init_stack();
        while(true){
            switch(testcase_name){
                case  "NFT2_runtime_case1" : {
                    await NFT2_runtime_case1();
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
   
    await always_run_testcase(agent,time,"NFT2_runtime_case1");
    console.info("########run finshed");
    return;
    
}
main().finally(()=>{
    process.exit(0);
});