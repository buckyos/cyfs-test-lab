import {
    BuckyString,
    BuckyStringDecoder,
    bucky_time,
    SubDescType,
    DescTypeInfo,
    NamedObjectId, NamedObjectIdDecoder,
    NamedObjectDesc, NamedObjectDescDecoder,
    NamedObject, NamedObjectBuilder, NamedObjectDecoder,
    named_id_gen_default,
    named_id_from_base_58,
    named_id_try_from_object_id,
    BodyContent,
    BodyContentDecoder,
    DescContent,
    DescContentDecoder
} from '../../cyfs_node';

import { Err, Ok, BuckyResult, BuckyError, BuckyErrorCode } from '../../cyfs_node';
import { Option } from '../../cyfs_node';
import { ObjectId, ObjectIdDecoder } from '../../cyfs_node';
import * as cyfs from  '../../cyfs_node';
import { CoreObjectType } from '../../cyfs_node';
import { protos } from '../../cyfs_node';
import { ProtobufBodyContent, ProtobufBodyContentDecoder, ProtobufDescContent, ProtobufDescContentDecoder }from '../../cyfs_node';
import {
    CustumObjectType,
} from './index'

export class TestcaseObjectDescTypeInfo extends DescTypeInfo {
    obj_type(): number {
        return CustumObjectType.Testcase;
    }

    sub_desc_type(): SubDescType {
        return {
            owner_type: "option",
            area_type: "option",
            author_type: "option",
            key_type: "disable"
        }
    }
}

const DECAPP_DESC_TYPE_INFO = new TestcaseObjectDescTypeInfo();

export class TestcaseObjectDescContent extends DescContent  {
    id: BuckyString;
    testcaseId: BuckyString;
    constructor(id: BuckyString, testcaseId: BuckyString) {
        super();
        this.id = id;
        this.testcaseId = testcaseId;
    }

    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    set_id(id: BuckyString) {
        this.id = id;
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.id.raw_measure().unwrap();
        size += this.testcaseId.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.id.raw_encode(buf).unwrap();
        buf = this.testcaseId.raw_encode(buf).unwrap();
        return Ok(buf);
    }

    
}

