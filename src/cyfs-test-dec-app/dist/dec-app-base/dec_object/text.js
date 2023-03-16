"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextObjectDecoder = exports.TextObject = exports.TextObjectIdDecoder = exports.TextObjectId = exports.TextObjectBuilder = exports.TextObjectDescDecoder = exports.TextObjectDesc = exports.TextObjectBodyContentDecoder = exports.TextObjectBodyContent = exports.TextObjectDescContentDecoder = exports.TextObjectDescContent = exports.TextObjectDescTypeInfo = void 0;
const cyfs_1 = require("../../cyfs");
const cyfs_2 = require("../../cyfs");
const index_1 = require("./index");
const codec_1 = require("../codec");
const cyfs_3 = require("../../cyfs");
class TextObjectDescTypeInfo extends cyfs_1.DescTypeInfo {
    obj_type() {
        return index_1.CustumObjectType.Text;
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
exports.TextObjectDescTypeInfo = TextObjectDescTypeInfo;
const DECAPP_DESC_TYPE_INFO = new TextObjectDescTypeInfo();
class TextObjectDescContent extends cyfs_3.ProtobufDescContent {
    constructor(id, header) {
        super();
        this.id = id;
        this.header = header;
    }
    type_info() {
        return DECAPP_DESC_TYPE_INFO;
    }
    set_id(id) {
        this.id = id;
    }
    set_header(header) {
        this.header = header;
    }
    try_to_proto() {
        const target = new codec_1.protos.TextDescContent();
        target.setId(this.id);
        target.setHeader(this.header);
        return cyfs_2.Ok(target);
    }
}
exports.TextObjectDescContent = TextObjectDescContent;
class TextObjectDescContentDecoder extends cyfs_3.ProtobufDescContentDecoder {
    constructor() {
        super(codec_1.protos.TextDescContent.deserializeBinary);
    }
    type_info() {
        return DECAPP_DESC_TYPE_INFO;
    }
    try_from_proto(value) {
        const result = new TextObjectDescContent(value.getId(), value.getHeader());
        return cyfs_2.Ok(result);
    }
}
exports.TextObjectDescContentDecoder = TextObjectDescContentDecoder;
class TextObjectBodyContent extends cyfs_3.ProtobufBodyContent {
    constructor(value) {
        super();
        this.value = value;
    }
    set_value(value) {
        this.value = value;
    }
    try_to_proto() {
        const target = new codec_1.protos.TextContent();
        target.setValue(this.value);
        return cyfs_2.Ok(target);
    }
}
exports.TextObjectBodyContent = TextObjectBodyContent;
class TextObjectBodyContentDecoder extends cyfs_3.ProtobufBodyContentDecoder {
    constructor() {
        super(codec_1.protos.TextContent.deserializeBinary);
    }
    try_from_proto(value) {
        const result = new TextObjectBodyContent(value.getValue());
        return cyfs_2.Ok(result);
    }
}
exports.TextObjectBodyContentDecoder = TextObjectBodyContentDecoder;
class TextObjectDesc extends cyfs_1.NamedObjectDesc {
}
exports.TextObjectDesc = TextObjectDesc;
class TextObjectDescDecoder extends cyfs_1.NamedObjectDescDecoder {
}
exports.TextObjectDescDecoder = TextObjectDescDecoder;
class TextObjectBuilder extends cyfs_1.NamedObjectBuilder {
}
exports.TextObjectBuilder = TextObjectBuilder;
class TextObjectId extends cyfs_1.NamedObjectId {
    constructor(id) {
        super(index_1.CustumObjectType.Text, id);
    }
    static default() {
        return cyfs_1.named_id_gen_default(index_1.CustumObjectType.Text);
    }
    static from_base_58(s) {
        return cyfs_1.named_id_from_base_58(index_1.CustumObjectType.Text, s);
    }
    static try_from_object_id(id) {
        return cyfs_1.named_id_try_from_object_id(index_1.CustumObjectType.Text, id);
    }
}
exports.TextObjectId = TextObjectId;
class TextObjectIdDecoder extends cyfs_1.NamedObjectIdDecoder {
    constructor() {
        super(index_1.CustumObjectType.Text);
    }
}
exports.TextObjectIdDecoder = TextObjectIdDecoder;
class TextObject extends cyfs_1.NamedObject {
    static build(owner, id, header, value) {
        const desc_content = new TextObjectDescContent(id, header);
        const body_content = new TextObjectBodyContent(value);
        return new TextObjectBuilder(desc_content, body_content).option_owner(owner);
    }
    static create(owner, id, header, value) {
        const builder = this.build(owner, id, header, value);
        return builder.no_create_time().build(TextObject);
    }
    get id() {
        return this.desc().content().id;
    }
    get header() {
        return this.desc().content().header;
    }
    get value() {
        return this.body_expect().content().value;
    }
    set value(value) {
        this.body_expect().content().value = value;
    }
}
exports.TextObject = TextObject;
class TextObjectDecoder extends cyfs_1.NamedObjectDecoder {
    constructor() {
        super(new TextObjectDescContentDecoder(), new TextObjectBodyContentDecoder(), TextObject);
    }
    static create() {
        return new TextObjectDecoder();
    }
}
exports.TextObjectDecoder = TextObjectDecoder;
