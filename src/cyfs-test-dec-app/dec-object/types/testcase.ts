import * as cyfs from "../../cyfs";
import { CustumObjectType,TestcaseType,TestcaseDescType,TestcaseBodyType} from "./type"
// 1. 定义一个Desc类型信息
export class TestcaseDescTypeInfo extends cyfs.DescTypeInfo {
    obj_type(): number {
        return CustumObjectType.Testcase;
    }

    sub_desc_type(): cyfs.SubDescType {
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
const Testcase_DESC_TYPE_INFO = new TestcaseDescTypeInfo();


// 3. 定义DescContent，继承自DescContent
export class TestcaseDescContent extends cyfs.DescContent {

    testcaseName: cyfs.BuckyString;
    constructor(testcaseDesc:TestcaseDescType) {
        super();
        this.testcaseName = testcaseDesc.testcaseName;
    }
    get_testcaseName(): cyfs.BuckyString {
        return this.testcaseName;
    }
    type_info(): cyfs.DescTypeInfo {
        return Testcase_DESC_TYPE_INFO;
    }

    raw_measure(): cyfs.BuckyResult<number> {
        let size = 0;
        size += this.testcaseName.raw_measure().unwrap();
        return cyfs.Ok(size);
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array> {
        buf = this.testcaseName.raw_encode(buf).unwrap();
        return cyfs.Ok(buf);
    }
}

// 4. 定义一个DescContent的解码器
export class TestcaseDescContentDecoder extends cyfs.DescContentDecoder<TestcaseDescContent>{
    type_info(): cyfs.DescTypeInfo {
        return Testcase_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[TestcaseDescContent, Uint8Array]> {
        let testcaseName : cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            testcaseName= r.unwrap()[0];
        }
        const self = new TestcaseDescContent({testcaseName});
        const ret: [TestcaseDescContent, Uint8Array] = [self, buf];
        return cyfs.Ok(ret);
    }
}

// 5. 定义一个BodyContent，继承自RawEncode
export class TestcaseBodyContent extends cyfs.BodyContent {
    remark: cyfs.BuckyString;
    environment: cyfs.BuckyString;
    taskMult: cyfs.BuckyNumber;
    total: cyfs.BuckyNumber;
    success: cyfs.BuckyNumber;
    failed: cyfs.BuckyNumber;
    result: cyfs.BuckyString;
    errorList: cyfs.BuckyString;
    createTime: cyfs.BuckyString;

    constructor(testcaseBody:TestcaseBodyType) {
        super();
        this.remark = testcaseBody.remark;
        this.environment = testcaseBody.environment;
        this.taskMult = testcaseBody.taskMult;
        this.total = testcaseBody.total;
        this.success = testcaseBody.success;
        this.failed = testcaseBody.failed;
        this.result = testcaseBody.result;
        this.remark = testcaseBody.remark;
        this.errorList = testcaseBody.errorList;
        this.createTime = testcaseBody.createTime;
    }
    raw_measure(): cyfs.BuckyResult<number> {
        let size = 0;
        size += this.remark.raw_measure().unwrap();
        size += this.environment.raw_measure().unwrap();
        size += this.taskMult.raw_measure().unwrap();
        size += this.total.raw_measure().unwrap();
        size += this.success.raw_measure().unwrap();
        size += this.failed.raw_measure().unwrap();
        size += this.result.raw_measure().unwrap();
        size += this.errorList.raw_measure().unwrap();
        size += this.createTime.raw_measure().unwrap();
        return cyfs.Ok(size)
    }

    raw_encode(buf: Uint8Array): cyfs.BuckyResult<Uint8Array> {
        buf = this.remark.raw_encode(buf).unwrap();
        buf = this.environment.raw_encode(buf).unwrap();
        buf = this.taskMult.raw_encode(buf).unwrap();
        buf = this.total.raw_encode(buf).unwrap();
        buf = this.success.raw_encode(buf).unwrap();
        buf = this.failed.raw_encode(buf).unwrap();
        buf = this.result.raw_encode(buf).unwrap();
        buf = this.errorList.raw_encode(buf).unwrap();
        buf = this.createTime.raw_encode(buf).unwrap();
        return cyfs.Ok(buf)
    }
}


// 6. 定义一个BodyContent的解码器
export class TestcaseBodyContentDecoder extends cyfs.BodyContentDecoder<TestcaseBodyContent>{
    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[TestcaseBodyContent, Uint8Array]> {
        let remark: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [remark] = r.unwrap();
        }
        let environment: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [environment] = r.unwrap();
        }
        let taskMult: cyfs.BuckyNumber;
        {
            let r = new cyfs.BuckyNumberDecoder("u32").raw_decode(buf);
            if (r.err) {
                return r;
            }
            [taskMult] = r.unwrap();
        }
        let total: cyfs.BuckyNumber;
        {
            let r = new cyfs.BuckyNumberDecoder("u32").raw_decode(buf);
            if (r.err) {
                return r;
            }
            [total] = r.unwrap();
        }
        let success: cyfs.BuckyNumber;
        {
            let r = new cyfs.BuckyNumberDecoder("u32").raw_decode(buf);
            if (r.err) {
                return r;
            }
            [success] = r.unwrap();
        }
        let failed: cyfs.BuckyNumber;
        {
            let r = new cyfs.BuckyNumberDecoder("u32").raw_decode(buf);
            if (r.err) {
                return r;
            }
            [failed] = r.unwrap();
        }
        let result: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [result] = r.unwrap();
        }
        let errorList: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [errorList] = r.unwrap();
        }
        let createTime: cyfs.BuckyString;
        {
            let r = new cyfs.BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [createTime] = r.unwrap();
        }
        const body_content = new TestcaseBodyContent({remark,environment,taskMult,total,success,failed,result,errorList,createTime})

