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
import * as fs from  "fs"



//上报数据格式
interface nftGfData {
    name: string,
    author_id: string,
    owner_id: string,
    nft_id: string,
    status: string,
    cyfs_link: string,
    nft_link: string,
    create_time: number,
    testcase_date: any,
    data: string
}


async function NFT1_runtime_case1() {
    // 创建单一NFT
    console.info(`#####NFT1_runtime_case1`)
    await stop_nft_creator();
    let info = await uploadNFT(stack);
    assert(info.err ==ErrorCode.succ,JSON.stringify(info))
    //将NFT 数据保存到测试数据库
    let nft: nftGfData  = {
        name:info.nft!.name,
        author_id:stackInfo.owner,
        owner_id:stackInfo.owner,
        nft_id:info.nft!.nft_id,
        status:"new",
        cyfs_link:`cyfs://static/nfttool/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        nft_link:`http://gate.cyfs.com/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        create_time:Date.now(),
        testcase_date: date.format(new Date(),'YYYY/MM/DD'),
        data:"always_run_case1"
    }
    //设置出售NFT
    let info2 =  await updateNFT(info.nft!,"Atomic",{"Selling": [100000000,{"Coin": 0}]});
    if(info2.err ==ErrorCode.fail){
        assert.ok(false,`NFT1_runtime 更新NFT失败:${JSON.stringify(info2)}`)

    }else if(info2.err ==ErrorCode.timeout){
        assert.ok(false,`NFT1_runtime 更新NFT:${JSON.stringify(info2)}`)
    }else if(info2.err ==ErrorCode.succ){
        nft.status =  "Selling";
    }
    let online = await request("POST","api/nft/nft_info/recordNft",nft,ContentType.json)
    console.info(`resp: ${online}`)
    console.info(`保存 NFT 记录成功`)
    return;
}

async function NFT1_runtime_case2() {
    // 创建系列NFT
    console.info(`#####NFT1_runtime_case1`)
    await stop_nft_creator();
    let info = await uploadNFT(stack);
    assert(info.err ==ErrorCode.succ,JSON.stringify(info))
    //将NFT 数据保存到测试数据库
    let nft: nftGfData  = {
        name:info.nft!.name,
        author_id:stackInfo.owner,
        owner_id:stackInfo.owner,
        nft_id:info.nft!.nft_id,
        status:"new",
        cyfs_link:`cyfs://static/nfttool/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        nft_link:`http://gate.cyfs.com/index.html#/nft_detail/${stackInfo.owner}/${info.nft!.nft_id}`,
        create_time:Date.now(),
        testcase_date: date.format(new Date(),'YYYY/MM/DD'),
        data:"always_run_case1"
    }
    //设置出售系列NFT
    let info2 =  await updateNFT(info.nft!,"Atomic",{"Selling": [100000000,{"Coin": 0}]});
    if(info2.err ==ErrorCode.fail){
        assert.ok(false,`NFT1_runtime 更新NFT失败:${JSON.stringify(info2)}`)

    }else if(info2.err ==ErrorCode.timeout){
        assert.ok(false,`NFT1_runtime 更新NFT:${JSON.stringify(info2)}`)
    }else if(info2.err ==ErrorCode.succ){
        nft.status =  "Selling";
    }
    let online = await request("POST","api/nft/nft_info/recordNft",nft,ContentType.json)
    console.info(`resp: ${online}`)
    console.info(`保存 NFT 记录成功`)
    return;
}


async function  always_run_testcase(agent:string,time:number,testcase_name:string) {
    //跳过创建NFT后确认弹窗

    console.log("创建目录");
    fs.mkdir("C:\\Users\\bucky\\AppData\\Roaming\\cyfs\\data\\nft-creator", { recursive: true },function(err){
        if (err) {
        return console.error(err);
    }
    console.log("目录创建成功。");
    });
    fs.writeFile('C:\\Users\\bucky\\AppData\\Roaming\\cyfs\\data\\nft-creator\\config.toml', 'close_remainder =1', function (err) { 
        if (err) throw err; 
        console.log('File is created successfully.'); 
    });

    try {
        while(true){
            await init_stack();
            switch(testcase_name){
                case  "NFT1_runtime_case1" : {
                    await NFT1_runtime_case1();
                    break;
                }
                case  "NFT1_runtime_case2" : {
                    await NFT1_runtime_case2();
                    break;
                }
            }
            await cyfs.sleep(time);
        } 
    } catch (error) {
        console.info(error);
        let online = await request("POST","api/base/error/report",JSON.stringify({agent,error_message:`${error}`,testcase:testcase_name}),ContentType.json)
        console.info(`resp: ${online}`)
        await dingding_test(`${error}`);
        await cyfs.sleep(time);
        process.exit(0);
    }
    
}

async function main() {
    let agent =  SysProcess.argv[2];
    let time =  Number(SysProcess.argv[3]);
    let name =  SysProcess.argv[4];
    cyfs.clog.enable_file_log({
        name: `${agent}_${name}`,
        dir: cyfs.get_app_log_dir("nft_always_run"),
    });
    console.info(`init testcase log dir=nft_always_run ,name = ${agent}_${name}`)
    await always_run_testcase(agent,time,"NFT1_runtime_case1");
    console.info("########run finshed");
    return;
    
}
main().finally(()=>{
    process.exit(0);
});