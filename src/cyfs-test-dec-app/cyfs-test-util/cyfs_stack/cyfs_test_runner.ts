import {StackManager,} from "./stack_manager"
import {Logger,sleep } from "../../common";
import {CyfsDriverType} from "../../cyfs-test-base"
import {CyfsStackClientConfig} from "../../cyfs-driver-client"
import * as cyfs from "../../cyfs"
import {ActionManager}from "./action_manager"
import path from "path";

export const DEC_APP_1 = cyfs.ObjectId.from_base_58(cyfs.CYFS_TEST_DEC_APP).unwrap()
export const DEC_APP_2 = cyfs.ObjectId.from_base_58(cyfs.DEC_APP_SERVICE).unwrap()

export class CyfsTestRunner{
    static runner?: CyfsTestRunner;
    public stack_manager : StackManager;
    public data_manager : ActionManager;
    static createInstance(driver_type?: CyfsDriverType, agent_list?: CyfsStackClientConfig[]): CyfsTestRunner {
        if (!CyfsTestRunner.runner) {
            CyfsTestRunner.runner = new CyfsTestRunner(driver_type,agent_list);
        }
        return CyfsTestRunner.runner;
    }
    constructor(driver_type?: CyfsDriverType, agent_list?: CyfsStackClientConfig[]){
       this.stack_manager = StackManager.createInstance(driver_type,agent_list);
       this.data_manager = ActionManager.createInstance();
       console.info(`init CyfsTestRunner frist`) 
    }
    async init(){
        await this.stack_manager.init();
    }
    async before_all_common(){
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await this.stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, DEC_APP_1);
        let dec_app_2_client = await this.stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, DEC_APP_2);
        console.info(`<------------------------  Test framewaork init finished ------------------------------>`);
        return;
    }
    async after_all_common(){
        // 停止测试模拟器
        this.stack_manager.destory();
        // 停止测试驱动
        await this.stack_manager.driver!.stop();
        // 保存测试记录
        this.data_manager.save_history_to_file(path.join(__dirname,"../../blog"));
        console.info(`<------------------------  Test framewaork exit ------------------------------>`);
    }
    async before_each_common(testcase_id:string){
        this.data_manager.update_current_testcase_id(testcase_id);
        console.info(`<------------------------  ${testcase_id} is running ------------------------------>`)
    }
    async after_each_common(){
        let current_actions = this.data_manager.report_current_actions();
        console.info(`<------------------------  ${current_actions.testcase_id} run finshed ------------------------------>`)
        return {
            title: `${current_actions.testcase_id}`,
            value: current_actions.action_list
        }
    }
}