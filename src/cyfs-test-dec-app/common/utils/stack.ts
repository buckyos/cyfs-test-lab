import {
    ObjectId,
    DeviceId,
    SharedCyfsStack,
    SharedCyfsStackParam,
    get_cyfs_root_path, UtilGetDeviceStaticInfoResponse, UtilGetDeviceResponse,
} from '../../cyfs'
import * as cyfs from "../../cyfs"
import { APP_NAME, DEC_ID,SERVICE_OOD } from '../../config/decApp';


export let stack = (function () {
    // local proxy 要open runtime
    if (typeof process == 'object' &&
        (process.env['APP']  ==  'local-proxy' || process.env['GIT_EXEC_PATH'] != undefined ) ) {
        console.log('current app is CYFS STACK TEST local proxy, open runtime')
        return SharedCyfsStack.open_runtime()
    }

    // dec_app, dec_service open default
    // www open runtime
    if (typeof window == 'undefined') {
        console.log('open open_default')
        return SharedCyfsStack.open_default_with_ws_event()
    } else {
        console.log('www open_runtime')
        return SharedCyfsStack.open_runtime()
    }
}())

class StackInfo {
    // @var current runtime device id
    device_id: DeviceId
    owner: ObjectId
    ood_device_id: DeviceId
    cyfs_root: string = ''

    // @var dec app id (cyfs git)
    appID: ObjectId

    // @var 服务器ood
    serviceOOD: ObjectId

    is_ood_device: boolean = false
    is_init: boolean = false
    constructor() {
        // to tmp
        this.device_id = new DeviceId(DEC_ID)
        this.owner = DEC_ID
        this.ood_device_id = new DeviceId(DEC_ID)
        this.appID = DEC_ID
        this.serviceOOD = cyfs.ObjectId.from_base_58(SERVICE_OOD).unwrap()
    }


    async init(type:string="none") {
        //支持连接指定类型的协议栈
        if(type=="ood"){
            stack = cyfs.SharedCyfsStack.open_default();
            let info =await stack.online();
        }else if(type=="runtime"){
            stack = cyfs.SharedCyfsStack.open_runtime();
            let info =await stack.online();
        }
        // const [device_id, device] = (await stack.util().get_current_device()).unwrap()
        const [device, device_static_info] = await Promise.all([
            stack.util().get_device({
                common: {
                    dec_id: this.appID,
                    flags: 0,
                }
            }),
            stack.util().get_device_static_info({
                common: {
                    dec_id: this.appID,
                    flags: 0,
                }
            }),
        ])
        const deviceResp = device.unwrap() as UtilGetDeviceResponse
        const staticInfo = device_static_info.unwrap() as UtilGetDeviceStaticInfoResponse

        // ;(console as any).origin.log('init', JSON.stringify(deviceResp), JSON.stringify(staticInfo))

        this.device_id = deviceResp.device_id
        this.owner  = deviceResp.device.desc().owner()!.unwrap()

        this.ood_device_id = staticInfo.info.ood_device_id
        this.cyfs_root = staticInfo.info.cyfs_root
        this.is_ood_device = staticInfo.info.is_ood_device
        this.is_init = true

    }


    async getTargetDevice(object_id: ObjectId, owner_id: ObjectId): Promise< DeviceId[]> {
        const resp = await stack.util().resolve_ood({
            common: {
                dec_id: this.appID,
                flags: 0,
            },
            object_id: object_id,
            owner_id: owner_id,
        })

        return resp.unwrap().device_list
    }


    // 这里只要第一个 ood device就可以了
    async getTargetDeviceFromString(object_id: string, owner_id: string): Promise<ObjectId> {
        const theOwner: ObjectId = ObjectId.from_base_58(owner_id).unwrap()
        const theObject: ObjectId = ObjectId.from_base_58(object_id).unwrap()

        const device = await this.getTargetDevice(theOwner, theObject)
        return device[0].object_id
    }


    checkOwner(owner_id: string): boolean {
        const targetOwner: ObjectId = ObjectId.from_base_58(owner_id).unwrap()
        return targetOwner.eq(this.owner)
    }


}

export const stackInfo = new StackInfo()
