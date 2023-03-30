import * as cyfs from '@src/cyfs';
import {HandlerRequestObject,HandlerRequestObjectDecoder} from '@src/dec-app-base/dec_object';
import {HandlerApi,HandlerType} from '@src/dec-app-base/handler_api';
import {StackInstance} from "../utils/stack"
//import {RandomGenerator,ErrorCode} from '@src/common';

export async function post_put_object(request_type:string, request_data:string){
    let stack_instance = StackInstance.createInstance();
    let stack = stack_instance.stack;
    let handler_request = HandlerRequestObject.create(stack.local_device_id().object_id,request_type,`request-${Date.now()}`,request_data,new Uint8Array(0));
    console.info(`will post object message = ${request_data}`)
    let req_path = new cyfs.RequestGlobalStatePath(stack.dec_id, "QATest").toString()
    let result = await stack_instance.stack!.non_service().post_object({
        common: {
            req_path,
            dec_id : stack.dec_id,
            level: cyfs.NONAPILevel.NON,
            target : stack_instance.ood,
            flags: 1,
        },
        object : new cyfs.NONObjectInfo(handler_request.calculate_id(),handler_request.to_vec().unwrap())
    });
    if(result.err){
        return { err: result.val.code, log: result.val.msg}
    }
    let response = result.unwrap();
    let response_object = new HandlerRequestObjectDecoder().from_raw( response.object!.object_raw).unwrap();
    console.info(`post object message resp = ${JSON.stringify(response_object.request_json)}`);
    let resp : HandlerApi  = JSON.parse(response_object.request_json);
    return resp
       
}

// export function get_handler_type(){
//    return {
//     TransFile: "trans-file",
//     PrepareTransFile = "prepare-trans-file",
//     UpdateContext = "update-context",
//     AddContext = "add-context",
//     ShareFileAddAccess = "share-file-add-access",
//     PutObject = "put-object",
//     OS_IO_ReadFile = "OS_IO_ReadFile",
//     OS_IO_WriteFileR = "OS_IO_WriteFileR",
//     OS_IO_RunFile = "OS_IO_RunFile",
//     OS_Network_HttpListern = "OS_Network_HttpListern",
//     OS_Network_HttpRequest = "OS_Network_HttpRequest",


// }
// }