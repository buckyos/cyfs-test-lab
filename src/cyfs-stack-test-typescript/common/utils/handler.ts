import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node';
import * as events from 'events'
export const Emitter = new events.EventEmitter();



export class PutObjectHandlerDefault implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Default,
            request: param.request,
        };
        return cyfs.Ok(result)
    }
}



export class PutObjectHandlerReject implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Reject,
            request: param.request,
        };
        return cyfs.Ok(result)
    }
}
export class PutObjectHandlerDrop implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerDrop', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Drop,
            request: param.request
        };
        return cyfs.Ok(result)
    }
}
export class PutObjectHandlerPass implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerPass', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Pass,
            request: param.request,
        };
        return cyfs.Ok(result)
    }
}

export class PutObjectHandlerResponse implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponse', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                err: false,
                result: cyfs.NONPutObjectResult.Accept
            })
        };
        return cyfs.Ok(result)
    }
}

export class PutObjectHandlerResponseAccept implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAccept', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Accept
            })
        };
        return cyfs.Ok(result)
    }
}
export class PutObjectHandlerResponseAcceptWithSign implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAcceptWithSign', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        await text.signs();
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.AcceptWithSign
            })
        };
        return cyfs.Ok(result)
    }
}
export class PutObjectHandlerResponseAlreadyExists implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAlreadyExists', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.AlreadyExists,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result)
    }
}


export class PutObjectHandlerResponseMerged implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseMerged', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        // 合并 object
        console.info(`object 修改 ${text.desc().calculate_id()}`)
        text.value = `${text.value} merged time=${Date.now()}`;
        const object_id = text.desc().calculate_id();
        const object_raw = text.to_vec().unwrap();
        // 修改object，并保存，然后继续后续路由流程
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Merged,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result)
    }
}

export class PutObjectHandlerResponseUpdated implements cyfs.RouterHandlerPutObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseUpdated', this.handlerId, this.chain)
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        //更新 object
        console.info(`object 修改 ${text.desc().calculate_id()}`)
        text.value = `update object,time=${Date.now()}` //TextObject.create(None, text.id, text.header,`update object,time=${Date.now()}`);
        const object_id = text.desc().calculate_id();
        const object_raw = text.to_vec().unwrap();
        // 修改object，并保存，然后继续后续路由流程
        const result: cyfs.RouterHandlerPutObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Updated,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result)
    }
}


export class GetObjectHandlerDefault implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}






export class GetObjectHandlerDrop implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDrop', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Drop
        };
        return cyfs.Ok(result)
    }
}

export class GetObjectHandlerReject implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result)
    }
}
export class GetObjectHandlerPass implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerPass', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result)
    }
}

