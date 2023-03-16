"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerManager = exports.DeleteDataHandlerReject = exports.DeleteDataHandlerDefault = exports.GetDataHandlerReject = exports.GetDataHandlerDefault = exports.PutDataHandlerReject = exports.PutDataHandlerDefault = exports.DecryptDataHandlerResponse = exports.DecryptDataHandlerReject = exports.DecryptDataHandlerDrop = exports.DecryptDataHandlerPass = exports.DecryptDataHandlerDefault = exports.EncryptDataHandlerResponse = exports.EncryptDataHandlerReject = exports.EncryptDataHandlerDrop = exports.EncryptDataHandlerPass = exports.EncryptDataHandlerDefault = exports.VerifyHandlerDefault = exports.SignObjectHandlerDefault = exports.PostObjectHandlerPass = exports.PostObjectHandlerReject = exports.PostObjectHandlerDefault = exports.DeleteObjectHandlerResponse = exports.DeleteObjectHandlerDefault = exports.DeleteObjectHandlerReject = exports.DeleteObjectHandlerDrop = exports.DeleteObjectHandlerPass = exports.GetObjectHandlerNewObject = exports.GetObjectHandlerPass = exports.GetObjectHandlerReject = exports.GetObjectHandlerDrop = exports.GetObjectHandlerDefault = exports.PutObjectHandlerResponseUpdated = exports.PutObjectHandlerResponseMerged = exports.PutObjectHandlerResponseAlreadyExists = exports.PutObjectHandlerResponseAcceptWithSign = exports.PutObjectHandlerResponseAccept = exports.PutObjectHandlerResponse = exports.PutObjectHandlerPass = exports.PutObjectHandlerDrop = exports.PutObjectHandlerReject = exports.PutObjectHandlerDefault = exports.Emitter = void 0;
const assert_1 = __importDefault(require("assert"));
const cyfs = __importStar(require("../../cyfs"));
const events = __importStar(require("events"));
exports.Emitter = new events.EventEmitter();
class PutObjectHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default,
            request: param.request,
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerDefault = PutObjectHandlerDefault;
class PutObjectHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Reject,
            request: param.request,
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerReject = PutObjectHandlerReject;
class PutObjectHandlerDrop {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerDrop', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Drop,
            request: param.request
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerDrop = PutObjectHandlerDrop;
class PutObjectHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerPass', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Pass,
            request: param.request,
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerPass = PutObjectHandlerPass;
class PutObjectHandlerResponse {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponse', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                err: false,
                result: cyfs.NONPutObjectResult.Accept
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponse = PutObjectHandlerResponse;
class PutObjectHandlerResponseAccept {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAccept', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Accept
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponseAccept = PutObjectHandlerResponseAccept;
class PutObjectHandlerResponseAcceptWithSign {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAcceptWithSign', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        await text.signs();
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.AcceptWithSign
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponseAcceptWithSign = PutObjectHandlerResponseAcceptWithSign;
class PutObjectHandlerResponseAlreadyExists {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseAlreadyExists', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.AlreadyExists,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponseAlreadyExists = PutObjectHandlerResponseAlreadyExists;
class PutObjectHandlerResponseMerged {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseMerged', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        // 合并 object
        console.info(`object 修改 ${text.desc().calculate_id()}`);
        text.value = `${text.value} merged time=${Date.now()}`;
        const object_id = text.desc().calculate_id();
        const object_raw = text.to_vec().unwrap();
        // 修改object，并保存，然后继续后续路由流程
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Merged,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponseMerged = PutObjectHandlerResponseMerged;
class PutObjectHandlerResponseUpdated {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutObjectHandlerResponseUpdated', this.handlerId, this.chain);
        const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
        console.info('put_object param: ', codec.encode_object(param.request));
        const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
        console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
        //更新 object
        console.info(`object 修改 ${text.desc().calculate_id()}`);
        text.value = `update object,time=${Date.now()}`; //TextObject.create(None, text.id, text.header,`update object,time=${Date.now()}`);
        const object_id = text.desc().calculate_id();
        const object_raw = text.to_vec().unwrap();
        // 修改object，并保存，然后继续后续路由流程
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                result: cyfs.NONPutObjectResult.Updated,
                object: {
                    object_raw: new Uint8Array(param.request.object.object_raw),
                },
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PutObjectHandlerResponseUpdated = PutObjectHandlerResponseUpdated;
class GetObjectHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);
        const result = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.GetObjectHandlerDefault = GetObjectHandlerDefault;
class GetObjectHandlerDrop {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDrop', this.handlerId, this.chain);
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);
        const result = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Drop
        };
        return cyfs.Ok(result);
    }
}
exports.GetObjectHandlerDrop = GetObjectHandlerDrop;
class GetObjectHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);
        const result = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result);
    }
}
exports.GetObjectHandlerReject = GetObjectHandlerReject;
class GetObjectHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerPass', this.handlerId, this.chain);
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);
        const result = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result);
    }
}
exports.GetObjectHandlerPass = GetObjectHandlerPass;
class GetObjectHandlerNewObject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerNewObject', this.handlerId, this.chain);
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        console.info(`get_object: id=${param.request.object_id}`);
        // 创建一个新对象并应答
        const obj = cyfs.TextObject.create(undefined, 'answer', `answer a new object ${Date.now()}`, "hello!");
        const object_id = obj.desc().calculate_id();
        const object_raw = obj.to_vec().unwrap();
        console.info(`will resp get_object with ${object_id}`);
        const result = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                object: cyfs.NONObjectInfo.new_from_object_raw(object_raw).unwrap()
            })
        };
        return cyfs.Ok(result);
    }
}
exports.GetObjectHandlerNewObject = GetObjectHandlerNewObject;
// export class SelectObjectHandlerPass  implements cyfs.RouterHandlerSelectObjectRoutine {
//     private device : string;
//     private handlerId : string;
//     private chain :string
//     constructor(device:string,handlerId : string,chain:string){
//         this.device = device;
//         this.handlerId = handlerId;
//         this.chain = chain ;
//     }
//     async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
//         Emitter.emit('handlerRunning',this.device,'SelectObjectHandlerPass',this.handlerId,this.chain)
//         const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
//         console.info(codec.encode_object(param.request));
//         //console.info(`get_object: id=${param.object_id}`);
//         const result: cyfs.RouterHandlerSelectObjectResult = {
//             // 直接终止路由并以resp作为应答
//             // 如果需要同时保存，那么替换为ResponseAndSave即可
//             action: cyfs.RouterHandlerAction.Pass
//         };
//         return cyfs.Ok(result)
//     }
// }
// export class SelectObjectHandlerDrop implements cyfs.RouterHandlerSelectObjectRoutine {
//     private device : string;
//     private handlerId : string;
//     private chain :string
//     constructor(device:string,handlerId : string,chain:string){
//         this.device = device;
//         this.handlerId = handlerId;
//         this.chain = chain ;
//     }
//     async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
//         Emitter.emit('handlerRunning',this.device,'SelectObjectHandlerDrop',this.handlerId,this.chain)
//         const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
//         console.info(codec.encode_object(param.request));
//         //console.info(`get_object: id=${param.object_id}`);
//         const result: cyfs.RouterHandlerSelectObjectResult = {
//             // 直接终止路由并以resp作为应答
//             // 如果需要同时保存，那么替换为ResponseAndSave即可
//             action: cyfs.RouterHandlerAction.Drop
//         };
//         return cyfs.Ok(result)
//     }
// }
// export class SelectObjectHandlerReject  implements cyfs.RouterHandlerSelectObjectRoutine {
//     private device : string;
//     private handlerId : string;
//     private chain :string
//     constructor(device:string,handlerId : string,chain:string){
//         this.device = device;
//         this.handlerId = handlerId;
//         this.chain = chain ;
//     }
//     async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
//         Emitter.emit('handlerRunning',this.device,'SelectObjectHandlerReject',this.handlerId,this.chain)
//         const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
//         console.info(codec.encode_object(param.request));
//         //console.info(`get_object: id=${param.object_id}`);
//         const result: cyfs.RouterHandlerSelectObjectResult = {
//             // 直接终止路由并以resp作为应答
//             // 如果需要同时保存，那么替换为ResponseAndSave即可
//             action: cyfs.RouterHandlerAction.Reject
//         };
//         return cyfs.Ok(result)
//     }
// }
// export class SelectObjectHandlerDefault  implements cyfs.RouterHandlerSelectObjectRoutine {
//     private device : string;
//     private handlerId : string;
//     private chain :string
//     constructor(device:string,handlerId : string,chain:string){
//         this.device = device;
//         this.handlerId = handlerId;
//         this.chain = chain ;
//     }
//     async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
//         Emitter.emit('handlerRunning',this.device,'SelectObjectHandlerDefault',this.handlerId,this.chain)
//         const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
//         console.info(codec.encode_object(param.request));
//         //console.info(`get_object: id=${param.object_id}`);
//         const result: cyfs.RouterHandlerSelectObjectResult = {
//             // 直接终止路由并以resp作为应答
//             // 如果需要同时保存，那么替换为ResponseAndSave即可
//             action: cyfs.RouterHandlerAction.Default
//         };
//         return cyfs.Ok(result)
//     }
// }
// export class SelectObjectHandlerResponse  implements cyfs.RouterHandlerSelectObjectRoutine {
//     private device : string;
//     private handlerId : string;
//     private chain :string
//     constructor(device:string,handlerId : string,chain:string){
//         this.device = device;
//         this.handlerId = handlerId;
//         this.chain = chain ;
//     }
//     async call(param: cyfs.RouterHandlerSelectObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerSelectObjectResult>> {
//         Emitter.emit('handlerRunning',this.device,'SelectObjectHandlerResponse',this.handlerId,this.chain)
//         const codec = new cyfs.NONSelectObjectOutputRequestJsonCodec();
//         console.info(codec.encode_object(param.request));
//         //console.info(`get_object: id=${param.object_id}`);
//         const result: cyfs.RouterHandlerSelectObjectResult = {
//             // 直接终止路由并以resp作为应答
//             // 如果需要同时保存，那么替换为ResponseAndSave即可
//             action: cyfs.RouterHandlerAction.Response
//         };
//         return cyfs.Ok(result)
//     }
// }
class DeleteObjectHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerPass', this.handlerId, this.chain);
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteObjectHandlerPass = DeleteObjectHandlerPass;
class DeleteObjectHandlerDrop {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerDrop', this.handlerId, this.chain);
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Drop
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteObjectHandlerDrop = DeleteObjectHandlerDrop;
class DeleteObjectHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteObjectHandlerReject = DeleteObjectHandlerReject;
class DeleteObjectHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteObjectHandlerDefault = DeleteObjectHandlerDefault;
class DeleteObjectHandlerResponse {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteObjectHandlerResponse', this.handlerId, this.chain);
        const codec = new cyfs.NONDeleteObjectOutputRequestJsonCodec();
        const rcodec = new cyfs.NONDeleteObjectInputResponseJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            response: rcodec.decode_object(this.handlerId)
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteObjectHandlerResponse = DeleteObjectHandlerResponse;
class PostObjectHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerDefault', this.handlerId, this.chain);
        // const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        // let request = codec.encode_object(param.request);
        // param.request.object.object_id
        // let run = await stack.non_service().put_object({
        //     common: {
        //         req_path: undefined,
        //         dec_id: undefined,
        //         flags: 0,
        //         level: cyfs.NONAPILevel.NOC //设置路由类型
        //     },
        //     object: new cyfs.NONObjectInfo(param.request.object.object_id!, param.request.object.object_raw!)
        // })
        // assert(!run.err, `post object handler put object failed`)
        // //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            request: param.request,
            response: cyfs.Ok({
                object: new cyfs.NONObjectInfo(param.request.object.object_id, param.request.object.object_raw)
            })
        };
        return cyfs.Ok(result);
    }
}
exports.PostObjectHandlerDefault = PostObjectHandlerDefault;
class PostObjectHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Reject
        };
        return cyfs.Ok(result);
    }
}
exports.PostObjectHandlerReject = PostObjectHandlerReject;
class PostObjectHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerPass', this.handlerId, this.chain);
        const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Pass
        };
        return cyfs.Ok(result);
    }
}
exports.PostObjectHandlerPass = PostObjectHandlerPass;
class SignObjectHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.object.object_id);
        exports.Emitter.emit('handlerRunning', this.device, 'CryptoHandlerDefault', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Default
        });
    }
}
exports.SignObjectHandlerDefault = SignObjectHandlerDefault;
class VerifyHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on verify event: verify for sign object", param.request.object.object_id);
        exports.Emitter.emit('handlerRunning', this.device, 'VerifyHandlerDefault', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Default
        });
    }
}
exports.VerifyHandlerDefault = VerifyHandlerDefault;
class EncryptDataHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.encrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'EncryptDataHandlerDefault', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Default,
            request: param.request
        });
    }
}
exports.EncryptDataHandlerDefault = EncryptDataHandlerDefault;
class EncryptDataHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.encrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'EncryptDataHandlerPass', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Pass,
            request: param.request
        });
    }
}
exports.EncryptDataHandlerPass = EncryptDataHandlerPass;
class EncryptDataHandlerDrop {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.encrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'EncryptDataHandlerDrop', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Drop,
            request: param.request
        });
    }
}
exports.EncryptDataHandlerDrop = EncryptDataHandlerDrop;
class EncryptDataHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.encrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'EncryptDataHandlerReject', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Reject,
            request: param.request
        });
    }
}
exports.EncryptDataHandlerReject = EncryptDataHandlerReject;
class EncryptDataHandlerResponse {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: sign for object", param.request.encrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'EncryptDataHandlerResponse', this.handlerId, this.chain);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                err: false,
                result: new Uint8Array(123)
            })
        };
        return cyfs.Ok(result);
    }
}
exports.EncryptDataHandlerResponse = EncryptDataHandlerResponse;
class DecryptDataHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on verify event: for DecryptDataHandlerDefault", param.request.decrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'DecryptDataHandlerDefault', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Default
        });
    }
}
exports.DecryptDataHandlerDefault = DecryptDataHandlerDefault;
class DecryptDataHandlerPass {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on sign event: for DecryptDataHandlerPass", param.request.decrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'DecryptDataHandlerPass', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Pass,
            request: param.request
        });
    }
}
exports.DecryptDataHandlerPass = DecryptDataHandlerPass;
class DecryptDataHandlerDrop {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on decrypt event: for DecryptDataHandlerDrop", param.request.decrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'DecryptDataHandlerDrop', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Drop,
            request: param.request
        });
    }
}
exports.DecryptDataHandlerDrop = DecryptDataHandlerDrop;
class DecryptDataHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on  Decrypt event: for DecryptDataHandlerReject", param.request.decrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'DecryptDataHandlerReject', this.handlerId, this.chain);
        return cyfs.Ok({
            action: cyfs.RouterHandlerAction.Reject,
            request: param.request
        });
    }
}
exports.DecryptDataHandlerReject = DecryptDataHandlerReject;
class DecryptDataHandlerResponse {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        console.log("on  Decrypt event: for DecryptDataHandlerResponse", param.request.decrypt_type);
        exports.Emitter.emit('handlerRunning', this.device, 'DecryptDataHandlerResponse', this.handlerId, this.chain);
        const result = {
            action: cyfs.RouterHandlerAction.Response,
            response: cyfs.Ok({
                err: false,
                data: new Uint8Array(123),
                result: cyfs.DecryptDataResult.Decrypted
            })
        };
        return cyfs.Ok(result);
    }
}
exports.DecryptDataHandlerResponse = DecryptDataHandlerResponse;
class PutDataHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutDataHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NDNPutDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.PutDataHandlerDefault = PutDataHandlerDefault;
class PutDataHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'PutDataHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NDNPutDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.PutDataHandlerReject = PutDataHandlerReject;
class GetDataHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetDataHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NDNGetDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.GetDataHandlerDefault = GetDataHandlerDefault;
class GetDataHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'GetDataHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NDNGetDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.GetDataHandlerReject = GetDataHandlerReject;
class DeleteDataHandlerDefault {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteDataHandlerDefault', this.handlerId, this.chain);
        const codec = new cyfs.NDNDeleteDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`Delete_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteDataHandlerDefault = DeleteDataHandlerDefault;
class DeleteDataHandlerReject {
    constructor(device, handlerId, chain) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param) {
        exports.Emitter.emit('handlerRunning', this.device, 'DeleteDataHandlerReject', this.handlerId, this.chain);
        const codec = new cyfs.NDNDeleteDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`Delete_object: id=${param.object_id}`);
        const result = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result);
    }
}
exports.DeleteDataHandlerReject = DeleteDataHandlerReject;
//添加全局handler管理机制
class HandlerManager {
    constructor() {
        this.handlerList = [];
        this.checkList = [];
        this.runEmit();
    }
    async runEmit() {
        exports.Emitter.on('handlerRunning', (r_device, r_handler, r_handlerId, r_chain) => {
            console.log(`设备 ${r_device} 触发handler ${r_handler} id = ${r_handlerId},r_chain = ${r_chain}`);
            //更新运行剩余次数
            for (let i in this.checkList) {
                if (this.checkList[i].deviceName === r_device && this.checkList[i].routineType === r_handler && this.checkList[i].id === r_handlerId) {
                    this.checkList[i].runSum = this.checkList[i].runSum - 1;
                }
            }
        });
    }
    async addHandler(deviceName, stack, type, chain, id, index, filter, req_path, default_action, myHandler, routineType, runSum = 1) {
        //添加handler 数据
        let routine;
        if (myHandler == undefined || myHandler == null) {
            routine = undefined;
        }
        else {
            routine = new myHandler(deviceName, id, `${chain}`);
        }
        let ret1 = cyfs.Ok(void (0));
        switch (type) {
            case cyfs.RouterHandlerCategory.PutObject: {
                ret1 = await stack.router_handlers().add_put_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.GetObject: {
                ret1 = await stack.router_handlers().add_get_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.PostObject: {
                ret1 = await stack.router_handlers().add_post_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.DeleteObject: {
                ret1 = await stack.router_handlers().add_delete_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            // case  cyfs.RouterHandlerCategory.SelectObject :{
            //     ret1 = await stack.router_handlers().add_select_object_handler(
            //         chain,
            //         id,
            //         index,
            //         filter,
            //         default_action,
            //         routine
            //     );
            //     console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
            //     break;
            // }
            case cyfs.RouterHandlerCategory.SignObject: {
                ret1 = await stack.router_handlers().add_sign_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.VerifyObject: {
                ret1 = await stack.router_handlers().add_verify_object_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.EncryptData: {
                ret1 = await stack.router_handlers().add_encrypt_data_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.DecryptData: {
                ret1 = await stack.router_handlers().add_decrypt_data_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.PutData: {
                ret1 = await stack.router_handlers().add_put_data_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.GetData: {
                ret1 = await stack.router_handlers().add_get_data_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
            case cyfs.RouterHandlerCategory.DeleteData: {
                ret1 = await stack.router_handlers().add_delete_data_handler(chain, id, index, filter, req_path, default_action, routine);
                console.info(`${deviceName} 添加handler ${id},结果为${JSON.stringify(ret1)}`);
                break;
            }
        }
        //将添加的handler 数据保存到handlist
        this.handlerList.push({ deviceName, stack, chain, type, id, routine });
        if (routine != undefined) {
            this.checkList.push({ deviceName, runSum, routineType, id });
        }
        return ret1;
    }
    async removehandler(chain, stack, type, id) {
        return stack.router_handlers().remove_handler(chain, type, id);
    }
    async updateHandlerCheckRunSum(list) {
        for (let i in this.checkList) {
            for (let j in list) {
                if (this.checkList[i].id === list[j].id && this.checkList[i].deviceName === list[j].deviceName) {
                    this.checkList[i].runSum = list[j].runSum;
                }
            }
        }
        console.info(`更新后handler 检查列表为${JSON.stringify(this.checkList)}`);
    }
    async consoleHanderNotRun(checkList) {
        for (let i in checkList) {
            if (checkList[i].runSum > 0) {
                console.info(`${checkList[i].deviceName} ${checkList[i].id} 还需要运行 ${checkList[i].runSum} 次`);
            }
        }
    }
    async startHandlerCheck(timeout) {
        console.info(`开始监听handler执行`);
        let start = Date.now();
        //let checkList = this.checkList
        let check = 0;
        let checkInfo = 'wait';
        let waitTime = 200;
        while (check < timeout) {
            checkInfo = 'success';
            console.info("check run");
            // if(Date.now() - start >timeout){
            //     Emitter.removeListener('handlerRunning',()=>{})
            //     await this.consoleHanderNotRun(this.checkList)
            //     return {err:true,log:"监听handler运行超时退出",checkList:this.checkList}
            // }
            //检查是否运行完成
            for (let i in this.checkList) {
                if (this.checkList[i].runSum < 0) {
                    exports.Emitter.removeListener('handlerRunning', () => { });
                    console.info(`handler触发次数超过限制 ${this.checkList[i].deviceName} ${this.checkList[i].id}`);
                    return { err: true, log: `handler触发次数超过限制 ${this.checkList[i].deviceName} ${this.checkList[i].id}`, checkList: this.checkList };
                }
                if (this.checkList[i].runSum > 0) {
                    checkInfo = 'wait';
                }
            }
            await new Promise(async (v) => {
                setTimeout(async => {
                    console.info(`handlerRunningCheck 监听检查中，停止${waitTime}ms后检查`);
                    v("");
                }, waitTime);
            });
            if (waitTime < 5000) {
                waitTime = waitTime * 2;
            }
            check = check + waitTime;
        }
        console.info(checkInfo);
        if (checkInfo == 'success') {
            exports.Emitter.removeListener('handlerRunning', () => { });
            console.info("handler checkList 全部执行完成");
            return { err: false, log: `handler checkList 全部执行完成`, checkList: this.checkList };
        }
        exports.Emitter.removeListener('handlerRunning', () => { });
        await this.consoleHanderNotRun(this.checkList);
        return { err: true, log: "监听handler运行超时退出", checkList: this.checkList };
    }
    async clearAllHandler() {
        let handlerList = this.handlerList;
        //handlerLists 数据清空
        this.handlerList = [];
        this.checkList = [];
        //每个函数执行前，清除所有handler
        for (let i in handlerList) {
            console.info(`${handlerList[i].deviceName}清除handler ${handlerList[i].type} ${handlerList[i].id}`);
            let err = await handlerList[i].stack.router_handlers().remove_handler(handlerList[i].chain, handlerList[i].type, handlerList[i].id);
            assert_1.default.equal(err.err, false);
        }
        return;
    }
}
exports.HandlerManager = HandlerManager;
