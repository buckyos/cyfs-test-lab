import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node';
import * as myHandler from '../../common/utils/handler'
import { TestcaseManger, testcaseInfo } from "../../common/models/testcaseInfo";
import { AclManager } from '../../common/utils/acl_manager'
import { RandomGenerator, NDNTestManager, InputInfo, ResultInfo, stack, create_stack, stop_runtime, StackType, stackInfo } from '../../common'
import { ZoneSimulator } from '../../common'
import { DEC_ID_BASE58, TEST_DEC_ID } from "../../config/decApp"
import * as fs from "fs-extra"
import * as path from "path"
import { getStack, getPeerId } from "../../common/utils/oodFunc"
import { datas } from "./data"
import { agent_init } from '../../common/utils/agent';


import { TaskClientInterface } from '../../agent/base';
import { Agent, Task, Testcase, TestRunner } from '../../agent/forward/test_runner';
import { CustumObjectType } from '../../agent/forward/proto';

var date = require("silly-datetime");


//初始化日志
cyfs.clog.enable_file_log({
    name: "test_main",
    dir: cyfs.get_app_log_dir("test_main"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});
//初始化测试工具
const aclManager = new AclManager();
const handlerManager = new myHandler.handlerManager();

describe("cyfs协议栈测试", async function () {
    this.timeout(0);
    describe(`${datas.module}`, async function () {
        for (let j in datas.testcaseList) {
            let inputData: InputInfo;
            let expectData: ResultInfo;
            const stack_type = datas.stack_type;
            describe(`${datas.testcaseList[j].id}:${datas.testcaseList[j].name}`, async () => {
                before(async function () {
                    //获取测试数据
                    let tmg = new TestcaseManger();
                    await tmg.initMongo();
                    let res = await tmg.findRecordById(datas.testcaseList[j].id);
                    assert.ok(!res.err, res.log)
                    let testcaseInfo: testcaseInfo = res.datas![0];
                    //inputData = JSON.parse(testcaseInfo.input_data!.toString());
                    //expectData = JSON.parse(testcaseInfo.expect_result!.toString());
                    if (datas.stack_type === StackType.Sim) {
                        //初始化ACL配置文件
                        await ZoneSimulator.getPeerId();
                        await ZoneSimulator.removeAllConfig();
                        for (let j in inputData.stackCfgList) {
                            await aclManager.getdevice(inputData.stackCfgList[j].deviceName)!.initAcl({ configFile: path.join(__dirname, "acl", inputData.stackCfgList[j].ACL.configFile!) })
                        }
                        //启动模拟器连接协议栈
                        await ZoneSimulator.init();
                    } else {
                        // runtime/ood
                        const [stack, writable] = await create_stack(datas.stack_type);
                    }
                })
                after(async function () {
                    //数据清理
                    await handlerManager.clearAllHandler();
                    await cyfs.sleep(2 * 1000);
                    await ZoneSimulator.stopZoneSimulator();
                    await cyfs.sleep(2 * 1000);
                    //清除ACL配置文件
                    await aclManager.removeAllAcl();

                    stop_runtime();
                })
                it(`${datas.testcaseList[j].name}`, async () => {
                    // 异常用例阻塞暂时跳过
                    console.info(`开始执行测试用例：${datas.testcaseList[j].name}`)
                    // 临时测试用
                    // if (inputData.skip) {
                    //     assert(false, "测试用例异常，暂时标记不执行")
                    // }
                    //运行超时处理机制
                    let run = true;
                    let timeout = 120 * 1000
                    // // 临时测试用
                    // inputData.timeout = 0;
                    // if (inputData.timeout) {
                    //     timeout = inputData.timeout
                    // }
                    setTimeout(() => {
                        if (run) {
                            console.error(false, "测试用例运行超时")
                        }
                    }, timeout)

                    await test_xxx(inputData);

                    /*
                    //运行测试用例
                    switch (inputData.opt.optType) {
                        case "put_data_chunk": {
                            await initHandlerList(inputData, stack_type);
                            await put_data_chunk(inputData, expectData, stack_type);
                            break;
                        }
                        case "get_data_chunk": {
                            await initHandlerList(inputData, stack_type);
                            await get_data_chunk(inputData, expectData, stack_type);
                            break;
                        }
                        case "get_data_chunk_second": {
                            await initHandlerList(inputData, stack_type);
                            await get_data_chunk_second(inputData, expectData, stack_type);
                            break;
                        }
                        case "trans_file": {
                            await initHandlerList(inputData, stack_type);
                            await trans_file(inputData, expectData, stack_type);
                            break;
                        }
                        case "trans_file_second": {
                            await initHandlerList(inputData, stack_type);
                            await trans_file_second(inputData, expectData, stack_type);
                            break;
                        }
                        case "trans_dir": {
                            await initHandlerList(inputData, stack_type);
                            await trans_dir(inputData, expectData, stack_type);
                            break;
                        }
                        case "put_object": {
                            await initHandlerList(inputData, stack_type);
                            await put_object(inputData, expectData, stack_type);
                            break;
                        }
                        case "get_object": {
                            await initHandlerList(inputData, stack_type);
                            await get_object(inputData, expectData, stack_type);
                            break;
                        }
                        case "select_object": {
                            await initHandlerList(inputData, stack_type);
                            await select_object(inputData, expectData, stack_type);
                            break;
                        }
                        case "delect_object": {
                            await initHandlerList(inputData, stack_type);
                            await delect_object(inputData, expectData, stack_type);
                            break;
                        }
                        case "post_object": {
                            await initHandlerList(inputData, stack_type);
                            await post_object(inputData, expectData, stack_type);
                            break;
                        }
                        case "sign_verify_object": {
                            await initHandlerList(inputData, stack_type);
                            await sign_verify_object(inputData, expectData, stack_type);
                            break;
                        }
                    }*/
                    run = false;
                })

            })

        }
    })


})


async function initHandlerList(inputData: InputInfo, stack_type: StackType) {
    for (let j in inputData.stackCfgList) {
        for (let m in inputData.stackCfgList[j].handlerList) {
            // 不同的协议栈
            const ret = await handlerManager.addHandler(
                inputData.stackCfgList[j].deviceName,
                stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.stackCfgList[j].stack) : stack,
                inputData.stackCfgList[j].handlerList[m].type,
                inputData.stackCfgList[j].handlerList[m].chain,
                inputData.stackCfgList[j].handlerList[m].id,
                inputData.stackCfgList[j].handlerList[m].index,
                inputData.stackCfgList[j].handlerList[m].filter,
                inputData.stackCfgList[j].handlerList[m].default_action,
                inputData.stackCfgList[j].handlerList[m].myHandler,
                inputData.stackCfgList[j].handlerList[m].routineType,
                inputData.stackCfgList[j].handlerList[m].runSum,
            )
            assert(!ret.err, `${inputData.stackCfgList[j].deviceName} 添加 ${inputData.stackCfgList[j].handlerList[m].id} 失败`)
        }
    }
}