export class GetObjectHandlerNewObject implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerNewObject', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);

        // 创建一个新对象并应答
        const obj = cyfs.TextObject.create(cyfs.None, 'answer', `answer a new object ${Date.now()}`, "hello!");
        const object_id = obj.desc().calculate_id();
        const object_raw = obj.to_vec().unwrap();

        console.info(`will resp get_object with ${object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
            })
        };
        return cyfs.Ok(result)
    }
}





export class SelectObjectHandlerPass implements cyfs.RouterHandlerSelectObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'SelectObjectHandlerPass', this.handlerId, this.chain)
        const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerSelectObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result)
    }
}
export class SelectObjectHandlerDrop implements cyfs.RouterHandlerSelectObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'SelectObjectHandlerDrop', this.handlerId, this.chain)
        const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerSelectObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Drop
        };
        return cyfs.Ok(result)
    }
}
export class SelectObjectHandlerReject implements cyfs.RouterHandlerSelectObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'SelectObjectHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerSelectObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result)
    }
}

export class SelectObjectHandlerDefault implements cyfs.RouterHandlerSelectObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'SelectObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerSelectObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}


export class SelectObjectHandlerResponse implements cyfs.RouterHandlerSelectObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'SelectObjectHandlerResponse', this.handlerId, this.chain)
        const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerSelectObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Response
        };
        return cyfs.Ok(result)
    }
}




export class DeleteObjectHandlerPass implements cyfs.RouterHandlerDeleteObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerPass', this.handlerId, this.chain)
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteObjectResult = {
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result)
    }
}

export class DeleteObjectHandlerDrop implements cyfs.RouterHandlerDeleteObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerDrop', this.handlerId, this.chain)
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteObjectResult = {
            action: cyfs.RouterHandlerAction.Drop
        };
        return cyfs.Ok(result)
    }
}
export class DeleteObjectHandlerReject implements cyfs.RouterHandlerDeleteObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteObjectResult = {
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result)
    }
}

export class DeleteObjectHandlerDefault implements cyfs.RouterHandlerDeleteObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteObjectResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}


export class DeleteObjectHandlerResponse implements cyfs.RouterHandlerDeleteObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerResponse', this.handlerId, this.chain)
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteObjectResult = {
            action: cyfs.RouterHandlerAction.Response
        };
        return cyfs.Ok(result)
    }
}

import { stack, stackInfo } from "./stack";
export class PostObjectHandlerDefault implements cyfs.RouterHandlerPostObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        let request = codec.encode_object(param.request);
        param.request.object.object_id
        let run = await stack.non_service().put_object({
            common: {
                req_path: "/qa/put_object",
                dec_id: stackInfo.appID,
                flags: 0,
                level: cyfs.NONAPILevel.NOC //设置路由类型
            },
            object: new cyfs.NONObjectInfo(param.request.object.object_id!, param.request.object.object_raw!)
        })
        assert(!run.err, `post object handler put object failed`)
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerPostObjectResult = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                object: new cyfs.NONObjectInfo(param.request.object.object_id, param.request.object.object_raw)
            })
        };
        return cyfs.Ok(result)
    }
}
export class PostObjectHandlerReject implements cyfs.RouterHandlerPostObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerPostObjectResult = {
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result)
    }
}


export class CryptoHandlerDefault implements cyfs.RouterHandlerSignObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerSignObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSignObjectResult>> {
        console.log("on sign event: sign for object", param.request.object.object_id)
        Emitter.emit('handlerRunning', this.device, 'CryptoHandlerDefault', this.handlerId, this.chain)
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Default
        })
    }

}


export class PutDataHandlerDefault implements cyfs.RouterHandlerPutDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutDataHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NDNPutDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerPutDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

export class PutDataHandlerReject implements cyfs.RouterHandlerPutDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutDataHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NDNPutDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerPutDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

export class GetDataHandlerDefault implements cyfs.RouterHandlerGetDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetDataHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NDNGetDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerGetDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

export class GetDataHandlerReject implements cyfs.RouterHandlerGetDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetDataHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NDNGetDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerGetDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}
export class DeleteDataHandlerDefault implements cyfs.RouterHandlerDeleteDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteDataHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NDNDeleteDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`Delete_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

export class DeleteDataHandlerReject implements cyfs.RouterHandlerDeleteDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerDeleteDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerDeleteDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'DeleteDataHandlerReject', this.handlerId, this.chain)
        const codec = new cyfs.NDNDeleteDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`Delete_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerDeleteDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}



//添加全局handler管理机制
export class handlerManager {
    private handlerList: Array<{ deviceName: string, stack: cyfs.SharedCyfsStack, chain: cyfs.RouterHandlerChain, type: cyfs.RouterHandlerCategory, id: string, routine: any }>
    private checkList: Array<{ deviceName: string, runSum: number, routineType: string, id: string }>
    constructor() {
        this.handlerList = [];
        this.checkList = [];
        this.runEmit();

    }
    async runEmit() {
        Emitter.on('handlerRunning', (r_device, r_handler, r_handlerId, r_chain) => {
            console.log(`设备 ${r_device} 触发handler ${r_handler} id = ${r_handlerId},r_chain = ${r_chain}`);
            //更新运行剩余次数
            for (let i in this.checkList!) {
                if (this.checkList[i].deviceName === r_device && this.checkList[i].routineType === r_handler && this.checkList[i].id === r_handlerId) {
                    this.checkList[i].runSum = this.checkList[i].runSum - 1;
                }
            }
        })
    }
    async addHandler(deviceName: string, stack: cyfs.SharedCyfsStack, type: cyfs.RouterHandlerCategory, chain: cyfs.RouterHandlerChain, id: string, index: number, filter: string, default_action: cyfs.RouterHandlerAction, myHandler: any, routineType: string, runSum: number = 1) {
        //添加handler 数据
        let routine
        if (myHandler == cyfs.None || myHandler == undefined) {
            routine = cyfs.None
        } else {
            routine = cyfs.Some(new myHandler(deviceName, id, `${chain}`))
        }
        let ret1: cyfs.BuckyResult<void> = cyfs.Ok(void (0));
        switch (type) {
            case cyfs.RouterHandlerCategory.PutObject: {
                ret1 = await stack.router_handlers().add_put_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.GetObject: {
                ret1 = await stack.router_handlers().add_get_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.PostObject: {
                ret1 = await stack.router_handlers().add_post_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.DeleteObject: {
                ret1 = await stack.router_handlers().add_delete_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.SelectObject: {
                ret1 = await stack.router_handlers().add_select_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.SignObject: {
                ret1 = await stack.router_handlers().add_sign_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.VerifyObject: {
                ret1 = await stack.router_handlers().add_verify_object_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.PutData: {
                ret1 = await stack.router_handlers().add_put_data_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.GetData: {
                ret1 = await stack.router_handlers().add_get_data_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.DeleteData: {
                ret1 = await stack.router_handlers().add_delete_data_handler(
                    chain,
                    id,
                    index,
                    filter,
                    default_action,
                    routine
                );
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }


        }
        //将添加的handler 数据保存到handlist

        this.handlerList.push({ deviceName, stack, chain, type, id, routine })
        if (routine != cyfs.None) {
            this.checkList.push({ deviceName, runSum, routineType, id })
        }
        return ret1;

    }
    async removehandler(chain: cyfs.RouterHandlerChain, stack: cyfs.SharedCyfsStack, type: cyfs.RouterHandlerCategory, id: string) {
        return stack.router_handlers().remove_handler(chain, type, id)
    }
    async updateHandlerCheckRunSum(list: Array<{ deviceName: string, id: string, runSum: number }>) {
        for (let i in this.checkList) {
            for (let j in list) {
                if (this.checkList[i].id === list[j].id && this.checkList[i].deviceName === list[j].deviceName) {
                    this.checkList[i].runSum = list[j].runSum;
                }
            }
        }
        console.info(`更新后handler 检查列表为${JSON.stringify(this.checkList)}`)
    }
    async consoleHanderNotRun(checkList: Array<{ deviceName: string, runSum: number, routineType: string, id: string }>) {
        for (let i in checkList) {
            if (checkList[i].runSum > 0) {
                console.info(`${checkList[i].deviceName} ${checkList[i].id} 还需要运行 ${checkList[i].runSum} 次`)
            }
        }
    }
    async startHandlerCheck(timeout: number) { //,checkList:Array<{deviceName:string,runSum:number,routineType:string,id:string}> = this.checkList
        console.info(`开始监听handler执行`)
        let start = Date.now();
        //let checkList = this.checkList

        let check = 0;
        let checkInfo = 'wait'
        let waitTime = 200;
        while (check < timeout) {
            checkInfo = 'success'
            console.info("check run")
            // if(Date.now() - start >timeout){
            //     Emitter.removeListener('handlerRunning',()=>{})
            //     await this.consoleHanderNotRun(this.checkList)
            //     return {err:true,log:"监听handler运行超时退出",checkList:this.checkList}
            // }
            //检查是否运行完成

            for (let i in this.checkList) {
                if (this.checkList[i].runSum < 0) {
                    Emitter.removeListener('handlerRunning', () => { })
                    console.info(`handler触发次数超过限制 ${this.checkList[i].deviceName} ${this.checkList[i].id}`)
                    return { err: true, log: `handler触发次数超过限制 ${this.checkList[i].deviceName} ${this.checkList[i].id}`, checkList: this.checkList }
                }
                if (this.checkList[i].runSum > 0) {
                    checkInfo = 'wait'
                }
            }


            await new Promise(async (v) => {
                setTimeout(async => {
                    console.info(`handlerRunningCheck 监听检查中，停止${waitTime}ms后检查`)
                    v("")
                }, waitTime)
            })
            if (waitTime < 5000) {
                waitTime = waitTime * 2
            }
            check = check + waitTime;
        }
        console.info(checkInfo)
        if (checkInfo == 'success') {
            Emitter.removeListener('handlerRunning', () => { })
            console.info("handler checkList 全部执行完成")
            return { err: false, log: `handler checkList 全部执行完成`, checkList: this.checkList }
        }
        Emitter.removeListener('handlerRunning', () => { })
        await this.consoleHanderNotRun(this.checkList)
        return { err: true, log: "监听handler运行超时退出", checkList: this.checkList }

    }



    async clearAllHandler() {
        let handlerList = this.handlerList
        //handlerLists 数据清空
        this.handlerList = [];
        this.checkList = [];
        //每个函数执行前，清除所有handler
        for (let i in handlerList) {
            console.info(`${handlerList[i].deviceName}清除handler ${handlerList[i].type} ${handlerList[i].id}`)
            let err = await handlerList[i].stack.router_handlers().remove_handler(handlerList[i].chain, handlerList[i].type, handlerList[i].id)
            assert.equal(err.err, false);

        }
        return;
    }
}



