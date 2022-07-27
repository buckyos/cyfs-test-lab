import {ErrorCode, Logger, BufferReader, sleep,RandomGenerator} from '../../../base';
import * as net from 'net';
import {EventEmitter} from 'events';
import {StackLpc, StackLpcCommand} from '../lpc';
import * as WSParams from "../ws_params"
import * as cyfs from "./cyfs/cyfs_node"
import {CustumObjectType} from "./NamedObject"
export type StackPeerOptions = {
    logger: Logger;
    name: string
};

export class StackClient extends EventEmitter  {
    private m_logger: Logger;
    private m_name: string;
    private m_stack?:cyfs.SharedCyfsStack;
    private m_deviceId?:string;
    
    on(event: 'unlive', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'unlive', listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    constructor(options: StackPeerOptions) {
        super();
        this.m_logger = options.logger
        this.m_name = options.name;
    }

    get name(): string {
        return this.m_name;
    }

    
    async open_stack(stack_type:string,dec_id?:string,http_port?:number,ws_port?:number): Promise<{err: ErrorCode, deviceId?: string,log?:string}> {
        
        let Dec_id : cyfs.ObjectId | undefined = undefined;
        if(dec_id){
            Dec_id = cyfs.ObjectId.from_base_58(dec_id).unwrap();
        }
        if(stack_type == "runtime"){
            this.m_stack = cyfs.SharedCyfsStack.open_runtime(Dec_id);    
        }else if(stack_type == "ood"){
            this.m_stack = cyfs.SharedCyfsStack.open_default(Dec_id);   
        }else if(stack_type == "port"){
            this.m_stack = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(http_port!, ws_port!,Dec_id).unwrap());  
        }
        
        let res1 = await this.m_stack!.wait_online(cyfs.Some(cyfs.JSBI.BigInt(10000)));
        if(res1.ok){
            console.info('cyfs ts client connect cyfs stack succeess')
        }else{
            console.info(`cyfs ts client connect cyfs stack failed`)
            return {err:ErrorCode.fail,log:`${JSON.stringify(res1)}`}
        }
        await cyfs.sleep(5000);
        this.m_deviceId = this.m_stack!.local_device_id().to_base_58();
        return {err:ErrorCode.succ,log:`${JSON.stringify(res1)}`,deviceId:this.m_deviceId}

    }



    async put_obejct(obj_type:number,put_object_params:WSParams.PutObjectParmas): Promise<WSParams.PutObjectResp>{

        let object : cyfs.NONObjectInfo
        if(obj_type == CustumObjectType.MyText){
            const obj = cyfs.TextObject.create(cyfs.Some( cyfs.ObjectId.from_base_58(this.m_deviceId!).unwrap()), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            object = new cyfs.NONObjectInfo(obj.calculate_id(), obj.to_vec().unwrap())
        }else{
            // default type
            const obj = cyfs.TextObject.create(cyfs.Some( cyfs.ObjectId.from_base_58(this.m_deviceId!).unwrap()), 'question_saveAndResponse', `test_header, time = ${Date.now()}`, `hello! time = ${Date.now()}`);
            object = new cyfs.NONObjectInfo(obj.calculate_id(), obj.to_vec().unwrap())
        }
        let req: cyfs.NONPutObjectOutputRequest = {
            object:object!,
            common : {
                level:   put_object_params.common.level,
                flags: put_object_params.common.flags,
            } 
        }
        // 可选参数传入
        if(put_object_params.common.req_path){
            req.common.req_path = put_object_params.common.req_path
        }
        if(put_object_params.common.dec_id){
            req.common.dec_id =  cyfs.ObjectId.from_base_58(put_object_params.common.dec_id!).unwrap()    
        }
        if(put_object_params.common.target){
            req.common.dec_id =  cyfs.ObjectId.from_base_58(put_object_params.common.target!).unwrap()    
        }
        let start_time = Date.now();
        let put_resp = await this.m_stack!.non_service().put_object(req);
        let opt_time = Date.now()-start_time;
        if(put_resp.err){
            console.info(`put object failed,err = ${JSON.stringify(put_resp)}`)
            return {err:ErrorCode.fail,log:`${JSON.stringify(put_resp)}`}
        }
        let data_size = object.object_raw.buffer.byteLength;
        return{
            err: ErrorCode.succ,
            log: `put object success`,
            object_id: object!.object_id.to_base_58(),
            object_raw: object.object_raw,
            opt_time,
            data_size
        }
    }

    async get_obejct(obj_type:number,get_object_params:WSParams.GetObjectParmas): Promise<WSParams.GetObjectResp>{
        
        let req: cyfs.NONGetObjectOutputRequest = {
            object_id: cyfs.ObjectId.from_base_58(get_object_params.obj_id!).unwrap(),
            common : {
                level:   get_object_params.common.level,
                flags: get_object_params.common.flags,
            } 
        }
        // 可选参数传入
        if(get_object_params.common.req_path){
            req.common.req_path = get_object_params.common.req_path
        }
        if(get_object_params.common.dec_id){
            req.common.dec_id =  cyfs.ObjectId.from_base_58(get_object_params.common.dec_id!).unwrap()    
        }
        if(get_object_params.common.target){
            req.common.dec_id =  cyfs.ObjectId.from_base_58(get_object_params.common.target!).unwrap()    
        }
        if(get_object_params.inner_path){
            req.inner_path =   get_object_params.inner_path
        }
        let start_time = Date.now();
        let get_resp = await this.m_stack!.non_service().get_object(req);
        let opt_time = Date.now()-start_time;
        if(get_resp.err){
            console.info(`put object failed,err = ${JSON.stringify(get_resp)}`)
            return {err:ErrorCode.fail,log:`${JSON.stringify(get_resp)}`}
        }
        
        let obj = get_resp.unwrap();
        if(obj_type == CustumObjectType.MyText){
            // 特定对象解码，测试解码自段
        }else{
            // 特定对象解码，测试解码自段
        }
        let data_size = obj.object.object_raw.buffer.byteLength;
        return{
            err: ErrorCode.succ,
            log: `get object success`,
            object_id: obj.object.object_id.to_base_58(),
            object_raw: obj.object.object_raw,
            opt_time,
            data_size
        }

    }
    
}
