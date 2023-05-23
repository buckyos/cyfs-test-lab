import { ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep } from '../../base';
import {DMCClient} from "./dmc_client"
import {UtilTool} from "./util"
export async function ServiceMain(_interface: ServiceClientInterface) {
    // local util,it can start bdt-tools and create test data
    const client = new DMCClient(_interface);

    await client.init();
    const util = new UtilTool(_interface)
    _interface.registerApi('start-server', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().info(`remote call start-server,${JSON.stringify(param)}`);
        let result = await client.start_server()
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value:{log:"success"} };
    });
    _interface.registerApi('stop-server', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().info(`remote call stop-server,${JSON.stringify(param)}`);
        let result = await client.stop_server()
        return { err: ErrorCode.succ, bytes: Buffer.from(''), value:{log:"success"} };
    });
    _interface.registerApi('excute-cmd', async (from: Namespace, bytes: Buffer, param: {cmd:string,timeout?:number}): Promise<any> => {
        _interface.getLogger().info(`remote call start-server,${JSON.stringify(param)}`);
        let result = await client.excute_cmd(param.cmd,param.timeout);
        return { err: result.code, bytes: Buffer.from(''), value:result };
    });
    _interface.registerApi('util-request', async (from: Namespace, bytes: Buffer, param: any): Promise<any> => {
        _interface.getLogger().info(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().info(`remote call createBdtLpcListener ${param.name} `);
        let result = await util.util_request({ json: param, bytes })
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if (result.resp?.bytes) {
            respBytes = result.resp?.bytes;
        }
        if (result.resp?.json) {
            respJson = result.resp?.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
}