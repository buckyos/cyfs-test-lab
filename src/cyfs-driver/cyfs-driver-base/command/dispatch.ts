import {ErrorCode} from '../../cyfs-test-base';
import {Command} from './command';

export type CommandHandler = (c: Command) => void;
export type CommandFilter = (c: Command) => boolean;

type CommandHandlerEntry = {
    cookie: number;
    handler: CommandHandler;
    filter?: CommandFilter;
};

export class CommandDispatch {
    private m_handler: Map<string, CommandHandlerEntry[]>;
    private m_cookie: number;

    constructor() {
        this.m_handler = new Map();
        this.m_cookie = 1;
    }

    addHandler(cmdname: string, handler: CommandHandler, filter?: CommandFilter): {err: ErrorCode, cookie?: number} {
        if (!this.m_handler.has(cmdname)) {
            this.m_handler.set(cmdname, []);
        }

        let cookie = this.m_cookie++;
        this.m_handler.get(cmdname)!.push({cookie, handler, filter});

        return {err: ErrorCode.succ, cookie};
    }

    removeHandler(cmdname: string, cookie: number): ErrorCode {
        if (!this.m_handler.has(cmdname)) {
            console.log(`[stack] handler not exist when remove handler`);
            return ErrorCode.notExist;
        }

        let items = this.m_handler.get(cmdname);
        for (let i = 0; i < items!.length; i++) {
            if (items![i].cookie === cookie) {
                items!.splice(i, 1);
                break;
            }
        }

        if (!items!.length) {
            this.m_handler.delete(cmdname);
        }

        return ErrorCode.succ;
    }

    dispatch(c: Command): {err: ErrorCode, handled: boolean} {
        if (!this.m_handler.has(c.name)) {
            return {err: ErrorCode.succ, handled: false};
        }

        let items = this.m_handler.get(c.name)!.slice();
        for (let i = 0; i < items.length; i++) {
            if (!items[i].filter || items[i].filter!(c)) {
                items[i].handler(c);
            }
        }

        return {err: ErrorCode.succ, handled: true};
    }
}