export class TestcaseObjectDescContentDecoder extends DescContentDecoder<TestcaseObjectDescContent> {


    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): BuckyResult<[TestcaseObjectDescContent, Uint8Array]>{
        let id: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [id, buf] = r.unwrap();
        }
        let testcaseId: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [testcaseId, buf] = r.unwrap();
        }
        const self = new TestcaseObjectDescContent(id,testcaseId);
        const ret:[TestcaseObjectDescContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

export class TestcaseObjectBodyContent extends BodyContent {

    system: BuckyString;
    module: BuckyString;
    type: BuckyString;
    priority: BuckyString;
    level: BuckyString;
    author: BuckyString;
    create_time: BuckyString;
    update_time: BuckyString;
    testcase_name: BuckyString;
    precondition: BuckyString;
    postcondition: BuckyString;
    expect_result: BuckyString;
    input_data: BuckyString;



    /**
     * @param system 测试系统
     * @param module 功能模块
     * @param type 测试类型 正常测试 异常测试 性能测试
     * @param priority 优先级
     * @param level 测试用例等级 
     * @param author 设计人
     * @param create_time 创建日期
     * @param update_time 更新日期
     * @param testcase_name 测试检查要点
     * @param precondition 前置条件
     * @param postcondition 后置条件
     * @param expect_result 预期结果
     * @param input_data 输入数据
     */
    constructor(system: BuckyString,module : BuckyString,type: BuckyString,priority: BuckyString,level: BuckyString,author: BuckyString,create_time:BuckyString,update_time:BuckyString,testcase_name: BuckyString,precondition: BuckyString,postcondition: BuckyString,expect_result: BuckyString,input_data: BuckyString) {
        super();
        this.system = system
        this.module = module
        this.type = type
        this.priority = priority
        this.level = level
        this.author = author
        this.create_time = create_time
        this.update_time = update_time
        this.testcase_name = testcase_name
        this.precondition = precondition
        this.postcondition = postcondition
        this.expect_result = expect_result
        this.input_data = input_data
    }
    raw_measure(): BuckyResult<number>{
        let size = 0 ;
        size += this.system.raw_measure().unwrap();
        size += this.module.raw_measure().unwrap();
        size += this.type.raw_measure().unwrap();
        size += this.priority.raw_measure().unwrap();
        size += this.level.raw_measure().unwrap();
        size += this.author.raw_measure().unwrap();
        size += this.create_time.raw_measure().unwrap();
        size += this.update_time.raw_measure().unwrap();
        size += this.testcase_name.raw_measure().unwrap();
        size += this.precondition.raw_measure().unwrap();
        size += this.postcondition.raw_measure().unwrap();
        size += this.expect_result.raw_measure().unwrap();
        size += this.input_data.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.system.raw_encode(buf).unwrap();
        buf = this.module.raw_encode(buf).unwrap();
        buf = this.type.raw_encode(buf).unwrap();
        buf = this.priority.raw_encode(buf).unwrap();
        buf = this.level.raw_encode(buf).unwrap();
        buf = this.author.raw_encode(buf).unwrap();
        buf = this.create_time.raw_encode(buf).unwrap();
        buf = this.update_time.raw_encode(buf).unwrap();
        buf = this.testcase_name.raw_encode(buf).unwrap();
        buf = this.precondition.raw_encode(buf).unwrap();
        buf = this.postcondition.raw_encode(buf).unwrap();
        buf = this.expect_result.raw_encode(buf).unwrap();
        buf = this.input_data.raw_encode(buf).unwrap();
        return Ok(buf);
    }


}

export class TestcaseObjectBodyContentDecoder extends BodyContentDecoder<TestcaseObjectBodyContent>{
    raw_decode(buf: Uint8Array): BuckyResult<[TestcaseObjectBodyContent, Uint8Array]>{
        let system: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [system, buf] = r.unwrap();
        }
        let module: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [module, buf] = r.unwrap();
        }
        let type: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [type, buf] = r.unwrap();
        }
        let priority: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [priority, buf] = r.unwrap();
        }
        let level: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [level, buf] = r.unwrap();
        }
        let author: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [author, buf] = r.unwrap();
        }
        let create_time: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [create_time, buf] = r.unwrap();
        }
        let update_time: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [update_time, buf] = r.unwrap();
        }
        let testcase_name: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [testcase_name, buf] = r.unwrap();
        }
        let precondition: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [precondition, buf] = r.unwrap();
        }
        let postcondition: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [postcondition, buf] = r.unwrap();
        }
        let expect_result: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [expect_result, buf] = r.unwrap();
        }
        let input_data: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [input_data, buf] = r.unwrap();
        }
        const self = new TestcaseObjectBodyContent(system,module,type,priority,level,author,create_time,update_time,testcase_name,precondition,postcondition,expect_result,input_data);
        const ret:[TestcaseObjectBodyContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

export class TestcaseObjectDesc extends NamedObjectDesc<TestcaseObjectDescContent>{
    // ignore
}

export class TestcaseObjectDescDecoder extends NamedObjectDescDecoder<TestcaseObjectDescContent>{
    // ignore
}

export class TestcaseObjectBuilder extends NamedObjectBuilder<TestcaseObjectDescContent, TestcaseObjectBodyContent>{
    // ignore
}

export class TestcaseObjectId extends NamedObjectId<TestcaseObjectDescContent, TestcaseObjectBodyContent>{
    constructor(id: ObjectId) {
        super(CustumObjectType.Testcase, id);
    }

    static default(): TestcaseObjectId {
        return named_id_gen_default(CustumObjectType.Testcase);
    }

    static from_base_58(s: string): BuckyResult<TestcaseObjectId> {
        return named_id_from_base_58(CustumObjectType.Testcase, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<TestcaseObjectId> {
        return named_id_try_from_object_id(CustumObjectType.Testcase, id);
    }
}

export class TestcaseObjectIdDecoder extends NamedObjectIdDecoder<TestcaseObjectDescContent, TestcaseObjectBodyContent>{
    constructor() {
        super(CustumObjectType.Testcase);
    }
}


export class TestcaseObject extends NamedObject<TestcaseObjectDescContent, TestcaseObjectBodyContent>{
    /**
     * 
     * @param id 测试用例ID
     * @param testcaseId 自动化测试用例编号
     * @param system 测试系统
     * @param module 功能模块
     * @param type 测试类型 正常测试 异常测试 性能测试
     * @param priority 优先级
     * @param level 测试用例等级 
     * @param author 设计人
     * @param create_time 创建日期
     * @param update_time 更新日期
     * @param testcase_name 测试检查要点
     * @param precondition 前置条件
     * @param postcondition 后置条件
     * @param expect_result 预期结果
     * @param input_data 输入数据
     */
    static build(owner: Option<ObjectId>, id: BuckyString, testcaseId: BuckyString, system: BuckyString,module : BuckyString,type: BuckyString,priority: BuckyString,level: BuckyString,author: BuckyString,create_time:BuckyString,update_time:BuckyString,testcase_name: BuckyString,precondition: BuckyString,postcondition: BuckyString,expect_result: BuckyString,input_data: BuckyString): TestcaseObjectBuilder {
        const desc_content = new TestcaseObjectDescContent(id, testcaseId);
        const body_content = new TestcaseObjectBodyContent(system,module,type,priority,level,author,create_time,update_time,testcase_name,precondition,postcondition,expect_result,input_data);
        return new TestcaseObjectBuilder(desc_content, body_content);
    }

    static create(owner: Option<ObjectId>,  id_str: string, testcaseId_str: string, system_str: string,module_str : string,type_str: string,priority_str: string,level_str: string,author_str: string,create_time_str:Number,update_time_str:Number,testcase_name_str: string,precondition_str: string,postcondition_str: string,expect_result_str: string,input_data_str: string): TestcaseObject {
        
        let id = new BuckyString(id_str);
        let testcaseId = new BuckyString(testcaseId_str);
        let system= new BuckyString(system_str);
        let module= new BuckyString(module_str);
        let type= new BuckyString(type_str);
        let priority= new BuckyString(priority_str);
        let level= new BuckyString(level_str);
        let author= new BuckyString(author_str);
        let create_time= new BuckyString(create_time_str.toString());
        let update_time= new BuckyString(update_time_str.toString());
        let testcase_name= new BuckyString(testcase_name_str);
        let precondition= new BuckyString(precondition_str);
        let postcondition= new BuckyString(postcondition_str);
        let expect_result= new BuckyString(expect_result_str);
        let input_data = new BuckyString(input_data_str);
        const builder = this.build(owner, id, testcaseId, system,module,type,priority,level,author,create_time,update_time,testcase_name,precondition,postcondition,expect_result,input_data);
        return builder.option_owner(owner).no_create_time().build(TestcaseObject);
    }
    get_Info(){
        return {
            _id:this.desc().calculate_id().to_base_58(),
            testcaseId : this.desc().content().testcaseId.value(),
            system: this.body().unwrap().content().system.value(),
            module: this.body().unwrap().content().module.value(),
            type: this.body().unwrap().content().type.value(),
            priority : this.body().unwrap().content().priority.value(),
            level: this.body().unwrap().content().level.value(),
            author: this.body().unwrap().content().author.value(),
            create_time: this.body().unwrap().content().create_time.value(),
            update_time : this.body().unwrap().content().update_time.value(),
            testcase_name: this.body().unwrap().content().testcase_name.value(),
            precondition: this.body().unwrap().content().precondition.value(),
            postcondition: this.body().unwrap().content().postcondition.value(),
            expect_result: this.body().unwrap().content().expect_result.value(),
            input_data: this.body().unwrap().content().input_data.value(),
        }
    }

    get id(): BuckyString {
        return this.desc().content().id;
    }

    get testcaseId(): BuckyString {
        return this.desc().content().testcaseId;
    }

    get testcase_name(): BuckyString {
        return this.body_expect().content().testcase_name;
    }

    set testcase_name(testcase_name: BuckyString) {
        this.body_expect().content().testcase_name = testcase_name;
    }
}

export class TestcaseObjectDecoder extends NamedObjectDecoder<TestcaseObjectDescContent, TestcaseObjectBodyContent, TestcaseObject>{
    constructor() {
        super(new TestcaseObjectDescContentDecoder(), new TestcaseObjectBodyContentDecoder(), TestcaseObject);
    }

    static create(): TestcaseObjectDecoder {
        return new TestcaseObjectDecoder()
    }
}