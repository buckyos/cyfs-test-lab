import {Action} from "./action" 
import * as path from "path"
import * as fs from "fs-extra"
import { RandomGenerator} from '../tools';


type ActionRecord = {
    testcase_id : string,
    action_list : Array<Action>,
}


export class ActionManager {
    static manager?: ActionManager;
    public history_action : Array<ActionRecord>;
    public current_action : ActionRecord;
    //单例模式
    static createInstance(): ActionManager {
        if (!ActionManager.manager) {
            ActionManager.manager = new ActionManager();
        }
        return ActionManager.manager;
    }
    constructor() {
        this.history_action = [];
        this.current_action = {
            testcase_id :  `Testcase-${RandomGenerator.string(10)}-${Date.now()}`,
            action_list : []
        }
        console.info(`init ActionManager frist,begin record test action data`)
    }
    record_action(action:Action){
        this.current_action.action_list.push(action)
    }
    update_current_testcase_id(testcase_id:string){
        this.current_action.testcase_id = testcase_id;
    }
    report_current_actions(): ActionRecord{
        let current_action = JSON.parse(JSON.stringify(this.current_action));
        this.current_action = {
            testcase_id :  `Testcase-${RandomGenerator.string(10)}-${Date.now()}`,
            action_list : []
        };
        this.history_action.push(current_action);
        return current_action
    }
    save_history_to_file(save_path:string){
        fs.writeFileSync(path.join(save_path,`./test_action_data.json`),JSON.stringify(this.history_action))
    }
}