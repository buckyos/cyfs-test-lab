import assert = require('assert');
import * as cyfs from '../../../../../cyfs'

import { StackManager, CyfsDriverType } from "../../../../../cyfs-driver-client"
import { RandomGenerator, sleep } from '../../../../../base';
import path = require('path');
import * as action_api from "../../../../../common_action"

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register

describe("CYFS Stack NDN 模块测试", function () {
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
    describe("NDN 模块接口测试", function () {
        describe("put_data 接口",async()=>{
            /**
             * 只能进行本地NDC 操作
             */
            it("put_data 接口-传入必填参数", async () => {})
            it("put_data 接口-传入全部参数", async () => {})
            it("put_data 接口-传输chunk", async () => {})
            it("put_data 接口-传输File", async () => {})
            describe("put_data 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("异常用例-NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("异常用例-NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("get_data 接口",async()=>{
            it("get_data 接口-传入必填参数", async () => {})
            it("get_data 接口-传入全部参数", async () => {})
            it("get_data 接口-通过object_id获取chunk", async () => {})
            it("get_data 接口-通过object_id获取File", async () => {})
            it("get_data 接口-通过object_id + range 获取chunk部分内容", async () => {})
            it("get_data 接口-通过object_id+ range获取File部分内容", async () => {})
            it("get_data 接口-通过object_id（Dir）+inner_path 获取文件", async () => {})
            describe("put_data 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("put_shared_data 接口",async()=>{
            /**
             * 只能进行本地NDC 操作
             */
            it("put_shared_data 接口-传入必填参数", async () => {})
            it("put_shared_data 接口-传入全部参数", async () => {})
            it("put_shared_data 接口-传输chunk", async () => {})
            it("put_shared_data 接口-传输File", async () => {})
            describe("put_shared_data 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("get_shared_data 接口",async()=>{
            it("get_shared_data 接口-传入必填参数", async () => {})
            it("get_shared_data 接口-传入全部参数", async () => {})
            it("get_shared_data 接口-通过object_id获取chunk", async () => {})
            it("get_shared_data 接口-通过object_id获取File", async () => {})
            it("get_shared_data 接口-通过object_id + range 获取chunk部分内容", async () => {})
            it("get_shared_data 接口-通过object_id+ range获取File部分内容", async () => {})
            it("get_shared_data 接口-通过object_id（Dir）+inner_path 获取文件", async () => {})
            describe("get_shared_data 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("delete_data 接口",async()=>{
            /**
             * 只能进行本地NDC 操作
             */
            it("delete_data 接口-传入必填参数", async () => {})
            it("delete_data 接口-传入全部参数", async () => {})
            it("delete_data 接口-通过object_id删除chunk", async () => {})
            it("delete_data 接口-通过object_id删除File", async () => {})
            it("delete_data 接口-通过object_id（Dir）+inner_path 删除文件", async () => {})
            describe("delete_data 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
        describe("query_file 接口",async()=>{
            it("query_file 接口-传入必填参数", async () => {})
            it("query_file 接口-传入全部参数", async () => {})
            /**
             *  file_id?: ObjectId,
                hash?: HashValue,
                quick_hash?: string,
                chunk_id?: ChunkId,
             */
            it("query_file 接口-通过file_id查询", async () => {})
            it("query_file 接口-通过hash查询", async () => {})
            it("query_file 接口-通过quick_hash查询", async () => {})
            it("query_file 接口-通过chunk_id查询", async () => {})
            describe("query_file 接口-sdk 输入类型和数据不一致", async () => {})
            describe("query_file 接口-查询数据本地NDC中不存在", async () => {})
            describe("query_file 接口-NDNOutputRequestCommon 参数验证", async () => {
                it("NDNOutputRequestCommon 验证本地NDC",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 同Zone device1 -> OOD",async()=>{})
                it("NDNOutputRequestCommon 验证NDN 跨Zone OOD1 -> OOD2",async()=>{})
            })
        })
    })
})