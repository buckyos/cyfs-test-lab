"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const cyfs = __importStar(require("../../../cyfs"));
const cyfs_driver_client_1 = require("../../../cyfs-driver-client");
const common_1 = require("../../../common");
const path = require("path");
const addContext = __importStar(require("mochawesome/addContext"));
const action_api = __importStar(require("../../../dec-app-action"));
const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp");
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp");
//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing
//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_trans_scenario.ts --reporter mochawesome --require ts-node/register
async function addDir(source, target, stack_manager, fileSize, chunkSize, level, mount, control_object, access, putdata, mixchar) {
    let test_file;
    let file_path;
    let file_name;
    let task_id;
    let ood = await stack_manager.get_cyfs_satck({
        peer_name: "zone4_ood",
        dec_id: dec_app_1.to_base_58(),
        type: cyfs.CyfsStackRequestorType.Http
    });
    let stack = ood.stack;
    // 获取测试驱动中的工具类
    let file_source_tool = stack_manager.driver.get_client("zone4_ood").client.get_util_tool();
    // 创建测试文件
    let local_file = await file_source_tool.create_file(100 * 1024 * 1024);
    file_name = local_file.file_name;
    file_path = local_file.file_path;
    let info = await stack.trans().publish_file({
        common: {
            // api级别
            dec_id: stack.dec_id,
            req_path: "qaTest",
            level: cyfs.NDNAPILevel.NDC,
            referer_object: [],
            flags: 1,
        },
        owner: stack.local_device().desc().owner(),
        local_path: file_path,
        chunk_size: 10 * 1024 * 1024,
        access: cyfs.AccessString.full()
    });
    assert(!info.err, `publish_file 失败`);
    test_file = info.unwrap().file_id;
    stack_manager.logger.info(`put_context  =  ${JSON.stringify(info.unwrap())}`);
    let pub_resp = info.unwrap();
    let object_map_id = cyfs.ObjectMapId.try_from_object_id(pub_resp.file_id).unwrap();
    //2. source 设备根据objectmap获取fileid和chunkid
    let file_id_from_objectmap;
    let chunkIdList;
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: object_map_id.object_id,
            inner_path: file_name
        };
        let getores = await source.non_service().get_object(getoreq);
        assert(!getores.err, `get_object 获取dir对象失败`);
        let get_resp = getores.unwrap();
        //file_id_from_objectmap = cyfs.FileId.try_from_object_id(get_resp.object.object_id).unwrap()
        const [file, buf] = new cyfs.FileDecoder().raw_decode(get_resp.object.object_raw).unwrap();
        chunkIdList = file.body_expect().content().inner_chunk_list();
    }
    //根据objectmap 获取dirid
    let dresp;
    {
        let req = {
            common: {
                flags: 0
            },
            object_map_id: object_map_id.object_id,
            dir_type: cyfs.BuildDirType.Zip
        };
        let resp = await source.util().build_dir_from_object_map(req);
        dresp = resp.unwrap();
    }
    let dir_id = cyfs.DirId.try_from_object_id(dresp.object_id).unwrap();
    //获取dir对象
    let respd;
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: dir_id.object_id,
            inner_path: undefined
        };
        let getores = await source.non_service().get_object(getoreq);
        assert(!getores.err, `get_object 获取dir对象失败`);
        respd = getores.unwrap();
    }
    //根据dir_id 获取fileid
    let respf;
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: dir_id.object_id,
            inner_path: file_name
        };
        let getores = await source.non_service().get_object(getoreq);
        assert(!getores.err, `get_object 获取dir对象失败`);
        respf = getores.unwrap();
    }
    let file_id = cyfs.FileId.try_from_object_id(respf.object.object_id).unwrap();
    console.info(`————————————————————————————————————>file ${file_id} >dir ${dir_id} >innerpath ${file_name} >chunkidList ${chunkIdList}`);
    let req_path = "no need";
    if (mount) {
        //注册req_path
        let mount_value;
        if (mount == "mount-dir") {
            mount_value = dir_id.object_id;
        }
        else if (mount == "mount-chunk") {
            mount_value = chunkIdList[0].calculate_id();
        }
        else if (mount == "mount-file") {
            mount_value = file_id.object_id;
        }
        else {
            console.error("--------------> mount param must be mount-dir|mount-chunk|mount-file ");
        }
        let reqpath = "/test_nDn";
        let stub = source.root_state_stub(source.local_device_id().object_id, source.dec_id);
        let op_env = (await stub.create_path_op_env()).unwrap();
        console.log(`___________+===============mountvalue: ${mount_value}`);
        await op_env.set_with_path(reqpath, mount_value, undefined, true);
        let o = (await op_env.commit()).unwrap();
        req_path = new cyfs.RequestGlobalStatePath(target.dec_id, reqpath).toString();
        console.log("------------------------> " + req_path);
    }
    if (access && control_object) {
        // source 设备 将dir map对象put 到 targrt 设备
        let type;
        switch (control_object) {
            case "chunk":
                //获取chunk对象
                let rep2 = {
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.Router,
                        // targrt设备参数
                        target: target.local_device_id().object_id,
                        // 需要处理数据的关联对象，主要用以chunk/file等
                        referer_object: [],
                        flags: 1,
                    },
                    object_id: chunkIdList[0].calculate_id()
                };
                //调用接口
                let resp = await source.ndn_service().get_data(rep2);
                assert(!resp.err, `get_data 传输chunk失败`);
                let respc = resp.unwrap();
                type = new cyfs.NONObjectInfo(respc.object_id, respc.data);
            case "file":
                type = respf.object;
                break;
            case "dir":
                type = respd.object;
            default: console.warn("暂不支持其他类型");
        }
        await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: type,
            access: access
        });
    }
    return { file_id, dir_id, file_name, chunkIdList, req_path };
}
describe("CYFS Stack 磁盘满后noc、ndc、tracker读写测试", function () {
    this.timeout(0);
    const stack_manager = cyfs_driver_client_1.StackManager.createInstance(cyfs_driver_client_1.CyfsDriverType.other, [{
            peer_name: "zone4_ood",
            zone_tag: "zone1",
            stack_type: "ood",
            bdt_port: 30001,
            http_port: 31000,
            ws_port: 31001,
            ood_daemon_status_port: 32001,
        }]);
    let logger;
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        let make_dirver = await stack_manager.init();
        logger = stack_manager.logger;
        await common_1.sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
        logger.info(`############用例执开始执行`);
    });
    this.afterAll(async () => {
        // 停止测试模拟器
        stack_manager.destory();
        // 停止测试驱动
        await stack_manager.driver.stop();
        // 保存测试记录
        data_manager.save_history_to_file(logger.dir());
    });
    let report_result;
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${common_1.RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        logger.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`);
    });
    afterEach(function () {
        // 将当前用例执行记录到history
        let current_actions = data_manager.report_current_actions();
        logger.info(`########### ${current_actions.testcase_id} 运行结束`);
        report_result = {
            title: `用例: ${current_actions.testcase_id}`,
            value: current_actions.action_list
        };
        addContext.default(this, report_result);
    });
    describe(`验证磁盘写满请求: NON 数据写入读取`, async () => {
        let context_id;
        it(`put_object`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            let context_cache = cyfs.TransContext.new(dec_app_1, "/context_path");
            context_id = context_cache.desc().calculate_id();
            let raw = context_cache.to_vec().unwrap();
            let chunk_codec_desc = cyfs.ChunkCodecDesc.Stream();
            let device_id = stack.local_device_id();
            context_cache.body_expect().content().device_list.push(new cyfs.TransContextDevice(device_id, chunk_codec_desc));
            const put_req = {
                common: {
                    req_path: undefined,
                    dec_id: stack.dec_id,
                    flags: 0,
                    target: stack.local_device_id().object_id,
                    level: cyfs.NONAPILevel.Router //设置路由类型
                },
                object: new cyfs.NONObjectInfo(context_id, raw),
                access: cyfs.AccessString.default()
            };
            const put_ret = await stack.non_service().put_object(put_req);
            assert(!put_ret.err, `put object failed,err : ${JSON.stringify(put_ret)}`);
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=get object need param objectid is ${context_id}`);
        });
        it(`get_object`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            // get
            const get_req = {
                object_id: cyfs.ObjectId.from_base_58("9cfBkPtPgpnVMvQ7BVhFrchHu48J9qQwmrpyc3H4qUv3").unwrap(),
                common: {
                    req_path: undefined,
                    level: cyfs.NONAPILevel.Router,
                    target: stack.local_device_id().object_id,
                    dec_id: stack.dec_id,
                    flags: 0,
                }
            };
            const get_ret = await stack.non_service().get_object(get_req);
            console.info('get_object result:', get_ret);
            assert(!get_ret.err);
        });
    });
    describe(`验证磁盘写满请求: NDN 数据写入读取`, async () => {
        let chunkId;
        it(`put_data`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            let randomStr = common_1.RandomGenerator.string(10 * 1024 * 1024);
            console.log("-_----------------------------->" + Buffer.byteLength(randomStr));
            var arr = [];
            for (var i = 0, j = randomStr.length; i < j; ++i) {
                arr.push(randomStr.charCodeAt(i));
            }
            let uint8Array = new Uint8Array(arr);
            chunkId = cyfs.ChunkId.calculate(uint8Array);
            console.info(`测试随机的chunkId 为：${chunkId}`);
            let rep = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: stack.dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数目前无用
                    target: stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.desc().calculate_id(),
                length: uint8Array.length,
                data: uint8Array,
            };
            //调用接口
            let resp = await stack.ndn_service().put_data(rep);
            assert(!resp.err, `put_data 传输chunk失败 ${resp}`);
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= get data need param chunkId is ${chunkId}`);
        });
        it(`getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            let rep2 = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: undefined,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: cyfs.ObjectId.from_base_58("7C8Wbq3kgz66ES1aCFiux5Y9goUjUMiVHJ3ErRZbcnDq").unwrap(),
                inner_path: undefined,
            };
            //调用接口
            let resp = await stack.ndn_service().get_data(rep2);
            console.info(`${resp}`);
            assert(!resp.err, `get_data 传输chunk失败`);
        });
    });
    describe(`验证磁盘写满请求: tarns 数据写入读取`, async () => {
        let test_file;
        let file_path;
        let file_name;
        let task_id;
        let taskfile;
        it(`publish_file从文件中获取chunk`, async () => {
            var _a;
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            // 获取测试驱动中的工具类
            let file_source_tool = stack_manager.driver.get_client("zone4_ood").client.get_util_tool();
            // 创建测试文件
            let local_file = await file_source_tool.create_file(100 * 1024 * 1024);
            taskfile = (_a = (await file_source_tool.get_cache_path()).cache_path) === null || _a === void 0 ? void 0 : _a.file_download;
            file_name = local_file.file_name;
            file_path = local_file.file_path;
            let info = await stack.trans().publish_file({
                common: {
                    // api级别
                    dec_id: stack.dec_id,
                    req_path: "qaTest",
                    level: cyfs.NDNAPILevel.NDC,
                    referer_object: [],
                    flags: 1,
                },
                owner: stack.local_device().desc().owner(),
                local_path: file_path,
                chunk_size: 10 * 1024 * 1024,
                access: cyfs.AccessString.full()
            });
            assert(!info.err, `publish_file 失败`);
            test_file = info.unwrap().file_id;
            stack_manager.logger.info(`put_context  =  ${JSON.stringify(info.unwrap())}`);
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=createtask need param fileid is ${test_file}`);
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=createtask need param taskfile is ${taskfile}`);
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=createtask need param filename is ${file_name}`);
        });
        it(`create_task创建任务`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            const get_ret = await stack.non_service().get_object({
                object_id: test_file,
                common: {
                    req_path: "qaTest",
                    level: cyfs.NONAPILevel.NOC,
                    target: stack.local_device_id().object_id,
                    dec_id: stack.dec_id,
                    flags: 0,
                }
            });
            assert.ok(!get_ret.err, "create_task get object 失败");
            let task = await stack.trans().create_task({
                common: {
                    req_path: "qaTest",
                    dec_id: stack.dec_id,
                    level: cyfs.NDNAPILevel.NDC,
                    //target: stack.local_device_id().object_id,
                    referer_object: [],
                    flags: 1,
                },
                object_id: cyfs.ObjectId.from_base_58("7Tk94YfAF44JMiqKDd7XtCufXFQBt7uJoHKxkoEhLAUq").unwrap(),
                local_path: path.join("C:/cyfs/log/node_tester_app/blog/5SyKbcS5MC_cache/file_download", "hSdH5JtD8n.txt"),
                device_list: [stack.local_device_id()],
                auto_start: true,
            });
            console.info(JSON.stringify(task));
            assert.ok(!task.err, "create_task 失败");
            task_id = task.unwrap().task_id;
            console.log(`-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=get_task_state need param task_id is ${task_id}`);
        });
        it(`get_task_state获取任务信息`, async () => {
            let ood = await stack_manager.get_cyfs_satck({
                peer_name: "zone4_ood",
                dec_id: dec_app_1.to_base_58(),
                type: cyfs.CyfsStackRequestorType.Http
            });
            let stack = ood.stack;
            let task = await stack.trans().get_task_state({
                common: {
                    req_path: "qaTest",
                    dec_id: stack.dec_id,
                    level: cyfs.NDNAPILevel.NDC,
                    target: stack.local_device_id().object_id,
                    referer_object: [],
                    flags: 1,
                },
                task_id: "223v2qyucDHKJwhHvcFUsARykbYAhZN57d3Vujy9ShHW"
            });
            console.info(JSON.stringify(task));
            assert.ok(!task.err, "get_task_state 失败");
        });
    });
});
