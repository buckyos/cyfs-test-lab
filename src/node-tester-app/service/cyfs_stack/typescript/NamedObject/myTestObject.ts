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
    ObjectIdDecoder, BuckyNumber, BuckyNumberDecoder, CyfsChannel
} from  "../cyfs/cyfs_node";
import {
    CustumObjectType,
} from './index'
import * as cyfs from  "../cyfs/cyfs_node";

// 1. 定义一个Desc类型信息
export class MyTestDescTypeInfo extends DescTypeInfo{
    obj_type() : number{
        return CustumObjectType.MyTest;
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
const MyTest_DESC_TYPE_INFO = new MyTestDescTypeInfo();


// 3. 定义DescContent，继承自DescContent
export class MyTestDescContent extends DescContent {

    name: BuckyString;
    constructor(name: BuckyString) {
        super();
        this.name = name;
    }
    get_name():BuckyString{
        return  this.name;
    }
    type_info(): DescTypeInfo{
        return MyTest_DESC_TYPE_INFO;
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.name.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.name.raw_encode(buf).unwrap();
        return Ok(buf);
    }
}

// 4. 定义一个DescContent的解码器
export class MyTestDescContentDecoder extends DescContentDecoder<MyTestDescContent>{
    type_info(): DescTypeInfo{
        return MyTest_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): BuckyResult<[MyTestDescContent, Uint8Array]>{
        let name: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [name] = r.unwrap();
        }
        const self = new MyTestDescContent(name);
        const ret:[MyTestDescContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

// 5. 定义一个BodyContent，继承自RawEncode
export class MyTestBodyContent extends BodyContent{
    name: BuckyString;
    network: BuckyString;


    constructor(name: BuckyString, network: BuckyString){
        super();
        this.name = name
        this.network = network
    }
    get_name(){
        return  this.name
    }
    get_network(){
        return  this.network
    }


    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.name.raw_measure().unwrap();
        size += this.network.raw_measure().unwrap();
        return Ok(size)
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.name.raw_encode(buf).unwrap();
        buf = this.network.raw_encode(buf).unwrap();
        return Ok(buf)
    }
}


// 6. 定义一个BodyContent的解码器
export class MyTestBodyContentDecoder extends BodyContentDecoder<MyTestBodyContent>{
    raw_decode(buf: Uint8Array): BuckyResult<[MyTestBodyContent, Uint8Array]>{
        let name: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [name, buf] = r.unwrap();
        }
        let network;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [network, buf] = r.unwrap();
        }
        const body_content = new MyTestBodyContent(name, network)

        const ret:[MyTestBodyContent, Uint8Array] = [body_content, buf];
        return Ok(ret);
    }
}

// 7. 定义组合类型
export class MyTestDesc extends NamedObjectDesc<MyTestDescContent>{
    //
}

export class MyTestDescDecoder extends NamedObjectDescDecoder<MyTestDescContent>{
    constructor(){
        super(new MyTestDescContentDecoder());
    }
}

export class MyTestBuilder extends NamedObjectBuilder<MyTestDescContent, MyTestBodyContent>{
}

// 通过继承的方式具体化
export class MyTestId extends NamedObjectId<MyTestDescContent, MyTestBodyContent>{
    static default(): MyTestId{
        return named_id_gen_default(CustumObjectType.MyTest);
    }

    static from_base_58(s: string): BuckyResult<MyTestId> {
        return named_id_from_base_58(CustumObjectType.MyTest, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<MyTestId>{
        return named_id_try_from_object_id(CustumObjectType.MyTest, id);
    }
}

export class MyTestIdDecoder extends NamedObjectIdDecoder<DeviceDescContent, DeviceBodyContent>{
    constructor(){
        super(CustumObjectType.MyTest);
    }
}

// 定义MyTest对象
// 提供创建方法和其他自定义方法
export class MyTest extends NamedObject<MyTestDescContent, MyTestBodyContent>{
    static create(
        owner: cyfs.Option<ObjectId> ,
        author: cyfs.Option<ObjectId> ,
        prev: cyfs.Option<ObjectId> ,
        ref_objects: cyfs.Option<cyfs.Vec<cyfs.ObjectLink>>,
        single_key : cyfs.Option<cyfs.PublicKey>,
        name: string,
        network: string,

    ):MyTest{
        const desc_content = new MyTestDescContent( new BuckyString(name));
        const body_content = new MyTestBodyContent(
            new BuckyString(name),
            new BuckyString(network),
        )
        const builder = new NamedObjectBuilder<MyTestDescContent, MyTestBodyContent>(desc_content, body_content)
        const self = builder
        .option_owner(owner).option_author(author).no_create_time().option_prev(prev).option_ref_objects(ref_objects).option_single_key(single_key)
        .build(MyTest);
        return new MyTest(self.desc(), self.body(), self.signs(), self.nonce());
    }

    get_Info(){
        return {
            owner : this.desc().owner()?.unwrap().to_base_58(),
            name : this.body().unwrap().content().name.value(),
            network: this.body().unwrap().content().network.value(),
        }
    }



}

// 9. 定义MyTest解码器
export class MyTestDecoder extends NamedObjectDecoder<MyTestDescContent, MyTestBodyContent, MyTest>{
    constructor(){
        super(new MyTestDescContentDecoder(), new MyTestBodyContentDecoder(), MyTest);
    }

    raw_decode(buf: Uint8Array): BuckyResult<[MyTest, Uint8Array]>{
        return super.raw_decode(buf).map((r: any)=>{
            const [obj, _buf] = r;
            const sub_obj = new MyTest(obj.desc(),obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [MyTest, Uint8Array];
        });
    }
}
