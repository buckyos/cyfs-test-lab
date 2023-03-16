
import {
    CustumObjectType,
} from './index'
import * as cyfs from "../../cyfs";

// 1. 定义一个Desc类型信息
export class HandlerRequestDescTypeInfo extends cyfs.DescTypeInfo{
    obj_type() : number{
        return CustumObjectType.HandlerRequest;
    }

    sub_desc_type(): cyfs.SubDescType{
        return {
            owner_type: "option",   // 是否有主，"disable": 禁用，"option": 可选
            area_type: "option",    // 是否有区域信息，"disable": 禁用，"option": 可选
            author_type: "option",  // 是否有作者，"disable": 禁用，"option": 可选
            // key_type: "single_key"  // 公钥类型，"disable": 禁用，"single_key": 单PublicKey，"mn_key": M-N 公钥对
            // 还不知道怎么用key 暂时先disable
            key_type: 'disable'
        }
    }
}

// 2. 定义一个类型信息常量
const HandlerRequest_DESC_TYPE_INFO = new HandlerRequestDescTypeInfo();


// 3. 定义DescContent，继承自DescContent
export class HandlerRequestDescContent extends cyfs.DescContent {

    constructor(public request_type: cyfs.BuckyString) {
        super();
        this.request_type = request_type;
    }
    get_request_type():cyfs.BuckyString{
        return  this.request_type;
    }
    type_info(): cyfs.DescTypeInfo{
        return HandlerRequest_DESC_TYPE_INFO;
    }

    raw_measure(): cyfs.BuckyResult<number>{
        let size = 0;
        size += this.request_type.raw_measure().unwrap();
        console.info(`######## HandlerRequestDescContent raw_measure = ${this.request_type},len = ${size}`)
        return cyfs.Ok(size);
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array>{
        buf = this.request_type.raw_encode(buf).unwrap();
        return cyfs.Ok(buf);
    }
}

// 4. 定义一个DescContent的解码器
export class HandlerRequestDescContentDecoder extends cyfs.DescContentDecoder<HandlerRequestDescContent>{
    type_info(): cyfs.DescTypeInfo{
        return HandlerRequest_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[HandlerRequestDescContent, Uint8Array]>{
        console.info(`######## HandlerRequestDescContent raw_decode len = ${buf.length}`)
        let request_type: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [request_type,buf] = r.unwrap();
        }
        
        console.info(`######## HandlerRequestDescContent raw_decode = ${request_type},len = ${buf.length} `)
        const self = new HandlerRequestDescContent(request_type);
        const ret:[HandlerRequestDescContent, Uint8Array] = [self, buf];
        return cyfs.Ok(ret);
    }
}

// 5. 定义一个BodyContent，继承自RawEncode
export class HandlerRequestBodyContent extends cyfs.BodyContent{
    request_json: cyfs.BuckyString;
    request_buffer?: cyfs.BuckyBuffer;


    constructor(request_json: cyfs.BuckyString, request_buffer?: Uint8Array){
        super();
        this.request_json = request_json
        if(request_buffer){
            this.request_buffer = new cyfs.BuckyBuffer(request_buffer)
        }
       
    }
    get_request_json(){
        return  this.request_json
    }
    get_request_buffer(){
        return  this.request_buffer
    }


    raw_measure(): cyfs.BuckyResult<number>{
        let size = 0;
        size += this.request_json.raw_measure().unwrap();
        size += this.request_buffer!.raw_measure().unwrap();
        return cyfs.Ok(size)
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array>{
        buf = this.request_json.raw_encode(buf).unwrap();
        if(this.request_buffer){
            buf = this.request_buffer.raw_encode(buf).unwrap();
        }
        
        return cyfs.Ok(buf)
    }
}


// 6. 定义一个BodyContent的解码器
export class HandlerRequestBodyContentDecoder extends cyfs.BodyContentDecoder<HandlerRequestBodyContent>{
    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[HandlerRequestBodyContent, Uint8Array]>{
        let request_json: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [request_json, buf] = r.unwrap();
        }
        let request_buffer : cyfs.BuckyBuffer | undefined;
        {
            let r = new cyfs.BuckyBufferDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [request_buffer, buf] = r.unwrap();
        }
        const body_content = new HandlerRequestBodyContent(request_json, request_buffer?.buffer)

