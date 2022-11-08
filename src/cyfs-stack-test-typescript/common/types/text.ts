import {
    DescContent,
    DescContentDecoder,
    DescTypeInfo, named_id_gen_default, named_id_from_base_58, named_id_try_from_object_id,  NamedObject,
    NamedObjectBuilder, NamedObjectDecoder,
    NamedObjectDesc, NamedObjectId, NamedObjectIdDecoder,
    BodyContent,
    BodyContentDecoder,
    SubDescType,
    NamedObjectDescDecoder,
    ObjectTypeCode,
    Area,
    BuckyError, BuckyErrorCode,
    BuckyResult,
    Ok,
    DeviceBodyContent,
    DeviceDescContent,
    BuckyString, BuckyStringDecoder,
    BuckyHashSet,BuckyHashSetDecoder,
    ObjectId,
    ObjectIdDecoder
} from '../../cyfs_node/cyfs_node';
import {
    CustumObjectType,
} from './index'


// 1. 定义一个Desc类型信息
export class GitTextObjectDescTypeInfo extends DescTypeInfo{
    obj_type() : number{
        return CustumObjectType.GitText;
    }

    sub_desc_type(): SubDescType{
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
const GitTextObject_DESC_TYPE_INFO = new GitTextObjectDescTypeInfo();


// 3. 定义DescContent，继承自DescContent
export class GitTextObjectDescContent extends DescContent {
    type_info(): DescTypeInfo{
        return GitTextObject_DESC_TYPE_INFO;
    }

    raw_measure(): BuckyResult<number>{
        return Ok(0);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        return Ok(buf);
    }
}

// 4. 定义一个DescContent的解码器
export class GitTextObjectDescContentDecoder extends DescContentDecoder<GitTextObjectDescContent>{
    type_info(): DescTypeInfo{
        return GitTextObject_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): BuckyResult<[GitTextObjectDescContent, Uint8Array]>{
        const self = new GitTextObjectDescContent();
        const ret:[GitTextObjectDescContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

// 5. 定义一个BodyContent，继承自RawEncode
export class GitTextObjectBodyContent extends BodyContent{
    id: BuckyString
    header: BuckyString
    value: BuckyString

    constructor(id: BuckyString, header: BuckyString, value: BuckyString){
        super();
        this.id = id
        this.header = header
        this.value = value
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.id.raw_measure().unwrap();
        size += this.header.raw_measure().unwrap();
        size += this.value.raw_measure().unwrap();
        return Ok(size)
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.id.raw_encode(buf).unwrap();
        buf = this.header.raw_encode(buf).unwrap();
        buf = this.value.raw_encode(buf).unwrap();
        return Ok(buf)
    }
}


// 6. 定义一个BodyContent的解码器
export class GitTextObjectBodyContentDecoder extends BodyContentDecoder<GitTextObjectBodyContent>{
    raw_decode(buf: Uint8Array): BuckyResult<[GitTextObjectBodyContent, Uint8Array]>{
        let id: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [id, buf] = r.unwrap();
        }
        let header;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [header, buf] = r.unwrap();
        }
        let value;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [value, buf] = r.unwrap();
        }

        const body_content = new GitTextObjectBodyContent(id, header, value)

        const ret:[GitTextObjectBodyContent, Uint8Array] = [body_content, buf];
        return Ok(ret);
    }
}

// 7. 定义组合类型
export class GitTextObjectDesc extends NamedObjectDesc<GitTextObjectDescContent>{
    //
}

export class GitTextObjectDescDecoder extends NamedObjectDescDecoder<GitTextObjectDescContent>{
    constructor(){
        super(new GitTextObjectDescContentDecoder());
    }
}

export class GitTextObjectBuilder extends NamedObjectBuilder<GitTextObjectDescContent, GitTextObjectBodyContent>{
}

// 通过继承的方式具体化
export class GitTextObjectId extends NamedObjectId<GitTextObjectDescContent, GitTextObjectBodyContent>{
    static default(): GitTextObjectId{
        return named_id_gen_default(CustumObjectType.GitText);
    }

    static from_base_58(s: string): BuckyResult<GitTextObjectId> {
        return named_id_from_base_58(CustumObjectType.GitText, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<GitTextObjectId>{
        return named_id_try_from_object_id(CustumObjectType.GitText, id);
    }
}

export class GitTextObjectIdDecoder extends NamedObjectIdDecoder<DeviceDescContent, DeviceBodyContent>{
    constructor(){
        super(CustumObjectType.GitText);
    }
}

// 定义GitTextObject对象
// 提供创建方法和其他自定义方法
export class GitTextObject extends NamedObject<GitTextObjectDescContent, GitTextObjectBodyContent>{
    static create(
        owner: ObjectId,
        dec_id: ObjectId,
        id: string,
        header: string,
        value: string,
    ):GitTextObject{
        const desc_content = new GitTextObjectDescContent();
        const body_content = new GitTextObjectBodyContent(
            new BuckyString(id),
            new BuckyString(header),
            new BuckyString(value),
        )
        const builder = new NamedObjectBuilder<GitTextObjectDescContent, GitTextObjectBodyContent>(desc_content, body_content)
        const self = builder
        .owner(owner)
        .dec_id(dec_id)
        .build(GitTextObject);
        return new GitTextObject(self.desc(), self.body(), self.signs(), self.nonce());
    }

    get id(): string {
        return this.body_expect().content().id.toString();
    }
    get header(): string {
        return this.body_expect().content().header.toString();
    }
    get value(): string {
        return this.body_expect().content().value.toString();
    }
}

// 9. 定义GitTextObject解码器
export class GitTextObjectDecoder extends NamedObjectDecoder<GitTextObjectDescContent, GitTextObjectBodyContent, GitTextObject>{
    constructor(){
        super(new GitTextObjectDescContentDecoder(), new GitTextObjectBodyContentDecoder(), GitTextObject);
    }

    raw_decode(buf: Uint8Array): BuckyResult<[GitTextObject, Uint8Array]>{
        return super.raw_decode(buf).map((r: any)=>{
            const [obj, _buf] = r;
            const sub_obj = new GitTextObject(obj.desc(),obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [GitTextObject, Uint8Array];
        });
    }
}
