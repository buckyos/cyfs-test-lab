"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerRequestObjectDecoder = exports.HandlerRequestObject = exports.HandlerRequestObjectIdDecoder = exports.HandlerRequestObjectId = exports.HandlerRequestObjectBuilder = exports.HandlerRequestObjectDescDecoder = exports.HandlerRequestObjectDesc = exports.HandlerRequestObjectBodyContentDecoder = exports.HandlerRequestObjectBodyContent = exports.HandlerRequestObjectDescContentDecoder = exports.HandlerRequestObjectDescContent = exports.HandlerRequestObjectDescTypeInfo = void 0;
const cyfs_1 = require("../../cyfs");
const cyfs_2 = require("../../cyfs");
const index_1 = require("./index");
const codec_1 = require("../codec");
const cyfs_3 = require("../../cyfs");
class HandlerRequestObjectDescTypeInfo extends cyfs_1.DescTypeInfo {
    obj_type() {
        return index_1.CustumObjectType.HandlerRequest;
    }
    sub_desc_type() {
        return {
            owner_type: "option",
            area_type: "disable",
            author_type: "disable",
            key_type: "disable"
        };
    }
}
exports.HandlerRequestObjectDescTypeInfo = HandlerRequestObjectDescTypeInfo;
const DECAPP_DESC_TYPE_INFO = new HandlerRequestObjectDescTypeInfo();
class HandlerRequestObjectDescContent extends cyfs_3.ProtobufDescContent {
    constructor(id, request_type) {
        super();
        this.id = id;
        this.request_type = request_type;
    }
    type_info() {
        return DECAPP_DESC_TYPE_INFO;
    }
    set_id(id) {
        this.id = id;
    }
    set_request_type(request_type) {
        this.request_type = request_type;
    }
    try_to_proto() {
        const target = new codec_1.protos.HandlerRequestDescContent();
        target.setId(this.id);
        target.setRequestType(this.request_type);
        return cyfs_2.Ok(target);
    }
}
exports.HandlerRequestObjectDescContent = HandlerRequestObjectDescContent;
class HandlerRequestObjectDescContentDecoder extends cyfs_3.ProtobufDescContentDecoder {
    constructor() {
        super(codec_1.protos.HandlerRequestDescContent.deserializeBinary);
    }
    type_info() {
        return DECAPP_DESC_TYPE_INFO;
    }
    try_from_proto(value) {
        const result = new HandlerRequestObjectDescContent(value.getId(), value.getRequestType());
        return cyfs_2.Ok(result);
    }
}
exports.HandlerRequestObjectDescContentDecoder = HandlerRequestObjectDescContentDecoder;
class HandlerRequestObjectBodyContent extends cyfs_3.ProtobufBodyContent {
    constructor(request_json, request_buffer) {
        super();
        this.request_json = request_json;
        this.request_buffer = request_buffer;
    }
    set_request_json(request_json) {
        this.request_json = request_json;
    }
    set_request_buffer(request_buffer) {
        this.request_buffer = request_buffer;
    }
    try_to_proto() {
        const target = new codec_1.protos.HandlerRequestContent();
        target.setRequestJson(this.request_json);
        target.setRequestBuffer(this.request_buffer);
        return cyfs_2.Ok(target);
    }
}
exports.HandlerRequestObjectBodyContent = HandlerRequestObjectBodyContent;
class HandlerRequestObjectBodyContentDecoder extends cyfs_3.ProtobufBodyContentDecoder {
    constructor() {
        super(codec_1.protos.HandlerRequestContent.deserializeBinary);
    }
    try_from_proto(value) {
        const result = new HandlerRequestObjectBodyContent(value.getRequestJson(), value.getRequestBuffer_asU8());
        return cyfs_2.Ok(result);
    }
}
exports.HandlerRequestObjectBodyContentDecoder = HandlerRequestObjectBodyContentDecoder;
class HandlerRequestObjectDesc extends cyfs_1.NamedObjectDesc {
}
exports.HandlerRequestObjectDesc = HandlerRequestObjectDesc;
class HandlerRequestObjectDescDecoder extends cyfs_1.NamedObjectDescDecoder {
}
exports.HandlerRequestObjectDescDecoder = HandlerRequestObjectDescDecoder;
class HandlerRequestObjectBuilder extends cyfs_1.NamedObjectBuilder {
}
exports.HandlerRequestObjectBuilder = HandlerRequestObjectBuilder;
class HandlerRequestObjectId extends cyfs_1.NamedObjectId {
    constructor(id) {
        super(index_1.CustumObjectType.HandlerRequest, id);
    }
    static default() {
        return cyfs_1.named_id_gen_default(index_1.CustumObjectType.HandlerRequest);
    }
    static from_base_58(s) {
        return cyfs_1.named_id_from_base_58(index_1.CustumObjectType.HandlerRequest, s);
    }
    static try_from_object_id(id) {
        return cyfs_1.named_id_try_from_object_id(index_1.CustumObjectType.HandlerRequest, id);
    }
}
exports.HandlerRequestObjectId = HandlerRequestObjectId;
class HandlerRequestObjectIdDecoder extends cyfs_1.NamedObjectIdDecoder {
    constructor() {
        super(index_1.CustumObjectType.HandlerRequest);
    }
}
exports.HandlerRequestObjectIdDecoder = HandlerRequestObjectIdDecoder;
class HandlerRequestObject extends cyfs_1.NamedObject {
    static build(owner, request_type, id, request_json, request_buffer) {
        const desc_content = new HandlerRequestObjectDescContent(id, request_type);
        const body_content = new HandlerRequestObjectBodyContent(request_json, request_buffer);
        return new HandlerRequestObjectBuilder(desc_content, body_content).option_owner(owner);
    }
    static create(owner, request_type, id, request_json, request_buffer) {
        const builder = this.build(owner, request_type, id, request_json, request_buffer);
        return builder.no_create_time().build(HandlerRequestObject);
    }
    get id() {
        return this.desc().content().id;
    }
    get request_type() {
        return this.desc().content().request_type;
    }
    get request_json() {
        return this.body_expect().content().request_json;
    }
    set request_json(value) {
        this.body_expect().content().request_json = value;
    }
    get request_buffer() {
        return this.body_expect().content().request_buffer;
    }
    set request_buffer(request_buffer) {
        this.body_expect().content().request_buffer = request_buffer;
    }
}
exports.HandlerRequestObject = HandlerRequestObject;
class HandlerRequestObjectDecoder extends cyfs_1.NamedObjectDecoder {
    constructor() {
        super(new HandlerRequestObjectDescContentDecoder(), new HandlerRequestObjectBodyContentDecoder(), HandlerRequestObject);
    }
    static create() {
        return new HandlerRequestObjectDecoder();
    }
}
exports.HandlerRequestObjectDecoder = HandlerRequestObjectDecoder;
