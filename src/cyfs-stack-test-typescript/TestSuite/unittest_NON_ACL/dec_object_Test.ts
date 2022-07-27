/*
 * @Author: your name
 * @Date: 2021-06-10 17:21:56
 * @LastEditTime: 2021-06-18 18:28:47
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \firstSyfs\cyfs\test.ts
 */
import * as cyfs from '../../cyfs_node/cyfs_node';
import * as fs from 'fs';
import * as path from 'path'
import { ok } from 'assert';
import { type } from 'os';
// import {
//     SubDescType,
//     DescTypeInfo, DescContent, DescContentDecoder,
//     BodyContent, BodyContentDecoder,P
//     NamedObjectId, NamedObjectIdDecoder,
//     NamedObjectDesc, NamedObjectDescDecoder,
//     NamedObject, NamedObjectBuilder, NamedObjectDecoder,
//     named_id_gen_default,
//     named_id_from_base_58,
//     named_id_try_from_object_id,
// } from "../../cyfs-base/objects/object"

// import { Err, Ok, BuckyResult, BuckyError, BuckyErrorCode } from "../../cyfs-base/base/results";
// import { Option, OptionEncoder, OptionDecoder, None, } from "../../cyfs-base/base/option";
// import { BuckyString, BuckyStringDecoder } from "../../cyfs-base/base/bucky_string";
// import { ObjectId, ObjectIdDecoder } from "../../cyfs-base/objects/object_id";
// import { bucky_time_now } from "../../cyfs-base/base/time";


// import { CoreObjectType } from "../core_obj_type";
// import { BuckyHashMap, BuckyHashMapDecoder } from "../../cyfs-base/base/bucky_hash_map";

export class TestDescTypeInfo extends cyfs.DescTypeInfo{
    obj_type() : number{
        return 55666;
        //cyfs.ObjectTypeCode
    }
    
    sub_desc_type(): cyfs.SubDescType{
        return {
            owner_type: "option",
            area_type: "disable",
            author_type: "disable",
            key_type: "disable"
        }
    }
}

const TEST_DESC_TYPE_INFO = new TestDescTypeInfo();

export class TestDescContent extends cyfs.DescContent {
    id: string;
    // constructor(id: string, public data: Uint8Array){
    //     super();
    //     this.id = id;
    //     this.data= data
    // }
    constructor(id: string){
        super();
        this.id = id;
    }

    type_info(): cyfs.DescTypeInfo{
        return TEST_DESC_TYPE_INFO;
    }

    raw_measure(): cyfs.BuckyResult<number>{
        let size = 0
        size += new cyfs.BuckyString(this.id).raw_measure().unwrap();
        return cyfs.Ok(size);
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array>{
        {
            let r = new cyfs.BuckyString(this.id).raw_encode(buf)
            if (r.err) {
                return r
            }
            buf = r.unwrap()
        }
        return cyfs.Ok(buf)
        // return new cyfs.BuckyString(this.id).raw_encode(buf)
    }
}

export class TestDescContentDecoder extends cyfs.DescContentDecoder<TestDescContent>{
    type_info(): cyfs.DescTypeInfo{
        return TEST_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[TestDescContent, Uint8Array]>{
        let id; 
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [id, buf] = r.unwrap();
        }
        
        
        const self = new TestDescContent(id.value());
        
        const ret:[TestDescContent, Uint8Array] = [self, buf];
        return cyfs.Ok(ret);
    }
}

export class TestBodyContent extends cyfs.BodyContent{
    source: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>
    icon: cyfs.Option<cyfs.BuckyString>
    desc: cyfs.Option<cyfs.BuckyString>
    status: number;
    source_desc: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.BuckyString>;
    test_store_list: cyfs.BuckyHashSet<cyfs.DecAppId>;
    data: Uint8Array;
    test_size: number;
    salt: Uint8Array;
    m_endpoints: cyfs.Vec<cyfs.Endpoint>
    mix_data:cyfs.Vec<cyfs.BuckyTuple>
    // mix_data: [cyfs.Endpoint,cyfs.BuckyString,cyfs.BuckyNumber][]
    
    constructor(source: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>, icon: cyfs.Option<cyfs.BuckyString>, desc: cyfs.Option<cyfs.BuckyString>, source_desc: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.BuckyString>, status: number, list: cyfs.BuckyHashSet<cyfs.DecAppId>, data:Uint8Array, test_size: number, salt: Uint8Array, endpoints: cyfs.Vec<cyfs.Endpoint>, mix_data: cyfs.Vec<cyfs.BuckyTuple>){
        super();
        this.source = source;
        this.icon = icon;
        this.desc = desc;
        this.source_desc = source_desc;
        this.status = status
        this.test_store_list = list;
        this.data = data
        this.test_size = test_size
        this.salt = salt   // salt大小必须是32位
        this.m_endpoints = endpoints;
        this.mix_data = mix_data
        // this.mix_data = mix_data.to(v=>{
        //     let mn_endpoints=v.members[0] as cyfs.Endpoint;
        //     let m_string=v.members[1] as cyfs.BuckyString;
        //     let m_number=v.members[2] as cyfs.BuckyNumber;
        //     return [mn_endpoints,m_string,m_number]
        // });
    }

