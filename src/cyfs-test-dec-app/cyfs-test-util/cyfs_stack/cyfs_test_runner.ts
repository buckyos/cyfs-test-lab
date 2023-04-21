import {StackManager} from "./stack_manager"
import {Logger,sleep } from "../../common";
import * as cyfs from "../../cyfs"
import {ActionManager}from "./action_manager"

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
const dec_app_2 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")

export class CyfsTestRunner{
    static runner?: CyfsTestRunner;
    public stack_manager : StackManager;
    public logger? : Logger;
    public data_manager : ActionManager;
    static createInstance(): CyfsTestRunner {
        if (!CyfsTestRunner.runner) {
            CyfsTestRunner.runner = new CyfsTestRunner();
        }
        return CyfsTestRunner.runner;
    }
    constructor(){
       this.stack_manager = StackManager.createInstance();
       this.data_manager = ActionManager.createInstance();
    }
    async before_all_common(){
        await this.stack_manager.init();
        this.logger = this.stack_manager.logger!;
        await sleep(5000);
        // 所有节点 实例化一个 Http Requestor dec_app_1 协议栈
        let dec_app_1_client =  await this.stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.Http, dec_app_1);
        let dec_app_2_client = await this.stack_manager.load_config_stack(cyfs.CyfsStackRequestorType.WebSocket, dec_app_2);
        this.logger!.info(`<------------------------  Test framewaork init finished ------------------------------>`);
    }
    async after_all_common(){
        // 停止测试模拟器
        this.stack_manager.destory();
        // 停止测试驱动
        await this.stack_manager.driver!.stop();
        // 保存测试记录
        this.data_manager.save_history_to_file(this.logger!.dir());
        this.logger!.info(`<------------------------  Test framewaork exit ------------------------------>`);
    }
    async before_each_common(testcase_id:string){
        this.data_manager.update_current_testcase_id(testcase_id);
        this.logger!.info(`<------------------------  ${testcase_id} is running ------------------------------>`)
    }
    async after_each_common(){
        let current_actions = this.data_manager.report_current_actions();
        this.logger!.info(`<------------------------  ${current_actions.testcase_id} run finshed ------------------------------>`)
        return {
            title: `${current_actions.testcase_id}`,
            value: current_actions.action_list
        }
    }
}