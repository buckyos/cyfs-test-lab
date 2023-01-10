import assert = require('assert');
import * as cyfs from '../../../cyfs'

import {StackManager,CyfsDriverType} from "../../../cyfs-driver-client"
import { sleep } from '../../../base';
import path = require('path');
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

let logger : any;

describe("CYFS Stack NDN Trans 冒烟测试", function () {
    this.timeout(0);
    const stack_manager = new StackManager(CyfsDriverType.simulator);
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http,dec_app_1);
        logger = stack_manager.get_logger();
        logger.info(`##########用例执开始执行`);
        // 所有节点 实例化一个 WebSocket Requestor dec_app_2 协议栈
        //await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket,dec_app_2);
        
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        //await sleep(10*1000)
        await stack_manager.driver!.stop();
    })
    describe("Trans 模块", function () {

        describe("CYFS Stack NDN group context 冒烟测试", function () {
            it("简单业务流程测试-无group context",async()=>{
                let stack1 = stack_manager.get_cyfs_satck({peer_name :"zone1_ood",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                let stack2 = stack_manager.get_cyfs_satck({peer_name :"zone1_device1",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                let stack1_tool = stack_manager.driver!.get_client("zone1_ood").client!.get_util_tool();
                let stack2_tool = stack_manager.driver!.get_client("zone1_device1").client!.get_util_tool();
                logger.info(`stack1 : ${stack1.local_device_id().object_id.to_base_58()}`)
                logger.info(`stack2 : ${stack2.local_device_id().object_id.to_base_58()}`)
                let local_file = await stack2_tool.create_file(10*1024*1024);
                logger.info(`local_file : ${JSON.stringify(local_file)}`);
                // 发布文件
                let info1 = await stack2.trans().publish_file({
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDC,             
                        flags: 1,
                    },
                    // 文件所属者
                    owner: stack2.local_device_id().object_id,
                    // 文件的本地路径
                    local_path: local_file.file_path!,
                    // chunk大小
                    chunk_size: 4*1024*1024,
                });
                logger.info(`publish_file : ${info1.unwrap().file_id.to_base_58()}`);
                // 发送文件对象
                let info_non_get = await stack2.non_service().get_object({
                    common:{
                        // api级别
                        level: cyfs.NONAPILevel.NOC,
                        flags: 1,
                    },
                    object_id: info1.unwrap().file_id,
                    
                })
                logger.info(`info_non_get : ${ JSON.stringify(info_non_get.unwrap())}`);
                let info_non_put =await stack2.non_service().put_object({
                    common: {                    
                        // api级别
                        level: cyfs.NONAPILevel.NON,
                    
                        // 用以处理默认行为
                        target: stack1.local_device_id().object_id,
                    
                        flags: 1,
                    },
                    object: info_non_get.unwrap().object,
                
                })
                logger.info(`info_non_put : ${ JSON.stringify(info_non_put.unwrap())}`);
                let info2 = await stack1.trans().create_task( {
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDN,             
                        flags: 1,
                    },
                    object_id: info1.unwrap().file_id,
                
                    // 保存到的本地目录or文件
                    local_path: path.join((await stack1_tool.get_cache_path()).cache_path!.file_download,local_file.file_name!),
                
                    // 源设备(hub)列表
                    device_list: [stack2.local_device_id()],
                    auto_start: true
                })
                logger.info(`create_task : ${JSON.stringify(info2)}`);
                //await stack1.trans().get_context()
                while (true){
                    let info_check = await stack1.trans().get_task_state({
                        common:  {
                            // api级别
                            level: cyfs.NDNAPILevel.NDN,             
                            flags: 1,
                        },
                    
                        task_id: info2.unwrap().task_id,
                    });
                    logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
                    if(info_check.unwrap().state == cyfs.TransTaskState.Finished || info_check.unwrap().state == cyfs.TransTaskState.Err){
                        break;
                    }
                    await sleep(1000); 
                };
            })
            it("简单业务流程测试-group context",async()=>{
                let stack1 = stack_manager.get_cyfs_satck({peer_name :"zone1_ood",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                let stack2 = stack_manager.get_cyfs_satck({peer_name :"zone1_device1",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                let stack1_tool = stack_manager.driver!.get_client("zone1_ood").client!.get_util_tool();
                let stack2_tool = stack_manager.driver!.get_client("zone1_device1").client!.get_util_tool();
                logger.info(`stack1 : ${stack1.local_device_id().object_id.to_base_58()}`)
                logger.info(`stack2 : ${stack2.local_device_id().object_id.to_base_58()}`)
                let local_file = await stack2_tool.create_file(10*1024*1024);
                logger.info(`local_file : ${JSON.stringify(local_file)}`);
                // 发布文件
                let info1 = await stack2.trans().publish_file({
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDC,             
                        flags: 1,
                    },
                    // 文件所属者
                    owner: stack2.local_device_id().object_id,
                    // 文件的本地路径
                    local_path: local_file.file_path!,
                    // chunk大小
                    chunk_size: 4*1024*1024,
                });
                logger.info(`publish_file : ${info1.unwrap().file_id.to_base_58()}`);
                // 发送文件对象
                let info_non_get = await stack2.non_service().get_object({
                    common:{
                        // api级别
                        level: cyfs.NONAPILevel.NOC,
                        flags: 1,
                    },
                    object_id: info1.unwrap().file_id,
                    
                })
                logger.info(`info_non_get : ${ JSON.stringify(info_non_get.unwrap())}`);
                let info_non_put =await stack2.non_service().put_object({
                    common: {                    
                        // api级别
                        level: cyfs.NONAPILevel.NON,
                    
                        // 用以处理默认行为
                        target: stack1.local_device_id().object_id,
                    
                        flags: 1,
                    },
                    object: info_non_get.unwrap().object,
                
                })
                logger.info(`info_non_put : ${ JSON.stringify(info_non_put.unwrap())}`);
                let context = cyfs.TransContext.new(dec_app_1,'/smoke_test')
                logger.info(`context ${context.desc().calculate_id().to_base_58()}`)
                context.body_expect().content().device_list.push( new cyfs.TransContextDevice(stack2.local_device_id(),cyfs.ChunkCodecDesc.Stream()));
                logger.info(`${JSON.stringify(context.device_list())}`)
                let info_context = await stack1.trans().put_context({
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDN,             
                        flags: 1,
                    },
                    context:context,
                    access : cyfs.AccessString.full()

                });
                logger.info(`put_context err =  ${ JSON.stringify(info_context.err)}`);
                let info2 = await stack1.trans().create_task( {
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDN,             
                        flags: 1,
                    },
                    object_id: info1.unwrap().file_id,
                
                    // 保存到的本地目录or文件
                    local_path: path.join((await stack1_tool.get_cache_path()).cache_path!.file_download,local_file.file_name!),
                
                    // 源设备(hub)列表
                    device_list: [stack2.local_device_id()],
                    group : `/smoke_test`,
                    context : `/smoke_test`,
                    auto_start: true
                })
                logger.info(`create_task : ${JSON.stringify(info2)}`);
                while (true){
                    let info_check = await stack1.trans().get_task_state({
                        common:  {
                            // api级别
                            level: cyfs.NDNAPILevel.NDN,             
                            flags: 1,
                        },
                    
                        task_id: info2.unwrap().task_id,
                    });
                    logger.info(`get_task_state : ${JSON.stringify(info_check)}`);
                    if(info_check.unwrap().state == cyfs.TransTaskState.Finished || info_check.unwrap().state == cyfs.TransTaskState.Err){
                        break;
                    }
                    await sleep(1000); 
                };
            })
        })
        
    })
    describe("NDN 模块接口业务流程测试", function (){

        describe("NDN 模块-put_data 流程", function () {
            it("同zone Runtime->OOD put_data chunk流程",async()=>{
                let stack1 = stack_manager.get_cyfs_satck({peer_name :"zone1_ood",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                let stack2 = stack_manager.get_cyfs_satck({peer_name :"zone1_device1",dec_id:dec_app_1.to_base_58(),type:cyfs.CyfsStackRequestorType.Http}).stack!;
                logger.info(`stack1 : ${stack1.local_device_id().object_id.to_base_58()}`)
                logger.info(`stack2 : ${stack2.local_device_id().object_id.to_base_58()}`)
                let stack1_client = stack_manager.driver!.get_client("zone1_ood")
                let stack2_client = stack_manager.driver!.get_client("zone1_device1")
                logger.info(`${JSON.stringify(stack1_client.log)}${JSON.stringify(stack2_client.log)}`)

                let chunk_info = await stack1_client.client!.get_util_tool().rand_cyfs_chunk_cache(4*1024*1024);

                let info1 = await stack2.ndn_service().put_data({
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.NDN,
                        // 用以处理默认行为
                        target: stack1.local_device_id().object_id,
                        flags: 1,
                    },
                    object_id: chunk_info.chunk_id.calculate_id(),
                    length: 4*1024*1024,
                    data: chunk_info.chunk_data,
                });
                logger.info(`${JSON.stringify(info1)}`)
            })
            it("跨zone OOD->OOD put_data 流程",async()=>{

            })
        })
        describe("NDN 模块-get_data 流程", function () {
            it("同zone Runtime->OOD get_data 流程",async()=>{

            })
            it("跨zone OOD->OOD get_data 流程",async()=>{

            })
        })
        describe("NDN 模块-put_shared_data 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })
        describe("NDN 模块-get_shared_data 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })
        describe("NDN 模块-delete_data 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })
        describe("NDN 模块-query_file 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })
    })
    describe("NDN 模块 context group 业务流程测试", function (){
        describe("NDN 模块-get_data 流程", function () {
            it("同zone Runtime->OOD get_data 流程",async()=>{

            })
            it("跨zone OOD->OOD get_data 流程",async()=>{

            })
        })

        describe("NDN 模块-get_shared_data 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })

        describe("NDN 模块-query_file 流程", function () {
            it("同zone Runtime->OOD put_shared_data 流程",async()=>{

            })
            it("跨zone OOD->OOD put_shared_data 流程",async()=>{

            })
        })
    })
})