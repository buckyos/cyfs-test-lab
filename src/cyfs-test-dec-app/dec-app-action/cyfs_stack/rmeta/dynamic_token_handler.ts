
import * as cyfs from '../../../cyfs';


export class DynamicTokenHandler implements cyfs.RouterHandlerAclRoutine{
    private token : string
    constructor(token:string){
        this.token = token;
    }
    async call(param: cyfs.RouterHandlerAclRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerAclResult>> {
        console.info(`will handle dynamic acl${param.request.req_path}: query${param.request.req_query_string}`)
        let action = cyfs.AclAction.Reject;
        let querys = param.request.req_query_string.split("&");
        let match_return_error = 0;
        let match_response_error = 0;
        for(let query of querys){
            let [key,value] = query.split("=");
            console.info(`Dynamic Token will check key=${key} value = ${value}`)
            if(key === "token" && value === this.token){
                console.info(`DynamicTokenHandler check token success,will return access accept`)
                action = cyfs.AclAction.Accept;
            }
            if(key === "return_error"){
                match_return_error = Number(value);    
                break;
            }
            if(key === "response_error"){
                match_response_error = Number(value);
               
                break;
            }
        }
        let resp :cyfs.AclHandlerResponse = {
            action
        }
        if(match_return_error != 0){
            console.info(`DynamicTokenHandler will return error ${match_return_error}`)
            return cyfs.Err(cyfs.BuckyError.new_dec_error(match_response_error,"request set return_error"));
        }
        let result : cyfs.RouterHandlerAclResult =  {
            action: cyfs.RouterHandlerAction.Response,
            response : cyfs.Ok(resp),
        }
        if(match_response_error != 0){
            console.info(`DynamicTokenHandler will response error ${match_response_error}`)
            result = {
                action: cyfs.RouterHandlerAction.Response,
                response : cyfs.Err(cyfs.BuckyError.new_dec_error(match_response_error,"request set response_error")),
            }
        }
        return cyfs.Ok(result)
    }  
}
