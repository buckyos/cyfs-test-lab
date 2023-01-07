import {BaseAction,ActionAbstract} from "../../action"
import { ErrorCode, Logger} from '../../../base';

export class PutObjectAction extends BaseAction implements ActionAbstract {
    async run(req?:any): Promise<{ err: ErrorCode, log: string }> {

        return { err: ErrorCode.succ, log: "run success" }
    }
}