        const ret: [TestcaseBodyContent, Uint8Array] = [body_content, buf];
        return cyfs.Ok(ret);
    }
}

// 7. 定义组合类型
export class TestcaseDesc extends cyfs.NamedObjectDesc<TestcaseDescContent>{
    //
}

export class TestcaseDescDecoder extends cyfs.NamedObjectDescDecoder<TestcaseDescContent>{
    constructor() {
        super(new TestcaseDescContentDecoder());
    }
}

export class TestcaseBuilder extends cyfs.NamedObjectBuilder<TestcaseDescContent, TestcaseBodyContent>{
}

// 通过继承的方式具体化
export class TestcaseId extends cyfs.NamedObjectId<TestcaseDescContent, TestcaseBodyContent>{
    static default(): TestcaseId {
        return cyfs.named_id_gen_default(CustumObjectType.Testcase);
    }

    static from_base_58(s: string): cyfs.BuckyResult<TestcaseId> {
        return cyfs.named_id_from_base_58(CustumObjectType.Testcase, s);
    }

    static try_from_object_id(id: cyfs.ObjectId): cyfs.BuckyResult<TestcaseId> {
        return cyfs.named_id_try_from_object_id(CustumObjectType.Testcase, id);
    }
}

export class TestcaseIdDecoder extends cyfs.NamedObjectIdDecoder<cyfs.DeviceDescContent, cyfs.DeviceBodyContent>{
    constructor() {
        super(CustumObjectType.Testcase);
    }
}

// 定义Testcase对象
// 提供创建方法和其他自定义方法
export class Testcase extends cyfs.NamedObject<TestcaseDescContent, TestcaseBodyContent>{
    static create(
        testcase : TestcaseType,
        owner: cyfs.Option<cyfs.ObjectId>
    ): Testcase {
        const desc_content = new TestcaseDescContent(testcase.desc);
        const body_content = new TestcaseBodyContent(testcase.body);
        const builder = new cyfs.NamedObjectBuilder<TestcaseDescContent, TestcaseBodyContent>(desc_content, body_content)
        const self = builder.option_owner(owner).build(Testcase);
        return new Testcase(self.desc(), self.body(), self.signs(), self.nonce());
    }
}

// 9. 定义Testcase解码器
export class TestcaseDecoder extends cyfs.NamedObjectDecoder<TestcaseDescContent, TestcaseBodyContent, Testcase>{
    constructor() {
        super(new TestcaseDescContentDecoder(), new TestcaseBodyContentDecoder(), Testcase);
    }

    raw_decode(buf: Uint8Array): cyfs.BuckyResult<[Testcase, Uint8Array]> {
        return super.raw_decode(buf).map((r: any) => {
            const [obj, _buf] = r;
            const sub_obj = new Testcase(obj.desc(), obj.body(), obj.signs(), obj.nonce());
            return [sub_obj, _buf] as [Testcase, Uint8Array];
        });
    }
}
