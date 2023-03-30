import assert = require('assert');
import * as cyfs from '../../../cyfs'
import { StackManager, CyfsStackDriverManager, CyfsStackDriver, CyfsDriverType } from "../../../cyfs-driver-client"
import { ErrorCode, RandomGenerator, sleep, Logger } from '../../../common';

import * as addContext from "mochawesome/addContext"
import * as action_api from "../../../dec-app-action"
import { HandlerRequestObject,HandlerRequestObjectDecoder, HandlerType } from "../../../dec-app-base"
import { PrepareTransFileRequest } from '../../../dec-app-action';

import * as fs from "fs-extra";
import path  from "path";

const dec_app_1 = cyfs.ObjectId.from_base_58("9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd").unwrap()
const dec_app_2 = cyfs.ObjectId.from_base_58("9tGpLNnUxFFXh3XxzZrJJ6UuekyzF7LJ7t7ZTtJjsPMH").unwrap()


//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_same_file.ts --reporter mochawesome --require ts-node/register

// 测试数据配置
const save_path = "E:\\bucky_file\\OneDrive - buckyos\\测试项目\\CYFS\\OOD数据备份测试\\test_data";
// 10万obejct
const nameobject_thread = 50;
const nameobject_number = 2000
// 6种组合 6*2000个 key_data + 1.2万object
const ket_data_thread = 100;
const ket_data_number = 20

// 单个chunk 500个 10*1024*1024 byte文件
const chunk_thread = 1;
const chunk_number = 1;
// 单个file 500 10*1024*1024 byte文件
const file_thread = 1;
const file_number = 1;
// 校验数据配置
const object_read_index = path.join(save_path,`nameobject_1679484324656`);
const root_state_path_read_index = path.join(save_path,`root_state_path_1679555170703`);
const root_state_isolate_read_index = path.join(save_path,`root_state_isolate_1679555170703`);
const root_state_single_read_index = path.join(save_path,`root_state_single_1679555170703`);
const local_cache_path_read_index = path.join(save_path,`local_cache_path_1679555170703`);
const local_cache_isolate_read_index = path.join(save_path,`local_cache_isolate_1679555170703`);
const local_cache_single_read_index = path.join(save_path,`local_cache_single_1679555170703`);
const chunk_read_index = path.join(save_path,`chunk_1679729548001`);
const file_read_index = path.join(save_path,`file_1679729548001`);
const stack_list = {
    zone4_ood: {
        peer_name: "zone4_ood",
        dec_id: dec_app_1.toString(),
        type: cyfs.CyfsStackRequestorType.Http
    }
}
const test_device = stack_list.zone4_ood;


// 使用nginx 代理测试
// const service_url = `http://192.168.100.205:${11318}`;
// const ws_url = `ws://192.168.100.205:${11319}`;
// let stack_param= new cyfs.SharedCyfsStackParam(
//     service_url,
//     cyfs.CyfsStackEventType.WebSocket,
//     dec_app_1,
//     ws_url
// )
// let stack = cyfs.SharedCyfsStack.open(stack_param) ;
   


