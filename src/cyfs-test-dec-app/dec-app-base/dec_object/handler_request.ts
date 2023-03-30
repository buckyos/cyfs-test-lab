import {
    SubDescType,
    DescTypeInfo,
    NamedObjectId, NamedObjectIdDecoder,
    NamedObjectDesc, NamedObjectDescDecoder,
    NamedObject, NamedObjectBuilder, NamedObjectDecoder,
    named_id_gen_default,
    named_id_from_base_58,
    named_id_try_from_object_id,
} from "../../cyfs"

import { Ok, BuckyResult, } from "../../cyfs";
import { ObjectId } from "../../cyfs";

import { CustumObjectType } from "./index";
import { protos } from '../codec';
import { ProtobufBodyContent, ProtobufBodyContentDecoder, ProtobufDescContent, ProtobufDescContentDecoder } from '../../cyfs';


export class HandlerRequestObjectDescTypeInfo extends DescTypeInfo {
    obj_type(): number {
        return CustumObjectType.HandlerRequest;
    }

    sub_desc_type(): SubDescType {
        return {
            owner_type: "option",
            area_type: "disable",
            author_type: "disable",
            key_type: "disable"
        }
    }
}

const DECAPP_DESC_TYPE_INFO = new HandlerRequestObjectDescTypeInfo();

export class HandlerRequestObjectDescContent extends ProtobufDescContent {
    id: string;
    request_type: string;
    constructor(id: string, request_type: string) {
        super();
        this.id = id;
        this.request_type = request_type;
    }

    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    set_id(id: string) {
        this.id = id;
    }

    set_request_type(request_type: string) {
        this.request_type = request_type;
    }

    try_to_proto(): BuckyResult<protos.HandlerRequestDescContent> {
        const target = new protos.HandlerRequestDescContent()
        target.setId(this.id)
        target.setRequestType(this.request_type)
        return Ok(target);
    }
}

export class HandlerRequestObjectDescContentDecoder extends ProtobufDescContentDecoder<HandlerRequestObjectDescContent, protos.HandlerRequestDescContent> {
    constructor() {
        super(protos.HandlerRequestDescContent.deserializeBinary)
    }

    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    try_from_proto(value: protos.HandlerRequestDescContent): BuckyResult<HandlerRequestObjectDescContent> {
        const result = new HandlerRequestObjectDescContent(
            value.getId(),
            value.getRequestType(),
        );

        return Ok(result);
    }
}

export class HandlerRequestObjectBodyContent extends ProtobufBodyContent {
    request_json: string;
    request_buffer : Uint8Array;
    constructor( request_json: string,request_buffer : Uint8Array) {
        super()

        this.request_json = request_json;
        this.request_buffer = request_buffer;
    }

    set_request_json(request_json: string) {
        this.request_json = request_json;
    }
    set_request_buffer(request_buffer : Uint8Array) {
        this.request_buffer = request_buffer;
    }

    try_to_proto(): BuckyResult<protos.HandlerRequestContent> {
        const target = new protos.HandlerRequestContent()
        target.setRequestJson(this.request_json)
        target.setRequestBuffer (this.request_buffer!)
        return Ok(target);
    }
}

export class HandlerRequestObjectBodyContentDecoder extends ProtobufBodyContentDecoder<HandlerRequestObjectBodyContent, protos.HandlerRequestContent>{
    constructor() {
        super(protos.HandlerRequestContent.deserializeBinary)
    }

    try_from_proto(value: protos.HandlerRequestContent): BuckyResult<HandlerRequestObjectBodyContent> {
        const result = new HandlerRequestObjectBodyContent(value.getRequestJson(),value.getRequestBuffer_asU8());
        return Ok(result);
    }
}

export class HandlerRequestObjectDesc extends NamedObjectDesc<HandlerRequestObjectDescContent>{
    // ignore
}

export class HandlerRequestObjectDescDecoder extends NamedObjectDescDecoder<HandlerRequestObjectDescContent>{
    // ignore
}

export class HandlerRequestObjectBuilder extends NamedObjectBuilder<HandlerRequestObjectDescContent, HandlerRequestObjectBodyContent>{
    // ignore
}

export class HandlerRequestObjectId extends NamedObjectId<HandlerRequestObjectDescContent, HandlerRequestObjectBodyContent>{
    constructor(id: ObjectId) {
        super(CustumObjectType.HandlerRequest, id);
    }

    static default(): HandlerRequestObjectId {
        return named_id_gen_default(CustumObjectType.HandlerRequest);
    }

    static from_base_58(s: string): BuckyResult<HandlerRequestObjectId> {
        return named_id_from_base_58(CustumObjectType.HandlerRequest, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<HandlerRequestObjectId> {
        return named_id_try_from_object_id(CustumObjectType.HandlerRequest, id);
    }
}

export class HandlerRequestObjectIdDecoder extends NamedObjectIdDecoder<HandlerRequestObjectDescContent, HandlerRequestObjectBodyContent>{
    constructor() {
        super(CustumObjectType.HandlerRequest);
    }
}


export class HandlerRequestObject extends NamedObject<HandlerRequestObjectDescContent, HandlerRequestObjectBodyContent>{
    static build(owner: ObjectId|undefined,request_type: string, id : string ,request_json: string, request_buffer:Uint8Array): HandlerRequestObjectBuilder {
        const desc_content = new HandlerRequestObjectDescContent(id, request_type);
        const body_content = new HandlerRequestObjectBodyContent(request_json,request_buffer);
        return new HandlerRequestObjectBuilder(desc_content, body_content).option_owner(owner);
    }

    static create(owner: ObjectId|undefined, request_type: string, id : string, request_json: string, request_buffer:Uint8Array): HandlerRequestObject {
        const builder = this.build(owner, request_type,id, request_json, request_buffer);

        return builder.no_create_time().build(HandlerRequestObject);
    }

    get id(): string {
        return this.desc().content().id;
    }

    get request_type(): string {
        return this.desc().content().request_type;
    }

    get request_json(): string {
        return this.body_expect().content().request_json;
    }

    set request_json(value: string) {
        this.body_expect().content().request_json = value;
    }
    get request_buffer():Uint8Array {
        return this.body_expect().content().request_buffer;
    }

    set request_buffer(request_buffer:Uint8Array) {
        this.body_expect().content().request_buffer = request_buffer;
    }
}

export class HandlerRequestObjectDecoder extends NamedObjectDecoder<HandlerRequestObjectDescContent, HandlerRequestObjectBodyContent, HandlerRequestObject>{
    constructor() {
        super(new HandlerRequestObjectDescContentDecoder(), new HandlerRequestObjectBodyContentDecoder(), HandlerRequestObject);
    }

    static create(): HandlerRequestObjectDecoder {
        return new HandlerRequestObjectDecoder()
    }
}