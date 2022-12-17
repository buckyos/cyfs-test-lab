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
import { ObjectId, ObjectIdDecoder } from '../../cyfs_node';

import { CoreObjectType } from '../../cyfs_node';
import { protos } from  '../../cyfs_node';
import { ProtobufBodyContent, ProtobufBodyContentDecoder, ProtobufDescContent, ProtobufDescContentDecoder }from '../../cyfs_node';
import {
    CustumObjectType,
} from './index'

export class TestReporterObjectDescTypeInfo extends DescTypeInfo {
    obj_type(): number {
        return CustumObjectType.TestReporter;
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

const DECAPP_DESC_TYPE_INFO = new TestReporterObjectDescTypeInfo();

export class TestReporterObjectDescContent extends DescContent  {
    reporterName: BuckyString;
    create_time: BuckyString;
    constructor(reporterName: BuckyString, create_time: BuckyString) {
        super();
        this.reporterName = reporterName;
        this.create_time = create_time;
    }

    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    raw_measure(): BuckyResult<number>{
        let size = 0;
        size += this.reporterName.raw_measure().unwrap();
        size += this.create_time.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.reporterName.raw_encode(buf).unwrap();
        buf = this.create_time.raw_encode(buf).unwrap();
        return Ok(buf);
    }

    
}

export class TestReporterObjectDescContentDecoder extends DescContentDecoder<TestReporterObjectDescContent> {


    type_info(): DescTypeInfo {
        return DECAPP_DESC_TYPE_INFO;
    }

    raw_decode(buf: Uint8Array): BuckyResult<[TestReporterObjectDescContent, Uint8Array]>{
        let reporterName: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [reporterName, buf] = r.unwrap();
        }
        let create_time: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [create_time, buf] = r.unwrap();
        }
        const self = new TestReporterObjectDescContent(reporterName,create_time      );
        const ret:[TestReporterObjectDescContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

export class TestReporterObjectBodyContent extends BodyContent {



    system: BuckyString;
    module: BuckyString;
    create_time: BuckyString;
    report_path: BuckyString;
    report_url: BuckyString;
  


    constructor(system: BuckyString,module : BuckyString,create_time:BuckyString,report_path:BuckyString,report_url: BuckyString) {
        super();
        this.system = system
        this.module = module
        this.create_time = create_time
        this.report_path = report_path
        this.report_url = report_url
    }
    raw_measure(): BuckyResult<number>{
        let size = 0 ;
        size += this.system.raw_measure().unwrap();
        size += this.module.raw_measure().unwrap();
        size += this.create_time.raw_measure().unwrap();
        size += this.report_path.raw_measure().unwrap();
        size += this.report_url.raw_measure().unwrap();
        return Ok(size);
    }

    raw_encode(buf: Uint8Array): BuckyResult<Uint8Array>{
        buf = this.system.raw_encode(buf).unwrap();
        buf = this.module.raw_encode(buf).unwrap();;
        buf = this.create_time.raw_encode(buf).unwrap();
        buf = this.report_path.raw_encode(buf).unwrap();
        buf = this.report_url.raw_encode(buf).unwrap();
        return Ok(buf);
    }


}

export class TestReporterObjectBodyContentDecoder extends BodyContentDecoder<TestReporterObjectBodyContent>{
    raw_decode(buf: Uint8Array): BuckyResult<[TestReporterObjectBodyContent, Uint8Array]>{
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
        let create_time: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [create_time, buf] = r.unwrap();
        }
        let report_path: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [report_path, buf] = r.unwrap();
        }
        let report_url: BuckyString;
        {
            let r = new BuckyStringDecoder().raw_decode(buf);
            if (r.err) {
                return r;
            }
            [report_url, buf] = r.unwrap();
        }
        
        const self = new TestReporterObjectBodyContent(system,module,create_time,report_path,report_url);
        const ret:[TestReporterObjectBodyContent, Uint8Array] = [self, buf];
        return Ok(ret);
    }
}

export class TestReporterObjectDesc extends NamedObjectDesc<TestReporterObjectDescContent>{
    // ignore
}

export class TestReporterObjectDescDecoder extends NamedObjectDescDecoder<TestReporterObjectDescContent>{
    // ignore
}

export class TestReporterObjectBuilder extends NamedObjectBuilder<TestReporterObjectDescContent, TestReporterObjectBodyContent>{
    // ignore
}

export class TestReporterObjectId extends NamedObjectId<TestReporterObjectDescContent, TestReporterObjectBodyContent>{
    constructor(id: ObjectId) {
        super(CustumObjectType.TestReporter, id);
    }

    static default(): TestReporterObjectId {
        return named_id_gen_default(CustumObjectType.TestReporter);
    }

    static from_base_58(s: string): BuckyResult<TestReporterObjectId> {
        return named_id_from_base_58(CustumObjectType.TestReporter, s);
    }

    static try_from_object_id(id: ObjectId): BuckyResult<TestReporterObjectId> {
        return named_id_try_from_object_id(CustumObjectType.TestReporter, id);
    }
}

export class TestReporterObjectIdDecoder extends NamedObjectIdDecoder<TestReporterObjectDescContent, TestReporterObjectBodyContent>{
    constructor() {
        super(CustumObjectType.TestReporter);
    }
}


export class TestReporterObject extends NamedObject<TestReporterObjectDescContent, TestReporterObjectBodyContent>{
    
    static build(owner: ObjectId|undefined,  reporterName: BuckyString,  system: BuckyString,module : BuckyString,create_time:BuckyString,report_path:BuckyString,report_url:BuckyString,resultList?:Array<ObjectId>): TestReporterObjectBuilder {
        const desc_content = new TestReporterObjectDescContent(reporterName,create_time);
        const body_content = new TestReporterObjectBodyContent(system,module,create_time,report_path,report_url);
        return new TestReporterObjectBuilder(desc_content, body_content);
    }
    /**
     * 
     * @param owner 
     * @param reporterName_str 
     * @param system_str 
     * @param module_str 
     * @param create_time_str 
     * @param report_path_str 
     * @param report_url_str 
     * @param resultList 
     */
    static create(owner: ObjectId|undefined,  reporterName_str: string,  system_str: string,module_str : string,create_time_str:string,report_path_str:string,report_url_str:string,resultList?:Array<ObjectId>): TestReporterObject {
        
        let reporterName = new BuckyString(reporterName_str);
        let system= new BuckyString(system_str);
        let module= new BuckyString(module_str);
        let create_time= new BuckyString(create_time_str);
        let report_path = new BuckyString(report_path_str);
        let report_url = new BuckyString(report_url_str);
        const builder = this.build(owner,reporterName,system,module,create_time,report_path,report_url,resultList);
        return builder.option_owner(owner).no_create_time().build(TestReporterObject);
    }

    get_Info(){
        return {
            objectId : this.desc().calculate_id().to_base_58(),
            reporterName:this.desc().content().reporterName.value(),
            create_time : this.desc().content().create_time.value(),
            system: this.body()?.content().system.value(),
            module: this.body()?.content().module.value(),
            report_path: this.body()?.content().report_path.value(),
            report_url: this.body()?.content().report_url.value(),
        }
    }



}

export class TestReporterObjectDecoder extends NamedObjectDecoder<TestReporterObjectDescContent, TestReporterObjectBodyContent, TestReporterObject>{
    constructor() {
        super(new TestReporterObjectDescContentDecoder(), new TestReporterObjectBodyContentDecoder(), TestReporterObject);
    }

    static create(): TestReporterObjectDecoder {
        return new TestReporterObjectDecoder()
    }
}