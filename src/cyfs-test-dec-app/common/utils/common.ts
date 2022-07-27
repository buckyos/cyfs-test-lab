import {
    BuckyResult,
    None, NONObjectInfo,
    Ok,
    RouterHandlerAction,
    RouterHandlerPostObjectResult,
    RouterHandlerPutObjectResult,
    RouterHandlerPostObjectRequest,
} from "../../cyfs";
import {
    GitTextObject,
} from "../types";
import {stackInfo} from "../../common/utils/stack";


export enum CommonPostResponseStatus {
    success =  0,
    error = 10,
    error_empty = 11,
    error_serve = 12,
    error_params_unvalidated = 13,
    error_serve_put_object = 14,
    error_serve_delete_object = 15,
    error_serve_complete_repository = 16,
    error_serve_repository_path = 17,
    error_serve_public_repository = 18,
    error_put_repository_remote = 19,
    error_route = 20,
    error_duplicate = 21,
    error_acl_action = 22,
    error_serve_no_auth = 23,
    error_serve_empty_user = 24,
    error_push_repository_first_pack = 25,
    error_fetch_repository_add_file = 26,
    error_user_notfound = 27,
    error_commits_length = 51,
    error_update_repository_failed= 52,
    error_repository_binary_exist= 53,
    error_repository_binary_unzip= 54,
    error_user_init_duplicate = 55,
    error_repository_no_init= 56,
    error_repository_drop= 57,
    error_repository_remote_binary= 58,
    error_repository_binary_timeout= 59,
    error_repository_notfound= 60,
    error_repository_binary_upload= 61,
    error_add_file_error = 101,
    error_route_notfound = 404,
}


export async function commonPostResponse(param: RouterHandlerPostObjectRequest, route: string, status: CommonPostResponseStatus,  data: Object | string): Promise<BuckyResult<RouterHandlerPostObjectResult>> {
    let err = status == CommonPostResponseStatus.success ? false: true

    let dataStr: string
    if (typeof data === 'string') {
        dataStr = JSON.stringify({
            err: err,
            status: status,
            msg: data,
        })
    } else  {
        dataStr = JSON.stringify({
            err: err,
            status: status,
            data: {
                ...data,
            }
        })
    }

    console.log(`route: ${route}, send response data: ${dataStr}`)

    const obj = GitTextObject.create(stackInfo.owner, stackInfo.appID, route, '', dataStr)
    const object_raw = obj.to_vec().unwrap()
    const object_id = obj.desc().calculate_id()



    const result: RouterHandlerPostObjectResult = {
        action: RouterHandlerAction.Response,
        request: param.request,
        response: Ok({
            object: new NONObjectInfo(object_id, object_raw)
        })
    };

    return Ok(result)

}
