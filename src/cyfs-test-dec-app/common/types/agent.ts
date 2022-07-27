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
    ObjectIdDecoder, BuckyNumber, BuckyNumberDecoder
} from '../../cyfs'
import {
    CustumObjectType,
} from './index'


// 1. 定义一个Desc类型信息
export class AgentDescTypeInfo extends DescTypeInfo{
    obj_type() : number{
        return CustumObjectType.Agent;
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
const Agent_DESC_TYPE_INFO = new AgentDescTypeInfo();


// 3. 定义DescContent，继承自DescContent
export class AgentDescContent extends DescContent {

    device_id: ObjectId;
    constructor(device_id: ObjectId) {
        super();
        this.device_id = device_id;
    }
    get_device_id():ObjectId{
        return  this.device_id;
    }
    type_info(): DescTypeInfo{
        return Agent_DESC_TYPE_INFO;
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.device_id.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.device_id.raw_encode(buf).unwrap();
        return Ok(buf);
    }
}

// 4. 定义一个DescContent的解码器
export class AgentDescContentDecoder extends DescContentDecoder<AgentDescContent>{
    type_info(): DescTypeInfo{
        return Agent_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): BuckyResult<[AgentDescContent, Uint8Array]>{
        let device_id: ObjectId;
        {
            let r = new ObjectIdDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [device_id] = r.unwrap();
        }
        const self = new AgentDescContent(device_id);
        const ret:[AgentDescContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

// 5. 定义一个BodyContent，继承自RawEncode
export class AgentBodyContent extends BodyContent{
    name: BuckyString;
    network: BuckyString;
    stauts: BuckyString;
    last_time:BuckyString;
    system:BuckyString;
    ood_runtime:BuckyString;

    constructor(name: BuckyString, network: BuckyString, stauts: BuckyString,last_time:BuckyString,system:BuckyString,ood_runtime:BuckyString){
        super();
        this.name = name
        this.network = network
        this.stauts = stauts
        this.last_time = last_time
        this.system = system
        this.ood_runtime = ood_runtime
    }
    get_name(){
        return  this.name
    }
    get_network(){
        return  this.network
    }
    get_stauts(){
        return  this.stauts
    }
    get_last_time(){
        return  this.last_time
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.name.raw_measure().unwrap();
        size += this.network.raw_measure().unwrap();
        size += this.stauts.raw_measure().unwrap();
        size += this.last_time.raw_measure().unwrap();
        size += this.system.raw_measure().unwrap();
        size += this.ood_runtime.raw_measure().unwrap();
        return Ok(size)
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.name.raw_encode(buf).unwrap();
        buf = this.network.raw_encode(buf).unwrap();
        buf = this.stauts.raw_encode(buf).unwrap();
        buf = this.last_time.raw_encode(buf).unwrap();
        buf = this.system.raw_encode(buf).unwrap();
        buf = this.ood_runtime.raw_encode(buf).unwrap();
        return Ok(buf)
    }
}


// 6. 定义一个BodyContent的解码器
export class AgentBodyContentDecoder extends BodyContentDecoder<AgentBodyContent>{
    raw_decode(buf: Uint8Array): BuckyResult<[AgentBodyContent, Uint8Array]>{
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
        let stauts;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [stauts, buf] = r.unwrap();
        }
        let last_time;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [last_time, buf] = r.unwrap();
        }
        let system;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [system, buf] = r.unwrap();
        }
        let ood_runtime;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if(r.err){
                return r;
            }
            [ood_runtime, buf] = r.unwrap();
        }
        const body_content = new AgentBodyContent(name, network, stauts,last_time,system,ood_runtime)

        const ret:[AgentBodyContent, Uint8Array] = [body_content, buf];
        return Ok(ret);
    }
}

// 7. 定义组合类型
export class AgentDesc extends NamedObjectDesc<AgentDescContent>{
    //
}

export class AgentDescDecoder extends NamedObjectDescDecoder<AgentDescContent>{
    constructor(){
        super(new AgentDescContentDecoder());
    }
}

export class AgentBuilder extends NamedObjectBuilder<AgentDescContent, AgentBodyContent>{
}

// 通过继承的方式具体化
export class AgentId extends NamedObjectId<AgentDescContent, AgentBodyContent>{
    static default(): AgentId{
        return named_id_gen_default(CustumObjectType.Agent);
    }

    static from_base_58(s: string): BuckyResult<AgentId> {
        return named_id_from_base_58(CustumObjectType.Agent, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<AgentId>{
        return named_id_try_from_object_id(CustumObjectType.Agent, id);
    }
}

export class AgentIdDecoder extends NamedObjectIdDecoder<DeviceDescContent, DeviceBodyContent>{
    constructor(){
        super(CustumObjectType.Agent);
    }
}

// 定义Agent对象
// 提供创建方法和其他自定义方法
export class Agent extends NamedObject<AgentDescContent, AgentBodyContent>{
    static create(
        owner: ObjectId,
        device_id: ObjectId,
        name: string,
        network: string,
        stauts: string,
        last_time:string,
        system:string,
        ood_runtime:string,
    ):Agent{
        const desc_content = new AgentDescContent(device_id);
        const body_content = new AgentBodyContent(
            new BuckyString(name),
            new BuckyString(network),
            new BuckyString(stauts),
            new BuckyString(last_time),
            new BuckyString(system),
            new BuckyString(ood_runtime)
        )
        const builder = new NamedObjectBuilder<AgentDescContent, AgentBodyContent>(desc_content, body_content)
        const self = builder
        .owner(owner).no_create_time()
        .build(Agent);
        return new Agent(self.desc(), self.body(), self.signs(), self.nonce());
    }

    get_Info(){
        return {
            owner : this.desc().owner()?.unwrap().to_base_58(),
            device_id:this.desc().content().device_id.to_base_58(),
            name : this.body().unwrap().content().name.value(),
            network: this.body().unwrap().content().network.value(),
            status: this.body().unwrap().content().stauts.value(),
            last_time: this.body().unwrap().content().last_time.value(),
            system:this.body().unwrap().content().system.value(),
            ood_runtime:this.body().unwrap().content().ood_runtime.value(),
        }
    }



}

// 9. 定义Agent解码器
export class AgentDecoder extends NamedObjectDecoder<AgentDescContent, AgentBodyContent, Agent>{
    constructor(){
        super(new AgentDescContentDecoder(), new AgentBodyContentDecoder(), Agent);
    }

    raw_decode(buf: Uint8Array): BuckyResult<[Agent, Uint8Array]>{
        return super.raw_decode(buf).map((r: any)=>{
            const [obj, _buf] = r;
            const sub_obj = new Agent(obj.desc(),obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [Agent, Uint8Array];
        });
    }
}