    endpoints(): cyfs.Vec<cyfs.Endpoint> {
        return this.m_endpoints;
    }

    raw_measure(): cyfs.BuckyResult<number>{
        if (this.salt.byteLength != 32) {
            return cyfs.Err(new cyfs.BuckyError(cyfs.BuckyErrorCode.InvalidParam, "salt must be 32 bytes length"));
        }
        let ret = 0;
        {
            const r = this.source.raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = new cyfs.OptionEncoder(this.icon).raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = new cyfs.OptionEncoder(this.desc).raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = this.source_desc.raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = new cyfs.BuckyNumber("u8", this.status).raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = this.test_store_list.raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = new cyfs.BuckyBuffer(this.data).raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            const r = new cyfs.BuckySize(this.test_size).raw_measure();
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        {
            ret += 32;
        }
        {
            const r = this.m_endpoints.raw_measure()
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        //mix_data
        // {
        //     for(const member of this.mix_data[0]){
        //         const r =member.raw_measure()
        //         if (r.err) {
        //                     return r;
        //         };
        //         ret +=r.unwrap();
        //     }
        // }
        {
            const r = this.mix_data.raw_measure()
            if (r.err) {
                return r;
            }
            ret += r.unwrap();
        }
        return cyfs.Ok(ret);
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array>{
        {
            const r = this.source.raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            const r = new cyfs.OptionEncoder(this.icon).raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            const r = new cyfs.OptionEncoder(this.desc).raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            const r = this.source_desc.raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            let r = new cyfs.BuckyNumber("u8", this.status).raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            let r = this.test_store_list.raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            let r = new cyfs.BuckyBuffer(this.data).raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            let r = new cyfs.BuckySize(this.test_size).raw_encode(buf);
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            const r = new cyfs.BuckyFixedBuffer(this.salt).raw_encode(buf)
            if (r.err) {
                return r;
            }
            buf = r.unwrap();
        }
        {
            const r = this.m_endpoints.raw_encode(buf);
            if(r.err){
                cyfs.base_error("Device::raw_encode/endpoints failed, err:{}", r.err);
                return r;
            }
            buf = r.unwrap();
        }
        // {
        //     for(const member of this.mix_data[0]){
        //         const r=member.raw_encode(buf);
        //         if(r.err){
        //             cyfs.base_error("Device::raw_encode/mix_data failed, err:{}", r.err);
        //                 return r;
        //             }
        //         buf = r.unwrap();      
        //     }
        // }
        {
            const r = this.mix_data.raw_encode(buf);
            // const t =new cyfs.Vec(new cyfs.BuckyTuple([]))
            if(r.err){
                cyfs.base_error("Device::raw_encode/endpoints failed, err:{}", r.err);
                return r;
            }
            buf = r.unwrap();
        }
        return cyfs.Ok(buf);
    }
}

export class TestBodyContentDecoder extends cyfs.BodyContentDecoder<TestBodyContent>{
    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[TestBodyContent, Uint8Array]>{

        let sources;
        {
            const r = new cyfs.BuckyHashMapDecoder(
                new cyfs.BuckyStringDecoder(),
                new cyfs.ObjectIdDecoder()
            ).raw_decode(buf);

            if(r.err){
                return r;
            }
            [sources, buf] = r.unwrap();
        }

        let icon;
        {
            const r = new cyfs.OptionDecoder(
                new cyfs.BuckyStringDecoder()
            ).raw_decode(buf);

            if(r.err){
                return r;
            }
            [icon, buf] = r.unwrap();
        }

        let desc;
        {
            const r = new cyfs.OptionDecoder(
                new cyfs.BuckyStringDecoder()
            ).raw_decode(buf);

            if(r.err){
                return r;
            }
            [desc, buf] = r.unwrap();
        }

        let source_desc;
        {
            const r = new cyfs.BuckyHashMapDecoder(
                new cyfs.BuckyStringDecoder(),
                new cyfs.BuckyStringDecoder()
            ).raw_decode(buf);

            if(r.err){
                return r;
            }
            [source_desc, buf] = r.unwrap();
        }
        let status
        {
            const r = new cyfs.BuckyNumberDecoder("u8").raw_decode(buf);

            if(r.err){
                return r;
            }
            [status, buf] = r.unwrap();
        }
        let test_store_list;
        {
            let r = new cyfs.BuckyHashSetDecoder(new cyfs.DecAppIdDecoder()).raw_decode(buf);
            if (r.err) {
                return r;
            }

            [test_store_list, buf] = r.unwrap();
        }
        let data;
        {
            let r = new cyfs.BuckyBufferDecoder().raw_decode(buf)
            if (r.err) {
                return r;
            }
            [data, buf] = r.unwrap()
        }
        let test_size
        {
            let r = new cyfs.BuckySizeDecoder().raw_decode(buf)
            if (r.err) {
                return r;
            }
            [test_size, buf] = r.unwrap()
        }
        let salt
        {
            let r = new cyfs.BuckyFixedBufferDecoder(32).raw_decode(buf)
            if (r.err) {
                return r;
            }
            [salt, buf] = r.unwrap()
        }
        let endpoints;
        {
            const r =  new cyfs.VecDecoder(new cyfs.EndPointDecoder()).raw_decode(buf);
            if(r.err){
                cyfs.base_error("Device::raw_decode/endpoints failed, err:{}", r.err);
                return r;
            }
            [endpoints,buf] = r.unwrap();
        }
        let mix_data;
        // 解码 Tuple 里面 类型为 String
        {
            const r =  new cyfs.VecDecoder(
                new cyfs.BuckyTupleDecoder([
                    new cyfs.EndPointDecoder(),
                    new cyfs.BuckyStringDecoder(),
                    new cyfs.BuckyNumberDecoder('u128')
                ])).raw_decode(buf);
            // const r =  new cyfs.VecDecoder(new cyfs.BuckyTupleDecoder([])).raw_decode(buf);
            if(r.err){
                cyfs.base_error("Device::raw_decode/mix_data failed, err:{}", r.err);
                return r;
            }
            [mix_data,buf] = r.unwrap();
        }
        const self = new TestBodyContent( sources, icon.value(), desc.value(), source_desc, status.toNumber(), test_store_list, data.value(), test_size, salt.value(), endpoints, mix_data);

        const ret:[TestBodyContent, Uint8Array] = [self, buf];

        return cyfs.Ok(ret);
    }
}

export class TestDesc extends cyfs.NamedObjectDesc<TestDescContent>{
    // ignore
}

export  class TestDescDecoder extends cyfs.NamedObjectDescDecoder<TestDescContent>{
    // ignore
}

export class TestBuilder extends cyfs.NamedObjectBuilder<TestDescContent, TestBodyContent>{
    // ignore
}

export class TestId extends cyfs.NamedObjectId<TestDescContent, TestBodyContent>{
    constructor(id: cyfs.ObjectId){
        super(cyfs.CoreObjectType.DecApp, id);
    }

    static default(): TestId{
        return cyfs.named_id_gen_default(cyfs.CoreObjectType.DecApp);
    }

    static from_base_58(s: string): cyfs.BuckyResult<TestId> {
        return cyfs.named_id_from_base_58(cyfs.CoreObjectType.DecApp, s);
    }

    static try_from_object_id(id: cyfs.ObjectId): cyfs.BuckyResult<TestId>{
        return cyfs.named_id_try_from_object_id(cyfs.CoreObjectType.DecApp, id);
    }
}

export class TestIdDecoder extends cyfs.NamedObjectIdDecoder<TestDescContent, TestBodyContent>{
    constructor(){
        super(cyfs.CoreObjectType.DecApp);
    }
}


export class Test extends cyfs.NamedObject<TestDescContent, TestBodyContent>{
    static create(owner: cyfs.ObjectId, id: string, data: Uint8Array, testSize: number, salt: Uint8Array, endpoints: cyfs.Vec<cyfs.Endpoint>, mix_data: cyfs.Vec<cyfs.BuckyTuple> ,source: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>,icon: cyfs.Option<cyfs.BuckyString>,list: cyfs.BuckyHashSet<cyfs.DecAppId>,status?: number):Test{
        const desc_content = new TestDescContent(id);
        const body_content = new TestBodyContent(source,icon, cyfs.None, new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.BuckyString>(), status?1:0, list, data, testSize, salt, endpoints, mix_data);
        const builder = new TestBuilder(desc_content, body_content);
        const self = builder.owner(owner).no_create_time().build(Test);
        return new Test(self.desc(), self.body(), self.signs(), self.nonce());
    }

    name(): string {
        return this.desc().content().id;
    }

    icon(): string|undefined {
        if (this.body_expect().content().icon.is_some()) {
            return this.body_expect().content().icon.unwrap().value();
        } else {
            return undefined;
        }
    }

    app_desc(): string|undefined {
        if (this.body_expect().content().desc.is_some()) {
            return this.body_expect().content().icon.unwrap().value();
        } else {
            return undefined;
        }
    }

    find_source_desc(version: string): cyfs.BuckyResult<string> {
        let source = this.body_expect().content().source_desc.get(new cyfs.BuckyString(version));
        if (source === undefined) {
            return cyfs.Err(cyfs.BuckyError.from(cyfs.BuckyErrorCode.NotFound));
        } else {
            return cyfs.Ok(source.value());
        }
    }

    find_source(version: string): cyfs.BuckyResult<cyfs.ObjectId> {
        let source = this.body_expect().content().source.get(new cyfs.BuckyString(version));
        if (source === undefined) {
            return cyfs.Err(cyfs.BuckyError.from(cyfs.BuckyErrorCode.NotFound));
        } else {
            return cyfs.Ok(source);
        }
    }

    remove_source(version: string) {
        this.body_expect().content().source.delete(new cyfs.BuckyString(version));
        this.body_expect().content().source_desc.delete(new cyfs.BuckyString(version));
        this.body_expect().set_update_time(cyfs.bucky_time_now());
    }

    set_source(version: string, source: cyfs.ObjectId, desc: cyfs.Option<string>) {
        this.body_expect().content().source.set(new cyfs.BuckyString(version), source);
        if (desc.is_some()) {
            this.body_expect().content().source_desc.set(new cyfs.BuckyString(version), new cyfs.BuckyString(desc.unwrap()));
        }
        this.body_expect().set_update_time(cyfs.bucky_time_now());
    }

    source(): cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId> {
        return this.body_expect().content().source;
    }

    status(): boolean {
        return this.body_expect().content().status === 1;
    }

    test_list(): cyfs.DecAppId[] {
        return this.body_expect().content().test_store_list.array();
    }

    getData(): any {
        return this.body_expect().content().data
    }

    getSize(): number {
        return this.body_expect().content().test_size
    }

    getSalt(): Uint8Array  {
        return this.body_expect().content().salt
    }

    getMixData(): cyfs.Vec<cyfs.BuckyTuple> {
        return this.body_expect().content().mix_data
    }

    connect_info(): TestBodyContent {
        return this.body_expect().content(); 
    }
    getendpoints():cyfs.Endpoint[] {
        return this.body_expect().content().endpoints().value()
    }
}

export class TestDecoder extends cyfs.NamedObjectDecoder<TestDescContent, TestBodyContent, Test>{
    constructor(){
        super(new TestDescContentDecoder(), new TestBodyContentDecoder(), Test);
    }

    static create(): TestDecoder {
        return new TestDecoder()
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[Test, Uint8Array]>{
        return super.raw_decode(buf).map(r=>{
            const [obj, _buf] = r;
            const sub_obj = new Test(obj.desc(),obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [Test, Uint8Array];
        });
    }
}
// // 解码
// async function test_decode() {
//     // 文件地址
//     const dirName = 'D:\sn-desc'  
//     let targetDesc= path.join(dirName,'dir.fileobj');
//     const desc_buf = fs.readFileSync(targetDesc);
//     const desc_buffer = new Uint8Array(desc_buf);
//     // const [target,buffer] = new TestDecoder().raw_decode(desc_buffer).unwrap()
//     const [target,buffer] = new cyfs.DirDecoder().raw_decode(desc_buffer).unwrap()
//     console.info('-------------------->')
//     console.info(target.body_expect().content())
//     console.info('___________________________')
//     // console.info(target)

// }

// // 创建
// async function testCreate () {
//     const owner = cyfs.ObjectId.default()
//     const arr = ['1111']
//     const data = new Uint8Array([1,2])
//     const status = 1
//     const testSize = 2222
//     // salt 必须32位
//     const salt = new Uint8Array(32)
//     //todo  如何给enpots 这个参数初始化值 ?
    
//     const enpots = [true, 1, [true, '1',]]
//     const endpoint = new cyfs.Vec([])
//     // 初始化tuple 类 
//     const mixData = new cyfs.Vec([new cyfs.BuckyTuple([])])
//     console.log('id------------------>', salt.length)
//     console.log('id------------------>', data.length)
//     const id = 'qweqwe'
//     let test = Test.create(
//         owner,
//         id,
//         data,
//         testSize,
//         salt,
//         endpoint,
//         mixData,
//         status
//     )
//     // console.log(test.to_vec().unwrap())
//     fs.writeFileSync("D:/sn-desc/myTest.desc", test.to_vec().unwrap());
// }
// async function main() {
//     // testCreate()
//     test_decode()
// }
// main()
