import assert = require('assert'); 
import JSBI from 'jsbi';
import * as cyfs from '../../cyfs_node/cyfs_node';
import * as meta_config from './meta_config';
//import { stack,stackInfo}from "../../common/utils/stack";
import * as fs from "fs-extra"
import * as path from "path"

function stringToUint8Array(str: string): Uint8Array {
    const arr = [];
    for (let i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    const tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}

function create_device(owner: cyfs.ObjectId, cat: cyfs.DeviceCategory): [cyfs.Device, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
    let device = cyfs.Device.create(cyfs.Some(owner), unique, [], [], [], public_key, cyfs.Area.default(), cat);

    return [device, pk];
}

function load_desc_and_sec(path: string): [cyfs.StandardObject, cyfs.PrivateKey] {
    const desc = new cyfs.StandardObjectDecoder().raw_decode(new Uint8Array(fs.readFileSync(path+".desc"))).unwrap()[0];
    const sec = new cyfs.PrivatekeyDecoder().raw_decode(new Uint8Array(fs.readFileSync(path+".sec"))).unwrap()[0];
    return [desc, sec];
}

function save_desc_and_sec(object:cyfs.StandardObject,private_key: cyfs.PrivateKey,save_path:string) {
    let desc_path =  save_path + ".desc";
    let sec_path = save_path + ".sec";
    fs.writeFileSync(desc_path,object.encode_to_buf().unwrap());
    fs.writeFileSync(sec_path,private_key.to_vec().unwrap());
    return [desc_path,sec_path]
}


describe("TS meta_client 接口测试",function(){
    this.timeout(0)
    before(async()=>{
        //await stackInfo.init();
    })
    describe("meta接口测试测试",async()=>{
        describe("get_meta_miner_host 接口",async()=>{
            it("target 为Dev 链",async()=>{
                let url = cyfs.get_meta_miner_host(cyfs.MetaMinerTarget.Dev)
                assert.ok(meta_config.check_array_contain(meta_config.Meta_miner_host_nightly,url),"meta_miner_host url不正确")
            })
            it("target Test 链",async()=>{
                let url = cyfs.get_meta_miner_host(cyfs.MetaMinerTarget.Test)
                assert.ok(meta_config.check_array_contain(meta_config.Meta_miner_host_beta,url),"meta_miner_host url不正确")
            })
        })
        describe("get_meta_spv_host 接口",async()=>{
            it("target 为Dev 链",async()=>{
                let url = cyfs.get_meta_spv_host(cyfs.MetaMinerTarget.Dev)
                assert.equal(meta_config.Meta_spv_host_nightly,url,"get_meta_spv_host url不正确")
            })
            it("target 为Test 链",async()=>{
                let url = cyfs.get_meta_spv_host(cyfs.MetaMinerTarget.Test)
                assert.equal(meta_config.Meta_spv_host_beta,url,"get_meta_spv_host url不正确")
            })
        })
        describe("meta_target_from_str 接口",async()=>{
            it("target 为Dev 链",async()=>{
                let url = cyfs.meta_target_from_str("dev")
                assert.equal(0,url,"meta_target_from_str url不正确")
            })
            it("target 为Test 链",async()=>{
                let url = cyfs.meta_target_from_str("test")
                assert.equal(1,url,"meta_target_from_str url不正确")
            })
            it("target 为foemal 链",async()=>{
                let url = cyfs.meta_target_from_str("formal")
                assert.equal(2,url,"meta_target_from_str url不正确")
            })
        })
        describe("get_meta_client 接口",async()=>{
            it("target 为Dev 链",async()=>{
                let meta_client = cyfs.get_meta_client(cyfs.MetaMinerTarget.Dev);
                let info =  await meta_client.getSpvStatus()
                assert.ok(info?.err==0)

            })
            it("target 为Test 链",async()=>{
                let meta_client = cyfs.get_meta_client(cyfs.MetaMinerTarget.Test)
                let info =  await meta_client.getSpvStatus()
                assert.ok(info?.err==0)
                
            })
        })
        describe("create_meta_client 接口",async()=>{
            it("target_str 为Dev 链",async()=>{
                let meta_client = cyfs.create_meta_client("dev",meta_config.Meta_spv_host_nightly);
                let info =  await meta_client.getSpvStatus()
                assert.ok(info?.err==0)

            })
            it("target_str 为Test 链",async()=>{
                let meta_client = cyfs.create_meta_client("test",meta_config.Meta_spv_host_beta);
                let info =  await meta_client.getSpvStatus()
                assert.ok(info?.err==0)
                
            })
            it("参数 target_str、spv_str均为undefine ",async()=>{
                let meta_client = cyfs.create_meta_client()
                let info =  await meta_client.getSpvStatus()
                assert.ok(info?.err==0)
                
            })
            it("参数 spv_str为undefine ",async()=>{
                let meta_client = cyfs.create_meta_client("dev")
                let info =  await meta_client.getSpvStatus()                                                                                                                                                                                                                                                 
                assert.ok(info?.err==0)
                
            })
        })
        describe("MetaClient  类接口 Nightly 环境",async()=>{
            const meta_client_nightly = cyfs.get_meta_client(cyfs.MetaMinerTarget.Dev)
            async function  checkReceipt(txId:string,timeout:number=300*1000) {
                console.info(txId)
                let time = Date.now()
                let info =await meta_client_nightly.getReceipt(cyfs.TxId.from_base_58(txId).unwrap())
                while(Date.now() < time+timeout){
                    info =await meta_client_nightly.getReceipt(cyfs.TxId.from_base_58(txId).unwrap())
                    console.info(`检查上链结果：${JSON.stringify(info)}`)
                    if(info.ok){
                        let [receipt,block] = info.unwrap().unwrap()
                        return{err:false,receipt,block}
                    }
                    await cyfs.sleep(5*1000)
                }
                let [receipt,block] = info.unwrap().unwrap()
                return{err:true,receipt,block} 
            }
            describe("MetaClient 类 getSpvStatus 接口",async()=>{
                it("getSpvStatus 接口",async()=>{
                    let info  = await meta_client_nightly.getSpvStatus();
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getPaymentTxList 接口",async()=>{
                //TODOO
                it("getPaymentTxList 接口",async()=>{
                    let info  = await meta_client_nightly.getPaymentTxList(["8YCfQUGs6wC8c64kGxkYs3Vf6xPvAs8cf1RwizjsmhPR"],0,10,0,999999,[]);
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getCollectTxList 接口",async()=>{
                it("getCollectTxList 接口",async()=>{
                    let info  = await meta_client_nightly.getCollectTxList(["5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk"],0,10,0,999999,[]);
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getTxList 接口",async()=>{
                //TODOO
                it("getTxList 接口",async()=>{
                    let info  = await meta_client_nightly.getTxList(["9NvaxMdCA33UcV8dpXPKKKbrp9QZswQk3XpjfpDu9FPR"],0,10,0,999999999,[]);
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getBlocksByRange 接口",async()=>{
                //TODOO
                it("getBlocksByRange 接口",async()=>{
                    let info  = await meta_client_nightly.getBlocksByRange(780527,780527);
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getFileRewardAmount 接口",async()=>{
                it("getFileRewardAmount 接口",async()=>{
                    let info  = await meta_client_nightly.getFileRewardAmount("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk");
                    console.info(JSON.stringify(info))
                    assert.ok(info.err==0,`返回结果失败：${info}`)
                }) 
            })
            describe("MetaClient 类 getErc20TransferList 接口",async()=>{
                // {
                //     tx_hash?: string,
                //     start_number?: number,
                //     end_number?: number,
                //     from?: string,
                //     to?: string,
                // }
                it("getErc20TransferList 接口",async()=>{
                    let info  = await meta_client_nightly.getErc20TransferList("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk",{from:"5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk",to:"8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu"}); 
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getTx 接口",async()=>{
                it("getTx 接口",async()=>{
                    let info  = await meta_client_nightly.getTx("8YCfQUGeLFN4mRGViUqLzksmwAAT2jFMdrQjxSxnFWMU");
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 getBalance 接口",async()=>{
                it("getBalance 接口",async()=>{
                    let info =await meta_client_nightly.getBalance(0,"5r4MYfFaa87LxLbMKN1oaMr4EHbcuqsuReWj264NwwU9")
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 getBalances 接口",async()=>{
                it("getBalances 接口",async()=>{
                    let info =await meta_client_nightly.getBalances([[10,"5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk"]])
                  
                    console.info(JSON.stringify(info))
                    
                }) 
            })
            describe("MetaClient 类 getChainStatus 接口",async()=>{
                it("getChainStatus 接口",async()=>{
                    let info =await meta_client_nightly.getChainStatus()
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 view_request 接口",async()=>{
                it("view_request 接口",async()=>{
                    const view = new cyfs.ViewRequest(
                        cyfs.ViewBlockEnum.Tip(),
                        cyfs.ViewMethodEnum.ViewDesc(new cyfs.ViewDescMethod(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap())),
                    );
                    let info =await meta_client_nightly.view_request(view)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getDesc 接口",async()=>{
                it("getDesc 接口",async()=>{
                    let info =await meta_client_nightly.getDesc(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getBalance2 接口",async()=>{
                it("getBalance2 接口",async()=>{
                    let info =await meta_client_nightly.getBalance2(cyfs.ObjectId.from_base_58("5r4MYfFPKMeHa1fec7dHKmBfowySBfVFvRQvKB956dnF").unwrap(),0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getRawData 接口",async()=>{
                it("getRawData 接口",async()=>{
                    let info =await meta_client_nightly.getRawData(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getChainViewStatus 接口",async()=>{
                it("getChainViewStatus 接口",async()=>{
                    let info =await meta_client_nightly.getChainViewStatus()
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe.skip("MetaClient 类 getBlock 接口",async()=>{
                // it("getBlock 接口",async()=>{
                //     let info =await meta_client_nightly.getBlock(JSBI.BigInt(1186827))
                //     console.info(JSON.stringify(info))
                //     assert.ok(info.ok)
                // }) 
            })
            describe("MetaClient 类 getName 接口",async()=>{
                it("getName 接口 name被使用",async()=>{
                    let info =await meta_client_nightly.getName("cyfs");
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    assert.ok(info.val.unwrap().name_info.owner,"name 未被使用")
                })
                it("getName 接口 name未被使用",async()=>{
                    let info =await meta_client_nightly.getName("nousecyfs");
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                })  
            })
            describe("MetaClient 类 getReceipt 接口",async()=>{
                it("getReceipt 接口",async()=>{
                    let info =await meta_client_nightly.getReceipt(cyfs.TxId.from_base_58("8YCfQUGTkq2GSqmGaxQkscUMtKr1ndiyGcGKw5pbMWQn").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 get_nonce 接口",async()=>{
                it("get_nonce 接口",async()=>{
                    let info =await meta_client_nightly.get_nonce(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 create_desc 接口",async()=>{
                /**
                 *  private device?: Device,
                    private people?: People,
                    private unionaccount?: UnionAccount,
                    private group?: SimpleGroup,
                    private file?: File,
                    private data?: Data,
                    private org?: Org,
                    private minergroup?: MinerGroup,
                    private snservice?: SNService,
                    private contract?: Contract,
                 */
                it("create_desc 接口 上链 People对象",async()=>{
                    let [people,people_pk] = create_people();
                    //let [desc,sec] = save_desc_and_sec(people,people_pk,"E:\\githubSpace\\cyfs_stack_test\\TestSuite\\unittest_meta\\my");
                    console.info(`创建people并且上链,people id:${people.calculate_id()}`)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), JSBI.BigInt(10*10000*10000), 0,0, people_pk)
                    console.info("create desc 返回结果",JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().object_id.to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${JSON.stringify(check)}`)
                    
                })
                it("create_desc 接口 上链 Device对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    cyfs.sign_and_push_named_object(people_pk, device, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                })
                it("create_desc 接口 上链 SimpleGroup对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    let group = cyfs.SimpleGroup.create(0,[public_key],[device.desc().calculate_id()],cyfs.OODWorkMode.ActiveStandby, [device.device_id()],new cyfs.Area(1,1,1,1))
                    cyfs.sign_and_push_named_object(people_pk, group, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(group).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 UnionAccount对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let unionAccount = cyfs.UnionAccount.create(people.calculate_id(),ood.calculate_id(),1)
                    cyfs.sign_and_push_named_object(people_pk, unionAccount, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(unionAccount).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 org对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let text = cyfs.TextObject.create(cyfs.Some(people.calculate_id()),`${Date.now()}`,`${Date.now()}`,`${Date.now()}`)
                    let member =new cyfs.OrgMember(people.calculate_id(),1,JSBI.BigInt(22222))
                    let doc = new cyfs.Director(people.calculate_id(),1)
                    let data =cyfs.Org.create([member],[doc],1) //(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.Org(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 minergroup 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    let data =cyfs.MinerGroup.create([device.desc()]) //(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap() snservice
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.MinerGroup(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
                it("create_desc 接口 上链 snservice 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let data = cyfs.SNService.create(people.calculate_id(),1,JSBI.BigInt(10));
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.SNService(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                    
                }) 
                //contract 应该和合约一起测试
                it.skip("create_desc 接口 上链 contract 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let file_content = stringToUint8Array("9po8eBzh4Gb5ut48qEyQxipPUbjzBS329po8eBzh4Gb5ut48qEyQxipPUbjzBS32hsfjashfjahfj")
                    let hash = cyfs.HashValue.hash_data(file_content);
                    let data = cyfs.Contract.create(hash);
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.Contract(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                    
                }) 
                it("create_desc 接口 上链 data对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let text = cyfs.TextObject.create(cyfs.Some(people.calculate_id()),`${Date.now()}`,`${Date.now()}`,`${Date.now()}`)
                    let data =new cyfs.Data(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_nightly.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.Data(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 File对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./my'))
                    console.info(`peopleid:${people.calculate_id()}`)
                    let file_content = stringToUint8Array(`9po8eBzh4Gb5ut48qEyQxipPUbjzBS329po8eBzh4Gb5ut48qEyQxipPUbjzBS32hsfjashfjahfj${Date.now()}`)
                    let hash = cyfs.HashValue.hash_data(file_content);
                    let chunk = cyfs.ChunkId.calculate(file_content).unwrap();
                    let ChunkList = new cyfs.ChunkList([chunk])
                    let file =  cyfs.File.create(people.calculate_id(),JSBI.BigInt(file_content.byteLength),hash,ChunkList)
                    cyfs.sign_and_push_named_object(people_pk, file, new cyfs.SignatureRefIndex(254)).unwrap()
                    console.info(`file id : ${file.calculate_id()}`)
                    console.info(`file owner : ${file.desc()!.owner()!.unwrap().to_base_58()}`)
                    // 上链失败，114签名校验失败
                    let info = await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(file).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    assert.ok(info.ok)
                    console.info("上链返回TX id",JSON.stringify(info))
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
            })
            describe("MetaClient 类 update_desc 接口",async()=>{
                it("update_desc 接口",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let info =await meta_client_nightly.update_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), cyfs.Some(0), cyfs.Some(0), people_pk)  
                    console.info(JSON.stringify(info))  
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
                it("create_desc 接口 上链 People对象 update_desc 更新people ood list",async()=>{
                    let [people,people_pk] = create_people();
                    //let [desc,sec] = save_desc_and_sec(people,people_pk,"E:\\githubSpace\\cyfs_stack_test\\TestSuite\\unittest_meta\\my");
                    console.info(`创建people并且上链,people id:${people.calculate_id()}`)
                    let info =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), JSBI.BigInt(10*10000*10000), 0,0, people_pk)
                    console.info("create desc 返回结果",JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().object_id.to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${JSON.stringify(check)}`)
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.OOD);
                    people.body_expect().content().ood_list = [device.device_id()];
                    console.info(`people ood list ${JSON.stringify(people.body_expect().content().ood_list)}`)
                    //let info2 =await meta_client_nightly.create_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), JSBI.BigInt(10*10000*10000), 0,0, people_pk)
                    
                    let info2 =await meta_client_nightly.update_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), cyfs.Some(0), cyfs.Some(0), people_pk)  
                    let  check2 = await checkReceipt(info2.unwrap().object_id.to_base_58())
                    assert(!check2.err,`${info2.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check2.receipt!.result == 0,`${info2.unwrap().to_base_58()} 上链失败，返回错误 ${JSON.stringify(check2)}`)
                    
                })
            })
            describe("MetaClient 类 trans_balance 接口",async()=>{
                it("trans_balance 接口转账",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap();  
                    console.info(people)
                    console.info(people_pk)
                    let info =await meta_client_nightly.trans_balance(people,cyfs.ObjectId.from_base_58("8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu").unwrap(), JSBI.BigInt(1000000000), 0,  people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                })
                it.only("trans_balance 接口循环充钱",async()=>{ 
                    let list = []
                    for(let i =0;i<1;i++){
                        list.push(new Promise(async(v)=>{
                            console.info(`获取1000ECC`)
                            let [people1,people_pk1] = create_people();
                            console.info(`创建people并且上链${people1.calculate_id()}`)
                            let info =await meta_client_nightly.create_desc(people1,cyfs.SavedMetaObject.try_from(people1).unwrap(), JSBI.BigInt(1000*10000*10000), 0, 0, people_pk1)
                            console.info("create desc 返回结果",info.unwrap().object_id.to_base_58())
                            assert.ok(info.ok)
                            let  check = await checkReceipt(info.unwrap().object_id.to_base_58())
                            assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                            assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                            let info2 =await meta_client_nightly.trans_balance(people1,cyfs.ObjectId.from_base_58("5r4MYfFecaGVxS6ynLBEfhEAkUSch2BPSzfs9E29tRLt").unwrap(), JSBI.BigInt(199*10000*10000), 0,  people_pk1)
                            console.info(JSON.stringify(info2))
                            assert.ok(info2.ok)
                            v("")
                        }))
                        await cyfs.sleep(1000)
                    }
                    for(let i =0;i<1;i++){
                        await list[i]
                    }
                    let info =await meta_client_nightly.getBalance(0,"5r4MYfFecaGVxS6ynLBEfhEAkUSch2BPSzfs9E29tRLt")
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 withdraw_from_file 接口",async()=>{
                it("withdraw_from_file 接口",async()=>{
                    //获取people数据
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap();  
                    let info =await meta_client_nightly.withdraw_from_file(people,cyfs.ObjectId.from_base_58("8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu").unwrap(), JSBI.BigInt(1000000000), 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 create_contract 接口",async()=>{
                it("create_contract 接口",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap(); 
                    let info =await meta_client_nightly.create_contract(people,people_pk,JSBI.BigInt(10000000),stringToUint8Array("contract"),0,0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 call_contract 接口",async()=>{
                it("call_contract 接口",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap(); 
                    let info = await meta_client_nightly.call_contract(people,people_pk,cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),JSBI.BigInt(0),stringToUint8Array("contract"),0,0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let check = await checkReceipt(info.unwrap().object_id.to_base_58())
                }) 
            })
            //8YCfQUGZSjHgEZXgARagoEumkhgNowabHhWRRUQtVRdf
            describe("MetaClient 类 view_contract 接口",async()=>{
                it("view_contract 接口",async()=>{
                    let info =await meta_client_nightly.view_contract(cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),stringToUint8Array("contract"))
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 get_logs 接口",async()=>{
                it("get_logs 接口",async()=>{
                    let info =await meta_client_nightly.get_logs(cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),[stringToUint8Array("contract")],0,9999999)
                    console.info(JSON.stringify(info))
                    //assert.ok(info.ok)
                }) 
            })
        })
    
        describe.skip("MetaClient  类接口 Beta 环境",async()=>{
            const meta_client_beta = cyfs.get_meta_client(cyfs.MetaMinerTarget.Test)
            async function  checkReceipt(txId:string,timeout:number=300*1000) {
                console.info(txId)
                let time = Date.now()
                let info =await meta_client_beta.getReceipt(cyfs.TxId.from_base_58(txId).unwrap())
                while(Date.now() < time+timeout){
                    info =await meta_client_beta.getReceipt(cyfs.TxId.from_base_58(txId).unwrap())
                    console.info(`检查上链结果：${JSON.stringify(info)}`)
                    if(info.ok){
                        let [receipt,block] = info.unwrap().unwrap()
                        return{err:false,receipt,block}
                    }
                    await cyfs.sleep(5*1000)
                }
                let [receipt,block] = info.unwrap().unwrap()
                return{err:true,receipt,block} 
            }
            describe("MetaClient 类 getSpvStatus 接口",async()=>{
                it("getSpvStatus 接口",async()=>{
                    let info  = await meta_client_beta.getSpvStatus();
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getPaymentTxList 接口",async()=>{
                //TODOO
                it("getPaymentTxList 接口",async()=>{
                    let info  = await meta_client_beta.getPaymentTxList(["8YCfQUGs6wC8c64kGxkYs3Vf6xPvAs8cf1RwizjsmhPR"],0,10,0,999999,[]);
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getCollectTxList 接口",async()=>{
                it("getCollectTxList 接口",async()=>{
                    let info  = await meta_client_beta.getCollectTxList(["5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk"],0,10,0,999999,[]);
                    assert.ok(info?.err == 0)
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getTxList 接口",async()=>{
                //TODOO
                it("getTxList 接口",async()=>{
                    let info  = await meta_client_beta.getTxList(["9NvaxMdCA33UcV8dpXPKKKbrp9QZswQk3XpjfpDu9FPR"],0,10,0,999999999,[]);
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getBlocksByRange 接口",async()=>{
                //TODOO
                it("getBlocksByRange 接口",async()=>{
                    let info  = await meta_client_beta.getBlocksByRange(780527,780527);
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getFileRewardAmount 接口",async()=>{
                it("getFileRewardAmount 接口",async()=>{
                    let info  = await meta_client_beta.getFileRewardAmount("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk");
                    console.info(JSON.stringify(info))
                    assert.ok(info.err==0,`返回结果失败：${info}`)
                }) 
            })
            describe("MetaClient 类 getErc20TransferList 接口",async()=>{
                // {
                //     tx_hash?: string,
                //     start_number?: number,
                //     end_number?: number,
                //     from?: string,
                //     to?: string,
                // }
                it("getErc20TransferList 接口",async()=>{
                    let info  = await meta_client_beta.getErc20TransferList("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk",{from:"5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk",to:"8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu"}); 
                    console.info(JSON.stringify(info))
                }) 
            })
            describe("MetaClient 类 getTx 接口",async()=>{
                it("getTx 接口",async()=>{
                    let info  = await meta_client_beta.getTx("8YCfQUGTaWoQUkEoSGNtd3ACDpcb1ABjvLB929WCqb62");
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 getBalance 接口",async()=>{
                it("getBalance 接口",async()=>{
                    let info =await meta_client_beta.getBalance(0,"5r4MYfFecaGVxS6ynLBEfhEAkUSch2BPSzfs9E29tRLt")
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 getBalances 接口",async()=>{
                it("getBalances 接口",async()=>{
                    let info =await meta_client_beta.getBalances([[10,"5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk"]])
                  
                    console.info(JSON.stringify(info))
                    
                }) 
            })
            describe("MetaClient 类 getChainStatus 接口",async()=>{
                it("getChainStatus 接口",async()=>{
                    let info =await meta_client_beta.getChainStatus()
                    console.info(JSON.stringify(info))
                    assert.ok(info!.err==0)
                }) 
            })
            describe("MetaClient 类 view_request 接口",async()=>{
                it("view_request 接口",async()=>{
                    const view = new cyfs.ViewRequest(
                        cyfs.ViewBlockEnum.Tip(),
                        cyfs.ViewMethodEnum.ViewDesc(new cyfs.ViewDescMethod(cyfs.ObjectId.from_base_58("5r4MYfFHhSRcVybjLNNTGvECDsW8yxej8U7YRqgTJxS2").unwrap())),
                    );
                    let info =await meta_client_beta.view_request(view)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getDesc 接口",async()=>{
                it("getDesc 接口",async()=>{
                    let info =await meta_client_beta.getDesc(cyfs.ObjectId.from_base_58("5r4MYfFHhSRcVybjLNNTGvECDsW8yxej8U7YRqgTJxS2").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getBalance2 接口",async()=>{
                it("getBalance2 接口",async()=>{
                    let info =await meta_client_beta.getBalance2(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap(),0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getRawData 接口",async()=>{
                it("getRawData 接口",async()=>{
                    let info =await meta_client_beta.getRawData(cyfs.ObjectId.from_base_58("5r4MYfFHhSRcVybjLNNTGvECDsW8yxej8U7YRqgTJxS2").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 getChainViewStatus 接口",async()=>{
                it("getChainViewStatus 接口",async()=>{
                    let info =await meta_client_beta.getChainViewStatus()
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe.skip("MetaClient 类 getBlock 接口",async()=>{
                // it("getBlock 接口",async()=>{
                //     let info =await meta_client_beta.getBlock(JSBI.BigInt(1186827))
                //     console.info(JSON.stringify(info))
                //     assert.ok(info.ok)
                // }) 
            })
            describe("MetaClient 类 getName 接口",async()=>{
                it("getName 接口 name被使用",async()=>{
                    let info =await meta_client_beta.getName("cyfs");
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    assert.ok(info.val.unwrap().name_info.owner,"name 未被使用")
                })
                it("getName 接口 name未被使用",async()=>{
                    let info =await meta_client_beta.getName("nousecyfs");
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                })  
            })
            describe("MetaClient 类 getReceipt 接口",async()=>{
                it("getReceipt 接口",async()=>{
                    let info =await meta_client_beta.getReceipt(cyfs.TxId.from_base_58("8YCfQUGTaWoQUkEoSGNtd3ACDpcb1ABjvLB929WCqb62").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 get_nonce 接口",async()=>{
                it("get_nonce 接口",async()=>{
                    let info =await meta_client_beta.get_nonce(cyfs.ObjectId.from_base_58("5r4MYfFLxNDeW79UMpd9qXd5Xx6su25tXnMGBWbkEBBk").unwrap())
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 create_desc 接口",async()=>{
                /**
                 *  private device?: Device,
                    private people?: People,
                    private unionaccount?: UnionAccount,
                    private group?: SimpleGroup,
                    private file?: File,
                    private data?: Data,
                    private org?: Org,
                    private minergroup?: MinerGroup,
                    private snservice?: SNService,
                    private contract?: Contract,
                 */
                it("create_desc 接口 上链 People对象",async()=>{
                    let [people,people_pk] = create_people();
                    console.info(`创建people并且上链${people.calculate_id()}`)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), JSBI.BigInt(1000*10000*10000), 0, 0, people_pk)
                    console.info("create desc 返回结果",info.unwrap().object_id.to_base_58())
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().object_id.to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                })
                it("create_desc 接口 上链 Device对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    cyfs.sign_and_push_named_object(people_pk, device, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                })
                it("create_desc 接口 上链 SimpleGroup对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    let group = cyfs.SimpleGroup.create(0,[public_key],[device.desc().calculate_id()],cyfs.OODWorkMode.ActiveStandby,[device.device_id()],new cyfs.Area(1,1,1,1))
                    cyfs.sign_and_push_named_object(people_pk, group, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.try_from(group).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 UnionAccount对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let unionAccount = cyfs.UnionAccount.create(people.calculate_id(),ood.calculate_id(),1)
                    cyfs.sign_and_push_named_object(people_pk, unionAccount, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.try_from(unionAccount).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 org对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let text = cyfs.TextObject.create(cyfs.Some(people.calculate_id()),`${Date.now()}`,`${Date.now()}`,`${Date.now()}`)
                    let member =new cyfs.OrgMember(people.calculate_id(),1,JSBI.BigInt(22222))
                    let doc = new cyfs.Director(people.calculate_id(),1)
                    let data =cyfs.Org.create([member],[doc],1) //(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.Org(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 minergroup 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
                    let public_key = pk.public();
                    let unique = cyfs.UniqueId.copy_from_slice(stringToUint8Array(Date.now().toString()))
                    let device = cyfs.Device.create(cyfs.Some(people.calculate_id()), unique, [], [], [], public_key, cyfs.Area.default(), cyfs.DeviceCategory.PC);
                    let data =cyfs.MinerGroup.create([device.desc()]) //(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap() snservice
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.MinerGroup(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
                it("create_desc 接口 上链 snservice 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let data = cyfs.SNService.create(people.calculate_id(),1,JSBI.BigInt(10));
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.SNService(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                    
                }) 
                //contract 应该和合约一起测试
                it.skip("create_desc 接口 上链 contract 对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let file_content = stringToUint8Array("9po8eBzh4Gb5ut48qEyQxipPUbjzBS329po8eBzh4Gb5ut48qEyQxipPUbjzBS32hsfjashfjahfj")
                    let hash = cyfs.HashValue.hash_data(file_content);
                    let data = cyfs.Contract.create(hash);
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.Contract(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                    
                }) 
                it("create_desc 接口 上链 data对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let [ood,ood_pk] = load_desc_and_sec(path.join(__dirname,'./ood'))
                    let text = cyfs.TextObject.create(cyfs.Some(people.calculate_id()),`${Date.now()}`,`${Date.now()}`,`${Date.now()}`)
                    let data =new cyfs.Data(text.calculate_id(),text.to_vec().unwrap())
                    //cyfs.sign_and_push_named_object(people_pk, data, new cyfs.SignatureRefIndex(254)).unwrap()
                    //let info =await meta_client_beta.create_desc(device,cyfs.SavedMetaObject.try_from(device).unwrap(), JSBI.BigInt(0), 0, 0, pk)
                    let info =await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.Data(data), JSBI.BigInt(0), 0, 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                    
                }) 
                it("create_desc 接口 上链 File对象",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    console.info(`peopleid:${people.calculate_id()}`)
                    let file_content = stringToUint8Array("9po8eBzh4Gb5ut48qEyQxipPUbjzBS329po8eBzh4Gb5ut48qEyQxipPUbjzBS32hsfjashfjahfj")
                    let hash = cyfs.HashValue.hash_data(file_content);
                    let chunk = cyfs.ChunkId.calculate(file_content).unwrap();
                    let ChunkList = new cyfs.ChunkList([chunk])
                    let file =  cyfs.File.create(people.calculate_id(),JSBI.BigInt(file_content.byteLength),hash,ChunkList)
                    cyfs.sign_and_push_named_object(people_pk, file, new cyfs.SignatureRefIndex(254)).unwrap()
                    console.info(`file id : ${file.calculate_id()}`)
                    console.info(`file owner : ${file.desc()!.owner()!.unwrap().to_base_58()}`)
                    // 上链失败，114签名校验失败
                    let info = await meta_client_beta.create_desc(people,cyfs.SavedMetaObject.try_from(file).unwrap(), JSBI.BigInt(0), 0, 0, people_pk)
                    assert.ok(info.ok)
                    console.info("上链返回TX id",JSON.stringify(info))
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
            })
            describe("MetaClient 类 update_desc 接口",async()=>{
                it("update_desc 接口",async()=>{
                    let [people,people_pk] = load_desc_and_sec(path.join(__dirname,'./people'))
                    let info =await meta_client_beta.update_desc(people,cyfs.SavedMetaObject.try_from(people).unwrap(), cyfs.Some(0), cyfs.Some(0), people_pk)  
                    console.info(JSON.stringify(info))  
                    assert.ok(info.ok)
                    let  check = await checkReceipt(info.unwrap().to_base_58())
                    assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                    assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                }) 
            })
            describe("MetaClient 类 trans_balance 接口",async()=>{
                it("trans_balance 接口转账",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap();  
                    console.info(people)
                    console.info(people_pk)
                    let info =await meta_client_beta.trans_balance(people,cyfs.ObjectId.from_base_58("8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu").unwrap(), JSBI.BigInt(1000000000), 0,  people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                })
                it.skip("trans_balance 接口循环充钱",async()=>{ 
                    let list = []
                    for(let i =0;i<5;i++){
                        list.push(new Promise(async(v)=>{
                            console.info(`获取1000ECC`)
                            let [people1,people_pk1] = create_people();
                            console.info(`创建people并且上链${people1.calculate_id()}`)
                            let info =await meta_client_beta.create_desc(people1,cyfs.SavedMetaObject.try_from(people1).unwrap(), JSBI.BigInt(1000*10000*10000), 0, 0, people_pk1)
                            console.info("create desc 返回结果",info.unwrap().object_id.to_base_58())
                            assert.ok(info.ok)
                            let  check = await checkReceipt(info.unwrap().object_id.to_base_58())
                            assert(!check.err,`${info.unwrap().to_base_58()} 检查是否上链超时`)
                            assert(check.receipt!.result == 0,`${info.unwrap().to_base_58()} 上链失败，返回错误 ${check.receipt}`)
                            let info2 =await meta_client_beta.trans_balance(people1,cyfs.ObjectId.from_base_58("5r4MYfFDKtnH8jhN4kEHgDN7NMdG1oA99wtttXp1fGqx").unwrap(), JSBI.BigInt(1000*10000*10000), 0,  people_pk1)
                            console.info(JSON.stringify(info2))
                            assert.ok(info2.ok)
                            v("")
                        }))
                        await cyfs.sleep(1000)
                    }
                    for(let i =0;i<5;i++){
                        await list[i]
                    }
                    
                    
 
                }) 
            })
            describe("MetaClient 类 withdraw_from_file 接口",async()=>{
                it("withdraw_from_file 接口",async()=>{
                    //获取people数据
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap();  
                    let info =await meta_client_beta.withdraw_from_file(people,cyfs.ObjectId.from_base_58("8YCfQUGY18Sj1eGNkL79fuZhJwnSGg7pn88QtufnUVAu").unwrap(), JSBI.BigInt(1000000000), 0, people_pk)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 create_contract 接口",async()=>{
                it("create_contract 接口",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap(); 
                    let info =await meta_client_beta.create_contract(people,people_pk,JSBI.BigInt(10000000),stringToUint8Array("contract"),0,0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 call_contract 接口",async()=>{
                it("call_contract 接口",async()=>{
                    let [people] = new cyfs.PeopleDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.desc')))).unwrap();  
                    let [people_pk] = new cyfs.PrivatekeyDecoder().raw_decode(new  Uint8Array(fs.readFileSync(path.join(__dirname,'./people.sec')))).unwrap(); 
                    let info = await meta_client_beta.call_contract(people,people_pk,cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),JSBI.BigInt(0),stringToUint8Array("contract"),0,0)
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                    let check = await checkReceipt(info.unwrap().object_id.to_base_58())
                }) 
            })
            //8YCfQUGZSjHgEZXgARagoEumkhgNowabHhWRRUQtVRdf
            describe("MetaClient 类 view_contract 接口",async()=>{
                it("view_contract 接口",async()=>{
                    let info =await meta_client_beta.view_contract(cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),stringToUint8Array("contract"))
                    console.info(JSON.stringify(info))
                    assert.ok(info.ok)
                }) 
            })
            describe("MetaClient 类 get_logs 接口",async()=>{
                it("get_logs 接口",async()=>{
                    let info =await meta_client_beta.get_logs(cyfs.ObjectId.from_base_58("8YCfQUGfNLtkjATZKA5VjCafUv61xmYAvSouV9keW1ky").unwrap(),[stringToUint8Array("contract")],0,9999999)
                    console.info(JSON.stringify(info))
                    //assert.ok(info.ok)
                }) 
            })
        })
    


    })
})