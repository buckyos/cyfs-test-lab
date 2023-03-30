// import {
//     DescTypeInfo, named_id_gen_default, named_id_from_base_58, named_id_try_from_object_id, NamedObject,
//     NamedObjectBuilder, NamedObjectDecoder,
//     NamedObjectDesc, NamedObjectId, NamedObjectIdDecoder,
//     SubDescType,
//     NamedObjectDescDecoder,
//     BuckyResult,
//     Ok,
//     ObjectId,
//     ObjectIdDecoder,
//     ProtobufDescContent,
//     ProtobufCodecHelper,
//     ProtobufDescContentDecoder, ProtobufBodyContentDecoder, ProtobufBodyContent,
//     DeviceId, OODWorkMode, CoreObjectType, DeviceIdDecoder
// } from '../../cyfs_node';
// import {
//     CustumObjectType,
// } from './index'
// import { protos } from '../../common';



// // 1. 定义一个Desc类型信息
// export class UseProtoBufDescTypeInfo extends DescTypeInfo {
//     obj_type(): number {
//         return CustumObjectType.UseProtobuf;
//     }

//     sub_desc_type(): SubDescType {
//         return {
//             owner_type: "option",   // 是否有主，"disable": 禁用，"option": 可选
//             area_type: "option",    // 是否有区域信息，"disable": 禁用，"option": 可选
//             author_type: "option",  // 是否有作者，"disable": 禁用，"option": 可选
//             // key_type: "single_key"  // 公钥类型，"disable": 禁用，"single_key": 单PublicKey，"mn_key": M-N 公钥对
//             // 还不知道怎么用key 暂时先disable
//             key_type: 'disable'
//         }
//     }
// }

// // 2. 定义一个类型信息常量
// const UseProtoBuf_DESC_TYPE_INFO = new UseProtoBufDescTypeInfo();


// // 3. 定义DescContent，继承自DescContent
// export class UseProtoBufDescContent extends ProtobufDescContent {
//     private readonly m_owner: ObjectId;

//     constructor(owner: ObjectId) {
//         super();

//         this.m_owner = owner;
//     }

//     type_info(): DescTypeInfo {
//         return UseProtoBuf_DESC_TYPE_INFO;
//     }

//     try_to_proto(): BuckyResult<protos.UseProtoBufDescContent> {
//         const target = new protos.UseProtoBufDescContent()
//         target.setOwner(ProtobufCodecHelper.encode_buf(this.m_owner).unwrap())

//         return Ok(target);
//     }

//     owner(): ObjectId {
//         return this.m_owner;
//     }
// }

// // 4. 定义一个DescContent的解码器
// export class UseProtoBufDescContentDecoder extends ProtobufDescContentDecoder<UseProtoBufDescContent, protos.UseProtoBufDescContent>{
//     constructor() {
//         super(protos.UseProtoBufDescContent.deserializeBinary)
//     }

//     type_info(): DescTypeInfo {
//         return UseProtoBuf_DESC_TYPE_INFO;
//     }

//     try_from_proto(value: protos.UseProtoBufDescContent): BuckyResult<UseProtoBufDescContent> {
//         const owner: ObjectId = ProtobufCodecHelper.decode_buf(value.getOwner_asU8(), new ObjectIdDecoder()).unwrap();
//         const result = new UseProtoBufDescContent(owner);

//         return Ok(result);
//     }
// }

// export class UseProtoBufBodyContent extends ProtobufBodyContent {
//     private readonly m_ood_list: DeviceId[];
//     private readonly m_known_device_list: DeviceId[];
//     private readonly m_ood_work_mode: OODWorkMode;

//     constructor(ood_work_mode: OODWorkMode, ood_list: DeviceId[], known_device_list: DeviceId[]) {
//         super();

//         this.m_ood_work_mode = ood_work_mode;
//         this.m_ood_list = ood_list;
//         this.m_known_device_list = known_device_list;
//     }

//     ood_work_mode(): OODWorkMode {
//         return this.m_ood_work_mode;
//     }

//     ood_list(): DeviceId[] {
//         return this.m_ood_list;
//     }

//     known_device_list(): DeviceId[] {
//         return this.m_known_device_list;
//     }