async function test_xxx(inputData: InputInfo) {
    // 测试用例demo说明: Zone2_Device1机器使用CYFS协议栈ts_client 进行put_object 并且 get_object 检查数据操作，共执行100次，
    // 同时并发执行任务数10；

    // 测试节点
    let agentList: Array<Agent> = [
        {
            name: "Zone2_Device1",                  //名称标签
            cyfs_clients: [{
                name: "Zone2_Device1_ts_client",    //模拟协议栈 ${Agent.name}_0 、${Agent.name}_1 这样编号
                type: "runtime",                    //协议栈client 连接类型 runtime 、ood 、port
                SDK_type: "typescript",
            }],
            logType: "info",                        //日志级别控制
            report: true,                           //报错cyfs库的性能数据
            report_time: 10 * 1000,                 //间隔时间

        }
    ]
    // 测试用例执行的任务集合Task 和单个操作Action
    let taskList: Array<Task> = []

    const owner_id = cyfs.ObjectId.from_base_58("5r4MYfFEZc3TMEmprxr1VX334z94ue9PaqVPY27rFSgD").unwrap();
    const dec_id = TEST_DEC_ID;
    const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const object_id = obj.desc().calculate_id();
    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
    const object_raw = obj.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id,
            flags: 0,
            target: cyfs.ObjectId.from_base_58("5aSixgN99LDu76as3TurRCPkeDVKBehav7Cck43LxHE3").unwrap(),
            level: cyfs.NONAPILevel.Router //设置路由类型
        },
        object: new cyfs.NONObjectInfo(object_id, object_raw)
    };
    
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    //cyfs.BuckyError
    console.info('put_object result:', put_ret);
}

