import assert = require('assert');
import * as cyfs from '../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../cyfs-driver-client"
import { RandomGenerator, sleep } from '../../../base';
import path = require('path');

import * as action_api from "../../../common_action"

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register

describe("CYFS Stack Tans 模块测试", function () {
    this.timeout(0);
    const stack_manager = StackManager.createInstance(CyfsDriverType.simulator);
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        await stack_manager.init();
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        stack_manager.logger!.info(`##########用例执开始执行`);
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        //await sleep(10*1000)
        await stack_manager.driver!.stop();
    })
    describe("Trans 模块接口测试", function () {
        describe("get_context 接口", function () {
            it("get_context 接口-传入必填参数-通过context_id获取", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path: `/test_context/${RandomGenerator.string(10)}`,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_id : input.context!.desc().calculate_id(),
                });
                assert.equal(info_context.err ,false,`${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("get_context 接口-传入必填参数-通过context_path获取", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let  context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path,
                });
                assert.equal(info_context.err ,false,`${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("get_context 接口-传入所有参数", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let  context_path = `/test_context/${RandomGenerator.string(10)}`;
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        //req_path : 
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                    context_path,
                    context_id : input.context!.desc().calculate_id(),
                });
                assert.equal(info_context.err ,false,`${info_context.toString()}`);
                stack_manager.logger!.info(`get context success : ${info_context.unwrap().context.calculate_id()}`);
            })
            it("异常用例-get_context 接口-传入必填参数，校验context_id 和context_path必须二选一", async () => {
                // 连接测试协议栈
                let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                // 构造前置操作
                let input = await action_api.PutContextAction.put_noc_random_context(
                    {
                        context_path: `/test_context/${RandomGenerator.string(10)}`,
                        chunk_codec_desc: cyfs.ChunkCodecDesc.Stream(),
                        deviceid_list: deviceid_list
                    },
                    zone1_device1,
                    stack_manager.logger!
                );
                // 测试 get_context 接口
                let info_context = await zone1_device1_stack.trans().get_context({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 1,
                    },
                });
                // 预期失败
                assert.equal(info_context.err ,true,`${info_context.toString()}`);
            })
            it("异常用例-get_context 接口- context_id 本地NOC 不存在context", async () => {})
            it("异常用例-get_context 接口- context_path 本地NOC 不存在context", async () => {})
            it("异常用例-get_context 接口- 同时输入context_id/context_path,context_id 存在,context_path不存在", async () => {})
            it("异常用例-get_context 接口- 同时输入context_id/context_path,context_id 不存在,context_path存在", async () => {})
            describe("get_context 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC 获取",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 从 OOD 获取",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 从 OOD2 获取",async()=>{})
            })
        })
        describe("put_context 接口", function () {
            it("put_context 接口-传入必填参数", async () => {
                 // 连接测试协议栈
                 let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                 let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                 let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                 let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                 // 构造测试数据
                 let  context_path = `/test_context/${RandomGenerator.string(10)}`;
                 let context = cyfs.TransContext.new(dec_app_1, context_path);
                 stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                 let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                 for (let device of deviceid_list) {
                     context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                 }
                 // 发送请求
                 stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                 let info_context = await zone1_ood_satck.trans().put_context({
                     common: {
                         level: cyfs.NDNAPILevel.NDC,
                         flags: 1,
                     },
                     context: context,
                     //access: cyfs.AccessString.full()
         
                 });
                 
                 assert.equal(info_context.err ,false,`${info_context.toString()}`);
                 stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
            })
            it("put_context 接口-传入所有参数", async () => {
                 // 连接测试协议栈
                 let zone1_ood = { peer_name: "zone1_ood", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http };
                 let zone1_device1 ={ peer_name: "zone1_device1", dec_id: dec_app_1.to_base_58(), type: cyfs.CyfsStackRequestorType.Http }
                 let zone1_ood_satck = stack_manager.get_cyfs_satck(zone1_ood).stack!;
                 let zone1_device1_stack = stack_manager.get_cyfs_satck(zone1_device1).stack!;
                 // 构造测试数据
                 let  context_path = `/test_context/${RandomGenerator.string(10)}`;
                 let context = cyfs.TransContext.new(dec_app_1, context_path);
                 stack_manager.logger!.info(`create context ${context.desc().calculate_id().to_base_58()}`);
                 let deviceid_list = [zone1_ood_satck.local_device_id(),zone1_device1_stack.local_device_id()];
                 for (let device of deviceid_list) {
                     context.body_expect().content().device_list.push(new cyfs.TransContextDevice(device, cyfs.ChunkCodecDesc.Stream()));
                 }
                 // 发送请求
                 stack_manager.logger!.info(`${JSON.stringify(context.device_list())}`)
                 let info_context = await zone1_ood_satck.trans().put_context({
                     common: {
                         level: cyfs.NDNAPILevel.NDC,
                         flags: 1,
                     },
                     context: context,
                     access: cyfs.AccessString.full()
         
                 });
                 assert.equal(info_context.err ,false,`${info_context.toString()}`);
                 stack_manager.logger!.info(`put_context  =  ${JSON.stringify(info_context.unwrap())}`);
            })
            it("put_context 接口-同一context_path 进行两次put 不同 context进行覆盖操作", async () => {})
            it("put_context 接口-同一context_id 挂载不同context_path成功 ", async () => {})
            it("put_context 接口-同一context_id,通过put_context 更新deviceid_list", async () => {})
            describe("put_context 接口-验证TransContext 对象编解码", async () => {
                it("deviceid_list 设置为空",async()=>{})
                it("deviceid_list ChunkCodecDesc 设置为Stream",async()=>{})
                it("deviceid_list ChunkCodecDesc 设置为Unknown",async()=>{})
                it("deviceid_list ChunkCodecDesc 设置为Raptor",async()=>{})
                it("deviceid_list ChunkCodecDesc 设置为Stream/Raptor/Unknown 混合",async()=>{})
            })
            describe("put_context 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC put",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("publish_file 接口", function () {
            it("publish_file 接口-传入必填参数", async () => {
                
            })
            it("publish_file 接口-传入所有参数", async () => {
                
            })
            it("publish_file 接口-上传文件夹", async () => {
                
            })
            it("publish_file 接口-通过设置file_id上传文件", async () => {
                
            })
            it("publish_file 接口-通过设置dir关联对象", async () => {
                
            })
            describe("publish_file 接口对chunksize 的边界值进行校验", async () => {
                it("最小值-1",async()=>{})
                it("最小值",async()=>{})
                it("最小值+1",async()=>{})
                it("100MB",async()=>{})
                it("1GB",async()=>{})
            })
            it("publish_file 接口-local_path 本地文件路径不存在", async () => {
                
            })
            describe("publish_file 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC 上传文件",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD 上传文件",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2 上传文件",async()=>{})
            })
        })
        
        describe("create_task 接口", function () {
            it("create_task 接口-传入必填参数", async () => {
                
            })
            it("create_task 接口-传入所有参数", async () => {
                
            })
            it("create_task 接口-指定local_path本地文件不存在,自动创建路径", async () => {
                
            })
            it("create_task 接口-指定context本地NOC中不存在", async () => {
                
            })
            it("create_task 接口-指定object_id 本地NOC中不存在", async () => {
                
            })
            
            it("create_task 接口-指定device_list,context不存在device_list", async () => {

            })
            it("create_task 接口-指定device_list不存在文件", async () => {

            })
            it("create_task 接口-不指定device_list,context存在device_list", async () => {

            })
            describe("create_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        /**
         * TransTaskState {
            Pending,
            Downloading(TransTaskOnAirState),
            Paused,
            Canceled,
            Finished(u32 upload_speed),
            Err(BuckyErrorCode),
        }
         */
        describe("start_task 接口", function () {
            it("start_task 接口-传入必填参数", async () => {
                
            })
            it("start_task 接口-传入所有参数", async () => {
                
            })
            it("start_task 接口-task_id 不存在", async () => {
                
            })
            describe("start_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("stop_task 接口", function () {
            it("stop_task 接口-传入必填参数", async () => {
                
            })
            it("stop_task 接口-传入所有参数", async () => {
                
            })
            it("stop_task 接口-task_id 不存在", async () => {
                
            })
            describe("stop_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("delete_task 接口", function () {
            it("delete_task 接口-传入必填参数", async () => {
                
            })
            it("delete_task 接口-传入所有参数", async () => {
                
            })
            it("delete_task 接口-task_id 不存在", async () => {
                
            })
            describe("delete_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("control_task 接口（start/stop/delete 实际调用的都是control_task）", function () {
            it("control_task 接口-传入必填参数", async () => {
                
            })
            it("control_task 接口-传入所有参数", async () => {
                
            })
            it("control_task 接口-task_id 不存在", async () => {
                
            })
            describe("control_task 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("get_task_state 接口", function () {
            it("get_task_state 接口-传入必填参数", async () => {
                
            })
            it("get_task_state 接口-传入所有参数", async () => {
                
            })
            describe("get_task_state 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("query_tasks 接口", function () {
            it("query_tasks 接口-传入必填参数", async () => {
                
            })
            it("query_tasks 接口-传入所有参数", async () => {
                
            })
            describe("query_tasks 接口-通过range分页查询", async () => {
                
            })
            describe("query_tasks 接口-通过task_status查询指定状态", async () => {
                
            })
            describe("query_tasks 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("get_task_group_state",function (){
            it("get_task_group_state 接口-传入必填参数", async () => {
                
            })
            it("get_task_group_state 接口-传入所有参数", async () => {
                
            })
            it("get_task_group_state 接口-group 路径不存在", async () => {
                
            })
            it("get_task_group_state 接口-设置speed_when 获取两次调用之间的平均速度", async () => {
                
            })
            describe("get_task_group_state 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("control_task_group",function (){
            it("control_task_group 接口-传入必填参数", async () => {
                
            })
            it("control_task_group 接口-传入所有参数", async () => {
                
            })
            it("control_task_group 接口-group 路径不存在", async () => {
                
            })
            describe("control_task_group 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
    })
})