//     try_to_proto(): BuckyResult<protos.UseProtoBufBodyContent> {
//         const target = new protos.UseProtoBufBodyContent()
//         target.setOodListList(ProtobufCodecHelper.encode_buf_list(this.m_ood_list).unwrap())
//         target.setKnownDeviceListList(ProtobufCodecHelper.encode_buf_list(this.m_known_device_list).unwrap())
//         target.setOodWorkMode(this.m_ood_work_mode)

//         return Ok(target);
//     }
// }

// export class UseProtoBufBodyContentDecoder extends ProtobufBodyContentDecoder<UseProtoBufBodyContent, protos.UseProtoBufBodyContent>{
//     constructor() {
//         super(protos.UseProtoBufBodyContent.deserializeBinary)
//     }

//     try_from_proto(value: protos.UseProtoBufBodyContent): BuckyResult<UseProtoBufBodyContent> {
//         const ood_list = ProtobufCodecHelper.decode_buf_list(
//             ProtobufCodecHelper.ensure_not_null(value.getOodListList_asU8()).unwrap(),
//             new DeviceIdDecoder()).unwrap();

//         const known_device_list = ProtobufCodecHelper.decode_buf_list(
//             ProtobufCodecHelper.ensure_not_null(value.getKnownDeviceListList_asU8()).unwrap(),
//             new DeviceIdDecoder()).unwrap();

//         let ood_work_mode = OODWorkMode.Standalone;
//         if (value.hasOodWorkMode()) {
//             ood_work_mode = value.getOodWorkMode() as OODWorkMode;
//         }

//         const result = new UseProtoBufBodyContent(ood_work_mode, ood_list, known_device_list);

//         return Ok(result);
//     }
// }

// export class UseProtoBufDesc extends NamedObjectDesc<UseProtoBufDescContent>{
//     // ignore
// }

// export class UseProtoBufDescDecoder extends NamedObjectDescDecoder<UseProtoBufDescContent>{
//     // ignore
// }

// export class UseProtoBufBuilder extends NamedObjectBuilder<UseProtoBufDescContent, UseProtoBufBodyContent>{
//     // ignore
// }

// export class UseProtoBufId extends NamedObjectId<UseProtoBufDescContent, UseProtoBufBodyContent>{
//     constructor(id: ObjectId) {
//         super(CustumObjectType.UseProtobuf, id);
//     }

//     static default(): DeviceId {
//         return named_id_gen_default(CustumObjectType.UseProtobuf);
//     }

//     static from_base_58(s: string): BuckyResult<DeviceId> {
//         return named_id_from_base_58(CustumObjectType.UseProtobuf, s);
//     }

//     static try_from_object_id(id: ObjectId): BuckyResult<DeviceId> {
//         return named_id_try_from_object_id(CustumObjectType.UseProtobuf, id);
//     }
// }

// export class UseProtoBufIdDecoder extends NamedObjectIdDecoder<UseProtoBufDescContent, UseProtoBufBodyContent>{
//     constructor() {
//         super(CustumObjectType.UseProtobuf);
//     }
// }


// export class UseProtoBuf extends NamedObject<UseProtoBufDescContent, UseProtoBufBodyContent>{
//     static create(owner: ObjectId, ood_work_mode: OODWorkMode, ood_list: DeviceId[], known_device_list: DeviceId[]): UseProtoBuf {
//         const desc_content = new UseProtoBufDescContent(owner);
//         const body_content = new UseProtoBufBodyContent(ood_work_mode, ood_list, known_device_list);

//         return new UseProtoBufBuilder(desc_content, body_content).build(UseProtoBuf);
//     }

//     ood_work_mode(): OODWorkMode {
//         return this.body_expect().content().ood_work_mode();
//     }

//     owner(): ObjectId {
//         return this.desc().content().owner();
//     }

//     ood_list(): DeviceId[] {
//         return this.body_expect().content().ood_list();
//     }

//     known_device_list(): DeviceId[] {
//         return this.body_expect().content().known_device_list();
//     }

//     UseProtoBuf_id(): UseProtoBufId {
//         return new UseProtoBufId(this.desc().calculate_id());
//     }
// }

// export class UseProtoBufDecoder extends NamedObjectDecoder<UseProtoBufDescContent, UseProtoBufBodyContent, UseProtoBuf>{
//     constructor() {
//         super(new UseProtoBufDescContentDecoder(), new UseProtoBufBodyContentDecoder(), UseProtoBuf);
//     }
// }