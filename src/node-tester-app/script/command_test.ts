import {Command, encodeCommand, decodeCommand, CommandDefine} from '../base/command/command';
import {BufferWriter} from '../base/common/writer';
import {BufferReader} from '../base/common/reader';
import {CommandSysHeartbeatReq, SysCommandName} from '../base/command/define';

let value: any = {
    name: SysCommandName.sys_heartbeat_req,
    from: { agentid: '1', serviceid: '2', taskid: '3' },
    to: { agentid: '1', serviceid: '2', taskid: '3' },
    seq: 1,
    serviceid: 'serviceid',
    agentid: 'agentid',
    taskid: 'taskid',
    url: 'http://www.baidu.com',
    md5: '1231231231321231',
    param: ['p1', 'p2', 'p3'],
    errcode: 1,
    eventname: 'eventname',
    servicename:'test',
    version: '1.2',
    newversion: '1.3',
    apiname: 'testapiname'
}

CommandDefine.gCommandCoder.forEach((coder, name) => {
    try {
        let writer: BufferWriter = new BufferWriter();
        value.name = name;
        let err = encodeCommand(value, writer);
        console.log(`encode command '${value.name}', errcode = ${err}`);
        if (!err) {
            let info = decodeCommand(new BufferReader(writer.render()));
            console.log(`decode command '${name}', errcode = ${info.err}`);
            if (!info.err) {
                console.log(`value=${JSON.stringify(info.command! as any)}`);
            }
        }
    } catch (e) {
        console.log(`name=${name}, e=${e}`);
    }
});