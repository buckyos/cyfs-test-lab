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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerRequestDecoder = exports.HandlerRequest = exports.HandlerRequestIdDecoder = exports.HandlerRequestId = exports.HandlerRequestBuilder = exports.HandlerRequestDescDecoder = exports.HandlerRequestDesc = exports.HandlerRequestBodyContentDecoder = exports.HandlerRequestBodyContent = exports.HandlerRequestDescContentDecoder = exports.HandlerRequestDescContent = exports.HandlerRequestDescTypeInfo = void 0;
const index_1 = require("./index");
const cyfs = __importStar(require("../../cyfs"));
// 1. 定义一个Desc类型信息
class HandlerRequestDescTypeInfo extends cyfs.DescTypeInfo {
    obj_type() {
        return index_1.CustumObjectType.HandlerRequest;
    }
    sub_desc_type() {
        return {
            owner_type: "option",
            area_type: "option",
            author_type: "option",
            // key_type: "single_key"  // 公钥类型，"disable": 禁用，"single_key": 单PublicKey，"mn_key": M-N 公钥对
            // 还不知道怎么用key 暂时先disable
            key_type: 'disable'
        };
    }
}
exports.HandlerRequestDescTypeInfo = HandlerRequestDescTypeInfo;
// 2. 定义一个类型信息常量
const HandlerRequest_DESC_TYPE_INFO = new HandlerRequestDescTypeInfo();
// 3. 定义DescContent，继承自DescContent
class HandlerRequestDescContent extends cyfs.DescContent {
    constructor(request_type) {
        super();
        this.request_type = request_type;
        this.request_type = request_type;
    }
    get_request_type() {
        return this.request_type;
    }
    type_info() {
        return HandlerRequest_DESC_TYPE_INFO;
    }
    raw_measure() {
        let size = 0;
        size += this.request_type.raw_measure().unwrap();
        console.info(`######## HandlerRequestDescContent raw_measure = ${this.request_type},len = ${size}`);
        return cyfs.Ok(size);
    }
    raw_encode(buf) {
        buf = this.request_type.raw_encode(buf).unwrap();
        return cyfs.Ok(buf);
    }
}
exports.HandlerRequestDescContent = HandlerRequestDescContent;
// 4. 定义一个DescContent的解码器
class HandlerRequestDescContentDecoder extends cyfs.DescContentDecoder {
    type_info() {
        return HandlerRequest_DESC_TYPE_INFO;
    }
    raw_decode(buf) {
        console.info(`######## HandlerRequestDescContent raw_decode len = ${buf.length}`);
        let request_type;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [request_type, buf] = r.unwrap();
        }
        console.info(`######## HandlerRequestDescContent raw_decode = ${request_type},len = ${buf.length} `);
        const self = new HandlerRequestDescContent(request_type);
        const ret = [self, buf];
        return cyfs.Ok(ret);
    }
}
exports.HandlerRequestDescContentDecoder = HandlerRequestDescContentDecoder;
// 5. 定义一个BodyContent，继承自RawEncode
class HandlerRequestBodyContent extends cyfs.BodyContent {
    constructor(request_json, request_buffer) {
        super();
        this.request_json = request_json;
        if (request_buffer) {
            this.request_buffer = new cyfs.BuckyBuffer(request_buffer);
        }
    }
    get_request_json() {
        return this.request_json;
    }
    get_request_buffer() {
        return this.request_buffer;
    }
    raw_measure() {
        let size = 0;
        size += this.request_json.raw_measure().unwrap();
        size += this.request_buffer.raw_measure().unwrap();
        return cyfs.Ok(size);
    }
    raw_encode(buf) {
        buf = this.request_json.raw_encode(buf).unwrap();
        if (this.request_buffer) {
            buf = this.request_buffer.raw_encode(buf).unwrap();
        }
        return cyfs.Ok(buf);
    }
}
exports.HandlerRequestBodyContent = HandlerRequestBodyContent;
// 6. 定义一个BodyContent的解码器
class HandlerRequestBodyContentDecoder extends cyfs.BodyContentDecoder {
    raw_decode(buf) {
        let request_json;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [request_json, buf] = r.unwrap();
        }
        let request_buffer;
        {
            let r = new cyfs.BuckyBufferDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [request_buffer, buf] = r.unwrap();
        }
        const body_content = new HandlerRequestBodyContent(request_json, request_buffer === null || request_buffer === void 0 ? void 0 : request_buffer.buffer);
        const ret = [body_content, buf];
        return cyfs.Ok(ret);
    }
}
exports.HandlerRequestBodyContentDecoder = HandlerRequestBodyContentDecoder;
// 7. 定义组合类型
class HandlerRequestDesc extends cyfs.NamedObjectDesc {
}
exports.HandlerRequestDesc = HandlerRequestDesc;
class HandlerRequestDescDecoder extends cyfs.NamedObjectDescDecoder {
    constructor() {
        super(new HandlerRequestDescContentDecoder());
    }
}
exports.HandlerRequestDescDecoder = HandlerRequestDescDecoder;
class HandlerRequestBuilder extends cyfs.NamedObjectBuilder {
}
exports.HandlerRequestBuilder = HandlerRequestBuilder;
// 通过继承的方式具体化
class HandlerRequestId extends cyfs.NamedObjectId {
    static default() {
        return cyfs.named_id_gen_default(index_1.CustumObjectType.HandlerRequest);
    }
    static from_base_58(s) {
        return cyfs.named_id_from_base_58(index_1.CustumObjectType.HandlerRequest, s);
    }
    static try_from_object_id(id) {
        return cyfs.named_id_try_from_object_id(index_1.CustumObjectType.HandlerRequest, id);
    }
}
exports.HandlerRequestId = HandlerRequestId;
class HandlerRequestIdDecoder extends cyfs.NamedObjectIdDecoder {
    constructor() {
        super(index_1.CustumObjectType.HandlerRequest);
    }
}
exports.HandlerRequestIdDecoder = HandlerRequestIdDecoder;
// 定义HandlerRequest对象
// 提供创建方法和其他自定义方法
class HandlerRequest extends cyfs.NamedObject {
    static create(request_type, request_json, request_buffer) {
        const desc_content = new HandlerRequestDescContent(new cyfs.BuckyString(request_type));
        if (!request_buffer || request_buffer.length == 0) {
            request_buffer = Buffer.from("0");
        }
        const body_content = new HandlerRequestBodyContent(new cyfs.BuckyString(request_json), request_buffer);
        const builder = new cyfs.NamedObjectBuilder(desc_content, body_content);
        const self = builder.build(HandlerRequest);
        return new HandlerRequest(self.desc(), self.body(), self.signs(), self.nonce());
    }
    request_type() {
        return this.desc().content().get_request_type().toString();
    }
    request_json_str() {
        return this.body_expect().content().get_request_json().toString();
    }
    request_buffer() {
        return this.body_expect().content().get_request_buffer();
    }
}
exports.HandlerRequest = HandlerRequest;
// 9. 定义HandlerRequest解码器
class HandlerRequestDecoder extends cyfs.NamedObjectDecoder {
    constructor() {
        super(new HandlerRequestDescContentDecoder(), new HandlerRequestBodyContentDecoder(), HandlerRequest);
    }
    raw_decode(buf) {
        return super.raw_decode(buf).map((r) => {
            const [obj, _buf] = r;
            const sub_obj = new HandlerRequest(obj.desc(), obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf];
        });
    }
}
exports.HandlerRequestDecoder = HandlerRequestDecoder;