/*
async function get_data_chunk(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1)清空缓存目录
    let filePath = path.join(__dirname, "test_cache_file", "source")
    fs.removeSync(filePath)

    //(2)生成测试文件
    let fileSize = 4 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    let fileName = `${RandomGenerator.string(10)}.txt`
    await RandomGenerator.createRandomFile(filePath, fileName, fileSize);
    //(3) 调用接口传输chunK
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transChunksByGetData(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, inputData.opt.NDNoptInfo!.chunkNumber!, inputData.opt.NDNoptInfo!.level!)
    assert(run.err == expect.err, run.log)
    console.info(JSON.stringify(run.download))
    // (4)检查chunk 是否加入cache
    if (stack_type === StackType.Sim) {
        if (run.download && !expect.err) {
            for (let j in run.download!) {
                let chunkPath = path.join(`C:\\cyfs\\data\\zone_simulator\\${getPeerId(inputData.opt.target)}\\named_data_cache\\cache\\chunk`, run.download![j].chunkId)
                console.info(chunkPath)
                if (!fs.pathExistsSync(chunkPath)) {
                    console.info(`${inputData.opt.target} 本地 cache 未缓存 chunk ${run.download![j].chunkId} `)
                } else {
                    console.info(`${inputData.opt.target} 本地 cache 缓存 chunk ${run.download![j].chunkId} 成功`)
                }
            }
        }
    } else {
        // TODO:
    }

}

async function get_data_chunk_second(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1)清空缓存目录
    let filePath = path.join(__dirname, "test_cache_file", "source")
    fs.removeSync(filePath)
    //(2)生成测试文件
    let fileSize = 4 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    let fileName = `${RandomGenerator.string(10)}.txt`
    await RandomGenerator.createRandomFile(filePath, fileName, fileSize);

    //(3) 调用接口传输chunK
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transChunksByGetData(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, inputData.opt.NDNoptInfo!.chunkNumber!, inputData.opt.NDNoptInfo!.level!)
    assert(run.err == expect.err, run.log)
    console.info(JSON.stringify(run.download))
    // (4)检查chunk 是否加入cache
    if (stack_type === StackType.Sim) {
        if (run.download && !expect.err) {
            for (let j in run.download!) {
                let chunkPath = path.join(`C:\\cyfs\\data\\zone_simulator\\${getPeerId(inputData.opt.target)}\\named_data_cache\\cache\\chunk`, run.download![j].chunkId)
                console.info(chunkPath)
                if (!fs.pathExistsSync(chunkPath)) {
                    console.info(`${inputData.opt.target} 本地 cache 未缓存 chunk ${run.download![j].chunkId} `)
                } else {
                    console.info(`${inputData.opt.target} 本地 cache 缓存 chunk ${run.download![j].chunkId} 成功`)
                }
            }
        }
    } else {
        // TODO:
    }

    let run2 = await NDNTestManager.transChunksByGetData(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, inputData.opt.NDNoptInfo!.chunkNumber!, inputData.opt.NDNoptInfo!.level!)
    assert(!run2.err, run2.log)
    console.info(JSON.stringify(run2.download))
    // 检查chunk 是否加入cache
    if (stack_type === StackType.Sim) {
        if (run2.download) {
            for (let j in run2.download!) {
                let chunkPath = path.join(`C:\\cyfs\\data\\zone_simulator\\${getPeerId(inputData!.opt.target)}\\named_data_cache\\cache\\chunk`, run2.download![j].chunkId)
                console.info(chunkPath)
                if (!fs.pathExistsSync(chunkPath)) {
                    console.info(` ${inputData!.opt.target} 本地 cache 未缓存 chunk ${run.download![j].chunkId} `)
                } else {
                    console.info(` ${inputData!.opt.target} 本地 cache 缓存 chunk ${run.download![j].chunkId} 成功`)
                }
                //比较下载时间
                console.info(`第一次下载时间：${run.download![0].time!},第二次下载时间：${run2.download![0].time!}`)
                assert(run.download![0].time! > run2.download![0].time, `chunk第二次下载应该小于第一次下载时间`)
            }
        }
    } else {
        // TODO:
    }

}

async function put_data_chunk(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1)清空缓存目录
    let filePath = path.join(__dirname, "test_cache_file", "source")
    fs.removeSync(filePath)

    //(2)生成测试文件
    let fileSize = 4 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    let fileName = `${RandomGenerator.string(10)}.txt`
    await RandomGenerator.createRandomFile(filePath, fileName, fileSize);

    //(3) 调用接口传输chunK
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transChunksByPutData(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, inputData.opt.NDNoptInfo!.chunkNumber!, inputData.opt.NDNoptInfo!.level!)
    assert(run.err == expect.err, run.log)
    console.info(JSON.stringify(run.download))
    // (4)检查chunk 是否加入cache
    if (stack_type === StackType.Sim) {
        if (run.download && !expect.err) {
            for (let j in run.download!) {
                let chunkPath = path.join(`C:\\cyfs\\data\\zone_simulator\\${getPeerId(inputData.opt.target)}\\named_data_cache\\cache\\chunk`, run.download![j].chunkId)
                console.info(chunkPath)
                if (!fs.pathExistsSync(chunkPath)) {
                    console.info(`${inputData.opt.target} 本地 cache 未缓存 chunk ${run.download![j].chunkId} `)
                } else {
                    console.info(`${inputData.opt.target} 本地 cache 缓存 chunk ${run.download![j].chunkId} 成功`)
                }
            }
        }
    } else {
        // TODO:
    }

}

async function trans_file(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1)清空缓存目录
    let filePath = path.join(__dirname, "test_cache_file", "source")
    fs.removeSync(filePath)

    //(2)生成测试文件
    let fileSize = 4 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    let fileName = `${RandomGenerator.string(10)}.txt`
    await RandomGenerator.createRandomFile(filePath, fileName, fileSize);

    //(3) 调用接口传输chunK
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transFile(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, path.join(__dirname, './test_cache_file/target/', fileName), inputData.opt.NDNoptInfo!.level!);
    assert(run.err == expect.err, run.log)
    console.info(JSON.stringify(run))
    // 检查文件是否下载成功,并且做hash值校验
    if (!run.err) {
        let targetPath = path.join(__dirname, './test_cache_file/target/', fileName);
        let sourcePath = path.join(filePath, fileName);
        assert(fs.pathExistsSync(targetPath), "文件未下载到本地")
        assert(RandomGenerator.compareFileMD5(sourcePath, targetPath), "文件下载后校验MD5值不一致")
    }
}

async function trans_file_second(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1)清空缓存目录
    let filePath = path.join(__dirname, "test_cache_file", "source")
    fs.removeSync(filePath)

    //(2)生成测试文件
    let fileSize = 4 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    let fileName = `${RandomGenerator.string(10)}.txt`
    await RandomGenerator.createRandomFile(filePath, fileName, fileSize);

    //(3) 调用接口传输chunK
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transFile(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, path.join(__dirname, './test_cache_file/target/', fileName), inputData.opt.NDNoptInfo!.level!);
    assert(run.err == expect.err, run.log)
    console.info(JSON.stringify(run))
    // 检查文件是否下载成功,并且做hash值校验
    if (!run.err) {
        let targetPath = path.join(__dirname, './test_cache_file/target/', fileName);
        assert(fs.pathExistsSync(targetPath), "文件未下载到本地")
        assert(RandomGenerator.compareFileMD5(filePath, targetPath), "文件下载后校验MD5值不一致")
    }
    let run2 = await NDNTestManager.transFile(source, target, path.join(filePath, fileName), inputData.opt.NDNoptInfo!.chunkSize!, path.join(__dirname, './test_cache_file/target/', fileName), inputData.opt.NDNoptInfo!.level!);
    assert(run2.err == expect.err, run2.log)
    console.info(JSON.stringify(run2))
    if (!run2.err) {
        let targetPath = path.join(__dirname, './test_cache_file/target2/', fileName);
        assert(fs.pathExistsSync(targetPath), "文件未下载到本地")
        assert(RandomGenerator.compareFileMD5(filePath, targetPath), "文件下载后校验MD5值不一致")

    }
    //比较下载时间
    assert(run.time! > run2.time!, '第二次下载文件时间应该小于第一次下载时间')
}

async function trans_dir(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //创建要测试的文件
    let dirName = `${RandomGenerator.string(10)}`
    let dirPath = path.join(__dirname, "test_cache_file", "source", dirName)
    fs.removeSync(dirPath)

    let targetPath = path.join(__dirname, './test_cache_file/target/', dirName)
    fs.removeSync(targetPath)

    fs.mkdirpSync(targetPath);
    let fileSize = 5 * 1024 * 1024;
    if (inputData.opt.NDNoptInfo!.fileSize) {
        fileSize = inputData.opt.NDNoptInfo!.fileSize!;
    }
    await RandomGenerator.createRandomDir(dirPath, inputData.opt.NDNoptInfo!.dirInfo!.dirNum!, inputData.opt.NDNoptInfo!.dirInfo!.fileNum!, fileSize);
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    let run = await NDNTestManager.transDir(source, target, dirPath, inputData.opt.NDNoptInfo!.chunkSize!, targetPath, inputData.opt.NDNoptInfo!.level!)
    assert.equal(run.err, expect.err, run.log)
}

async function put_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1) put object
    // 创建一个测试对象 
    const owner_id = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const target_id = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const dec_id = TEST_DEC_ID;
    const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const object_id = obj.desc().calculate_id();
    await cyfs.sleep(10000);
    //开始监听是否运行handler 
    let check = handlerManager.startHandlerCheck(10 * 1000);
    console.info(`will put_object: id=${object_id},object value = ${obj.value} `);
    const object_raw = obj.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id,
            flags: 0,
            target: target_id,
            level: inputData.opt.level //设置路由类型
        },
        object: new cyfs.NONObjectInfo(object_id, object_raw)
    };
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    const put_ret = await source.non_service().put_object(req);
    //校验结果
    //cyfs.BuckyError
    console.info('put_object result:', put_ret);
    assert.equal(put_ret.err, expect.err);
    if (put_ret.err) {
        assert.equal(put_ret.val.code, expect.code, "put 失败错误码校验失败")
    }
    //assert.equal(put_ret.val,testcaseList[i].expect.err);
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`put_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err)
}

async function createTestObject(stack: cyfs.SharedCyfsStack, peerId: cyfs.ObjectId) {
    const saveobjectOwner = peerId
    const saveobject = cyfs.TextObject.create(cyfs.Some(saveobjectOwner), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const saveObjectId = saveobject.desc().calculate_id();
    console.info(`will put_object: id=${saveObjectId},object value = ${saveobject.value} `);
    const object_raw = saveobject.to_vec().unwrap();
    const req: cyfs.NONPutObjectOutputRequest = {
        common: {
            dec_id: saveobjectOwner,
            flags: 0,
            level: cyfs.NONAPILevel.NOC //设置路由类型
        },
        object: new cyfs.NONObjectInfo(saveObjectId, object_raw)
    };
    const put_ret = await stack.non_service().put_object(req);
    //校验结果
    console.info('put_object result:', put_ret);
    assert(!put_ret.err);
    return { saveobject, saveObjectId, saveobjectOwner, object_raw }
}

async function get_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1) noc put object
    //创建需要get 的 对象
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const sourcePeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const targetPeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();


    const info = await createTestObject(source, targetPeerId);
    //await cyfs.sleep(2000)
    const dec_id = TEST_DEC_ID;
    //开始监听是否运行handler 
    let check = handlerManager.startHandlerCheck(10 * 1000);

    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id: info.saveObjectId,
        common: {
            req_path: "/qa/get_object",
            level: inputData.opt.level,
            target: targetPeerId,
            dec_id,
            flags: 0,
        }
    };
    const get_ret = await source.non_service().get_object(req1);
    console.info('get_object result:', get_ret);
    assert.equal(get_ret.err, expect.err);
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err, handlerResult.log)
    // 预期结果成功，进行数据校验，和第二次get object handler 触发测试
    if (!expect.err) {
        //检查第一次结果
        const resp_get = get_ret.unwrap();
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(resp_get.object.object_raw).unwrap();
        assert.equal(text.value, info.saveobject.value)
        assert.equal(text.id, info.saveobject.id)
        //执行第二次 需要重置 handler 运行次数
        if (inputData.handlerResetList) {
            await handlerManager.updateHandlerCheckRunSum(inputData.handlerResetList!);
            let check2 = handlerManager.startHandlerCheck(10 * 1000);
            let get_ret2 = await source.non_service().get_object(req1);
            console.info('get_object result:', get_ret2);
            assert.equal(get_ret2.err, expect.err);
            const resp_get2 = get_ret2.unwrap();
            const [text2, buf2] = new cyfs.TextObjectDecoder().raw_decode(resp_get2.object.object_raw).unwrap();
            assert.equal(text2.value, info.saveobject.value);
            assert.equal(text2.id, info.saveobject.id);
            //检查监听事件是否触发
            let handlerResult2 = await check2;
            console.info(`get_object handler 触发结果为:${JSON.stringify(handlerResult2)}`);
            assert(!handlerResult2.err, handlerResult.log);
        }


    }
}

async function select_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {

    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const sourcePeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const targetPeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const dec_id = TEST_DEC_ID;
    //开始监听是否运行handler 
    let check = handlerManager.startHandlerCheck(10 * 1000);

    //select 操作
    //设置默认值
    let filter: cyfs.SelectFilter = {
        obj_type: 41,
        obj_type_code: cyfs.ObjectTypeCode.Custom,
    }
    let opt = {
        page_size: 5,
        page_index: 0
    }
    if (inputData.opt.selectData) {
        filter = JSON.parse(inputData.opt.selectData!.filter)
        opt = {
            page_size: inputData.opt.selectData!.page_size,
            page_index: inputData.opt.selectData!.page_index,
        }
    }
    const req2: cyfs.NONSelectObjectOutputRequest = {
        common: {
            dec_id,
            level: inputData.opt.level,
            flags: 0,
            target: targetPeerId,
        },
        filter,
        opt: {
            page_size: 32,
            page_index: 0
        }
    };
    const select_ret = await source.non_service().select_object(req2);
    console.info('select_object result:', select_ret);
    assert.equal(select_ret.err, expect.err, "select 结果与预期不符");
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`select_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err, handlerResult.log)


}

async function getTestObject(stack: cyfs.SharedCyfsStack, objectId: cyfs.ObjectId) {
    const dec_id = TEST_DEC_ID;
    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id: objectId,
        common: {
            req_path: "/qa/put_object",
            level: cyfs.NONAPILevel.NOC,
            dec_id,
            flags: 0,
        }
    };
    const get_ret = await stack.non_service().get_object(req1);
    console.info('get object result:', get_ret);
    //校验结果
    if (!get_ret.err) {
        const resp_get = get_ret.unwrap();
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(resp_get.object.object_raw).unwrap();
        return { err: get_ret.err, text: text }
    } else {
        return { err: get_ret.err, log: get_ret.val }
    }
}

async function delect_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1) noc put object
    //创建需要get 的 对象
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const sourcePeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const targetPeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const info = await createTestObject(source, targetPeerId)
    const owner_id = sourcePeerId;
    const dec_id = TEST_DEC_ID;

    //开始监听是否运行handler 
    let check = handlerManager.startHandlerCheck(10 * 1000);

    //Delete 操作
    const req4: cyfs.NONDeleteObjectOutputRequest = {
        common: {
            dec_id,
            level: inputData.opt.level,
            flags: 0,
            target: targetPeerId,
        },
        object_id: info.saveObjectId,

    };
    const delete_ret = await source.non_service().delete_object(req4);
    console.info('delete_object result:', delete_ret);

    assert.equal(delete_ret.err, expect.err, "Delete 结果与预期不符");
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`Delete_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err, handlerResult.log)
    // 进行get object  检查机器本地NOC有该object
    if (!expect.err) {
        let getRet = await getTestObject(source, info.saveObjectId)
        console.info(getRet.err)
        assert(getRet.err, "删除object后get_object 不应该获取成功")
    }
}

async function post_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const sourcePeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const targetPeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();


    const info = await createTestObject(source, targetPeerId)
    const owner_id = sourcePeerId;
    const dec_id = TEST_DEC_ID;

    //开始监听是否运行handler 
    let check = handlerManager.startHandlerCheck(10 * 1000);

    //Post 操作
    const req1: cyfs.NONPostObjectOutputRequest = {

        object: cyfs.NONObjectInfo.new_from_object_raw(info.object_raw).unwrap(),//info.saveObjectId,
        common: {
            //req_path: "/qa/put_object",
            level: cyfs.NONAPILevel.Router,
            target: targetPeerId,
            dec_id,
            flags: 0,
        }
    };
    //post 只校验handler触发
    const post_ret = await source.non_service().post_object(req1);
    console.info('post_object result:', post_ret);
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`Post_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err, handlerResult.log)
}

async function sign_verify_object(inputData: InputInfo, expect: ResultInfo, stack_type: StackType) {
    //(1) put object
    // 创建一个测试对象 
    let source =  stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.source) : stack;
    let target = stack_type === StackType.Sim ? ZoneSimulator.getStackByName(inputData.opt.target).local_device_id().object_id : cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const sourcePeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.source)).unwrap() : 
    cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();

    const targetPeerId = stack_type === StackType.Sim ? cyfs.ObjectId.from_base_58(ZoneSimulator.getPeerIdByName(inputData.opt.target)).unwrap():
    cyfs.ObjectId.from_str(inputData.opt.target).unwrap();

    const owner_id = sourcePeerId;
    const dec_id = TEST_DEC_ID;
    console.log(`new app id: ${dec_id}`);
    const obj = cyfs.TextObject.create(cyfs.Some(owner_id), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
    const object_id = obj.desc().calculate_id();
    //(2) 添加测试handler 设置的 handler

    let check = handlerManager.startHandlerCheck(10 * 1000);
    // 对对象进行签名
    console.info(`will sign object: id=${object_id},object value = ${obj.value} `);
    const crypto = source.crypto();
    const resp = (await crypto.sign_object({
        common: { flags: 0 },
        object: new cyfs.NONObjectInfo(obj.desc().calculate_id(), obj.encode_to_buf().unwrap()),
        flags: cyfs.CRYPTO_REQUEST_FLAG_SIGN_BY_DEVICE | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_DESC | cyfs.CRYPTO_REQUEST_FLAG_SIGN_SET_BODY
    })).unwrap();

    assert(resp.result === cyfs.SignObjectResult.Signed, "check sign result failed");

    const signed_obj = new cyfs.TextObjectDecoder().from_raw(resp.object!.object_raw).unwrap();
    assert(signed_obj.signs().desc_signs().unwrap().length === 1, "check desc signs failed");
    assert(signed_obj.signs().body_signs().unwrap().length === 1, "check body signs failed");
    console.log("test sign object success");
    //校验对象签名
    {
        const resp2 = (await crypto.verify_object({
            common: { flags: 0 },
            sign_type: cyfs.VerifySignType.Both,
            object: resp.object!,
            sign_object: cyfs.VerifyObjectType.Owner()
        })).unwrap();

        assert(resp2.result.valid, "check verify result failed")

        console.log("test verify object by owner success");
    }

    {
        const resp2 = (await crypto.verify_object({
            common: { flags: 0 },
            sign_type: cyfs.VerifySignType.Both,
            object: resp.object!,
            sign_object: cyfs.VerifyObjectType.Object({ object_id: owner_id })
        })).unwrap();

        assert(resp2.result.valid, "check verify result failed")

        console.log("test verify object by object success");
    }
    //检查监听事件是否触发
    let handlerResult = await check
    console.info(`sign_object handler 触发结果为:${JSON.stringify(handlerResult)}`);
    assert(!handlerResult.err)
}

*/
