
import {
    BodyContent,
    cyfs_log_config,
    DescContent, NamedObject,
    NamedObjectDecoder,
    NONAPILevel, NONGetObjectOutputRequest, NONObjectInfo, NONPostObjectOutputRequest, NONPostObjectOutputResponse,
    ObjectId, RawDecode, Some,
    // TextObject, TextObjectDecoder,
} from '../../cyfs_node/cyfs_node'
import * as cyfs from '../../cyfs_node/cyfs_node'
import { stack, stackInfo , create_stack} from './stack'
import {
    RequestTargetCommonResponse,
    GitTextObject,
    GitTextObjectDecoder,
    GetObjectResponse,
} from "../types";



export type GetObjectRequestOptions = {
    target?: ObjectId,
    flags?: number
}



// get_object
// quick get object and decode object
export async function get_object(id: ObjectId|string, Decode: any, opt?: GetObjectRequestOptions): Promise<GetObjectResponse> {
    let object_id: ObjectId
    if ( typeof id == 'string') {
        object_id = ObjectId.from_base_58(id).unwrap()
    } else {
        object_id = id
    }

    const req: NONGetObjectOutputRequest = {
        common: {
            level: NONAPILevel.Router,
            dec_id: stackInfo.appID,
            flags: 0,
        },
        object_id: object_id,
    }

    // 设置 request target
    if ( opt && opt.target ) {
        req.common.target = opt.target
    }

    if ( opt && opt.flags ) {
        req.common.flags = opt.flags
    }


    const r = await stack.non_service().get_object(req)
    if (r.err) {
        console.error('get object failed', r)
        return {
            err: true,
            object: null,
            message: JSON.stringify(r)
        }
    }
    const decoder = new Decode()

    const [target] = decoder.raw_decode(r.unwrap().object.object_raw).unwrap()

    return {
        object: target,
        err: false,
        message: ''
    }
}

export async function requestService(route: string, data: Object,target?:ObjectId) {
    await create_stack("runtime", 1322, 1323);
    if(!target){
        target= await cyfs.ObjectId.from_base_58(stackInfo.ood).unwrap();
    }
    return generateRequest(target)(route, data)
}

export async function requestTarget(route: string, data: Object, owner: string, id: string) {
    const target: ObjectId = await cyfs.ObjectId.from_base_58(id).unwrap();
    return generateRequest(target)(route, data)
}


export function generateRequest(target: ObjectId): (route: string, data: Object) => Promise<RequestTargetCommonResponse>{

    return async function (route: string, data: Object): Promise<RequestTargetCommonResponse> {
        const dataString: string = JSON.stringify(data)
        console.log(`route: [${route}], request data: ${dataString},target = ${target.to_base_58()}`)
        let owner = cyfs.ObjectId.from_base_58(stackInfo.owner).unwrap();
        const obj = GitTextObject.create(owner, stackInfo.appID, route, "header", dataString)
        const object_id = obj.desc().calculate_id()
        const object_raw = obj.to_vec().unwrap()

        const req: NONPostObjectOutputRequest = {
            common: {
                dec_id: stackInfo.appID,
                flags: 0,
                level: NONAPILevel.Router,
                target: target,
            },
            object: new NONObjectInfo(object_id, object_raw)
        }

        const resp = await stack.non_service().post_object(req)
        if (resp.err) {
            console.error('requestTarget', resp)
            return {err: true, data: {}, msg: 'post data error'}
        }

        const r: NONPostObjectOutputResponse = resp.unwrap()
        const decodeResp = new GitTextObjectDecoder().raw_decode(r.object!.object_raw)
        const [text]: [GitTextObject, Uint8Array] = decodeResp.unwrap()

        console.log(`[${route}] get response data: ${text.value}`)
        const responseData: RequestTargetCommonResponse = JSON.parse(text.value)
        return responseData
    }
}
