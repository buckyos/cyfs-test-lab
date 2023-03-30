import {BaseAction,ActionAbstract} from "../../action"
import { ErrorCode, Logger} from '../../../common';

export class TransDirAction extends BaseAction implements ActionAbstract {
    async run(req?:any): Promise<{ err: number, log: string }> {

        return { err: ErrorCode.succ, log: "run success" }
    }
}