        const ret:[HandlerRequestBodyContent, Uint8Array] = [body_content, buf];
        return cyfs.Ok(ret);
    }
}

// 7. 定义组合类型
export class HandlerRequestDesc extends cyfs.NamedObjectDesc<HandlerRequestDescContent>{
    //
}

export class HandlerRequestDescDecoder extends cyfs.NamedObjectDescDecoder<HandlerRequestDescContent>{
    constructor(){
        super(new HandlerRequestDescContentDecoder());
    }
}

export class HandlerRequestBuilder extends cyfs.NamedObjectBuilder<HandlerRequestDescContent, HandlerRequestBodyContent>{
}

// 通过继承的方式具体化
export class HandlerRequestId extends cyfs.NamedObjectId<HandlerRequestDescContent, HandlerRequestBodyContent>{
    static default(): HandlerRequestId{
        return cyfs.named_id_gen_default(CustumObjectType.HandlerRequest);
    }

    static from_base_58(s: string): cyfs.BuckyResult<HandlerRequestId> {
        return cyfs.named_id_from_base_58(CustumObjectType.HandlerRequest, s);
    }

    static try_from_object_id(id: cyfs.ObjectId): cyfs.BuckyResult<HandlerRequestId>{
        return cyfs.named_id_try_from_object_id(CustumObjectType.HandlerRequest, id);
    }
}

export class HandlerRequestIdDecoder extends cyfs.NamedObjectIdDecoder<cyfs.DeviceDescContent, cyfs.DeviceBodyContent>{
    constructor(){
        super(CustumObjectType.HandlerRequest);
    }
}

// 定义HandlerRequest对象
// 提供创建方法和其他自定义方法
export class HandlerRequest extends cyfs.NamedObject<HandlerRequestDescContent, HandlerRequestBodyContent>{
    static create(
        request_type : string,
        request_json : string,
        request_buffer? : Uint8Array
    ):HandlerRequest{
        const desc_content = new HandlerRequestDescContent(new cyfs.BuckyString(request_type));
        if(!request_buffer || request_buffer.length == 0){
            request_buffer =Buffer.from("0");
        }
        const body_content = new HandlerRequestBodyContent(
            new cyfs.BuckyString(request_json),
            request_buffer,
        )
        const builder = new cyfs.NamedObjectBuilder<HandlerRequestDescContent, HandlerRequestBodyContent>(desc_content, body_content)
        const self = builder.build(HandlerRequest);
        return new HandlerRequest(self.desc(), self.body(), self.signs(), self.nonce());
    }
    request_type():string{
        return this.desc().content().get_request_type().toString()
    }
    request_json_str():string{
        return this.body_expect().content().get_request_json().toString()
    }
    request_buffer():cyfs.BuckyBuffer|undefined{
        return this.body_expect().content().get_request_buffer()
    }

}

// 9. 定义HandlerRequest解码器
export class HandlerRequestDecoder extends cyfs.NamedObjectDecoder<HandlerRequestDescContent, HandlerRequestBodyContent, HandlerRequest>{
    constructor(){
        super(new HandlerRequestDescContentDecoder(), new HandlerRequestBodyContentDecoder(), HandlerRequest);
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[HandlerRequest, Uint8Array]>{
        return super.raw_decode(buf).map((r: any)=>{
            const [obj, _buf] = r;
            const sub_obj = new HandlerRequest(obj.desc(),obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [HandlerRequest, Uint8Array];
        });
    }
}