describe("cyfs-back-up数据恢复测试",function(){
    this.timeout(0);
    let logger: Logger;
    const stack_manager = StackManager.createInstance(CyfsDriverType.other, [{
        peer_name: "zone3_ood",
        zone_tag: "zone3",
        stack_type: "ood",
        bdt_port: 30001,
        http_port: 31000,
        ws_port: 31001,
        ood_daemon_status_port: 32001,
    }, {
        peer_name: "zone4_ood",
        zone_tag: "zone4",
        stack_type: "ood",
        bdt_port: 30002,
        http_port: 31010,
        ws_port: 31011,
        ood_daemon_status_port: 32011,
    }]);
    
    const driver_manager = CyfsStackDriverManager.createInstance();
    const data_manager = action_api.ActionManager.createInstance();
    this.beforeAll(async function () {
        let make_dirver = await stack_manager.init();
        // 使用代理 或者nginx 转发
        await stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        logger = stack_manager.logger!;
        await sleep(5000);
        logger.info(`############用例执开始执行`);
        //let test = await stack.wait_online();
    })
    this.afterAll(async () => {
        // 停止测试模拟器
        await stack_manager.driver!.stop();
        // 保存测试记录
        data_manager.save_history_to_file(logger.dir());
    })
    let report_result: {
        title: string;
        value: any;
    };
    beforeEach(function () {
        // 设置当前用例id 方便日志定位问题
        let testcase_id = `Testcase-${RandomGenerator.string(10)}-${Date.now()}`;
        data_manager.update_current_testcase_id(testcase_id);
        logger.info(`\n\n########### ${testcase_id} 开始运行###########\n\n`)
    })
    // afterEach(function () {
    //     // 将当前用例执行记录到history
    //     addContext.default(this, report_result);
    // });

    let json_name = Date.now().toString(); 
    describe("cyfs-back-up测试数据构造", async () => {
        describe("NON chunk 构造保存", async () => {
            it("使用trans关联外部文件数据",async()=>{
                let stack = stack_manager.get_cyfs_satck(test_device).stack!;
                let running = []
                for (let i = 0; i < file_thread; i++) {
                    running.push(new Promise(async(resolve)=>{
                        let object_list = [];
                        for (let j = 0; j < file_number; j++) {
                            let begin = Date.now();
                            let tool = stack_manager.driver!.get_client(test_device.peer_name).client!.get_util_tool();
                            let random_file =await tool.create_file(10*1024*1024);
                            logger.info(`random file success ${random_file.file_name}`)
                            assert.ok(!random_file.err);
                            let create_time = Date.now() - begin;
                            let result = await stack.trans().publish_file({
                                common : {
                                    flags : 1,
                                    level : cyfs.NDNAPILevel.NDC,
                                },
                                owner: stack.local_device_id().object_id,
                                local_path: "D:\\test\\wPNxYKzt00.txt",
                                //local_path: random_file.file_path!,
                                chunk_size: 4*1024*1024,
                            })
                            console.info(result)
                            let put_time = Date.now() - begin - create_time;
                            assert.ok(!result.err)
                            let object_id = result.unwrap().file_id
                            logger.info(`task ${i} publish file success ${object_id} ,create_time = ${create_time} put_time = ${put_time}`)
                            object_list.push({
                                object_id,
                                file_name : random_file.file_name,
                                size : 10*1024*1024,
                                create_time,
                                put_time
                            })
                        }
                        fs.writeFileSync(path.join(save_path,`file_${json_name}_${i}.json`),JSON.stringify({nameobject:object_list}))
                        resolve("")
                    })) 
                }
                for(let run of running){
                    await run
                }
            })
        })
    })
    describe("cyfs-back-up测试数据恢复", async () => {
        

        describe("NON chunk 数据校验", async () => {

            it.only("读取NDC中chunk_cahce file数据",async()=>{
                 let stack = stack_manager.get_cyfs_satck(test_device).stack!;
                 let running = []
                 for (let i = 0; i < chunk_thread; i++) {
                     running.push(new Promise(async(resolve)=>{
                        //  let json_path = `${file_read_index}_${i}.json`;
                        //  let object_info = JSON.parse(fs.readFileSync(json_path).toString());
                        //  let object_list = object_info.nameobject;
                        //  let tool = stack_manager.driver!.get_client(test_device.peer_name).client!.get_util_tool();
                        //  let save_dir =(await tool.get_cache_path()).cache_path!.file_download;
                        let get_begin = Date.now();
                             let get_data =  await stack.trans().create_task({
                                common : {
                                    flags : 1,
                                    level : cyfs.NDNAPILevel.NDC
                                },
                                object_id: cyfs.ObjectId.from_base_58("7Tk94YfVyZBb4BqnXt9mKJ82zXBPZH3F2jZPArGWw5z8").unwrap(),
                                local_path: "D:\\wPNxYKzt00.txt",
                                device_list: [stack.local_device_id()],
                                auto_start : true,
                             })
                             if(get_data.err){
                                //logger.error(`${info.object_id} get failed`)
                            }
                             assert.ok(!get_data.err)
                             let check = 10
                             while (check) {
                                let check_result =  await stack.trans().get_task_state({
                                    common: {
                                        flags : 1,
                                        level : cyfs.NDNAPILevel.NDC
                                    },
                                    task_id :  get_data.unwrap().task_id
                                })

                                if(check_result.err || check_result.unwrap().state.state == cyfs.TransTaskState.Finished){
                                    logger.info(check_result);
                                    let get_time = Date.now() - get_begin;
                                    //info.get_time = get_time
                                    //logger.info(`${info.object_id} download success time = ${get_time}`)
                                    check = 0;
                                }else{
                                    check = check - 1;
                                    await sleep(1000)
                                }
                                
                             }
                         resolve("")
                     })) 
                     
                 }
                 for(let run of running){
                     await run
                 }
            })
        })
    })
})
