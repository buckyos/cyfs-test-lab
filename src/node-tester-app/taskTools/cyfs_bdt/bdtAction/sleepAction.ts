
import { RandomGenerator, sleep } from '../../../base';
import { BDTERROR, ActionType, Agent, Testcase, Task, Action, ActionAbstract } from '../type'
import {BaseAction} from "./baseAction"

export class SleepAction extends BaseAction implements ActionAbstract {
    async run(): Promise<{ err: number, log: string }> {
        await sleep(30000)
        return { err: BDTERROR.success, log: `${this.action.LN}CreateBDTStackAction run success` }
    }
}