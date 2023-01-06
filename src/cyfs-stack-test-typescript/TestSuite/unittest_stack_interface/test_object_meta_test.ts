import * as fs from "fs-extra";
import assert = require('assert');
import * as cyfs from '../../cyfs_node'
import { ZoneSimulator,  RandomGenerator} from "../../common";
import * as path from 'path';
import * as gen from "../../common/utils/generator"
import * as events from 'events'
import { None } from "ts-results";
export const Emitter = new events.EventEmitter();
import JSBI from 'jsbi';


type level_ty =  cyfs.NDNAPILevel | cyfs.NONAPILevel 
type stack_va_ty = cyfs.SharedCyfsStack[] | level_ty[] |  boolean[]
type stack_ty = {[x: string]:stack_va_ty} 
type add_file_res = (cyfs.SharedCyfsStack |cyfs.ObjectId) []


let stack_runtime: cyfs.SharedCyfsStack;
let stack_ood: cyfs.SharedCyfsStack;
let zone1ood : cyfs.SharedCyfsStack;
let zone1device1 : cyfs.SharedCyfsStack;
let zone1device2 : cyfs.SharedCyfsStack;
let zone2ood : cyfs.SharedCyfsStack;
let zone2device1 : cyfs.SharedCyfsStack;
let zone2device2 : cyfs.SharedCyfsStack;

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

//dec参数
const DecId = {
    DecIdA: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap(),
    DecIdB: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap(),
    DecIdC: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT7ze").unwrap(),
    DecIdD: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT8ze").unwrap(),
    DecIdE: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT9ze").unwrap(),
    DecIdF: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT1ze").unwrap(),
    DecIdAny: cyfs.get_anonymous_dec_app(),
    DecIdSys: cyfs.get_system_dec_app()
}

let devices = 
[
"sam_dev_sam_zone_sam_dec",
"sam_dev_sam_zone_dif_dec",
"dif_dev_sam_zone_sam_dec",
"dif_dev_dif_zone_sam_dec",
"dif_dev_sam_zone_dif_dec",
"dif_dev_dif_zone_dif_dec"
]

let AccPermissions : cyfs.AccessPermissions [] = [
    cyfs.AccessPermissions.None,
    cyfs.AccessPermissions.CallOnly,
    cyfs.AccessPermissions.WriteOnly,
    cyfs.AccessPermissions.WirteAndCall,
    cyfs.AccessPermissions.ReadOnly,
    cyfs.AccessPermissions.ReadAndCall,
    cyfs.AccessPermissions.ReadAndWrite,
    cyfs.AccessPermissions.Full
]


interface FileTransTask {
    fileName: string,
    savePath: string,
    object_id: cyfs.ObjectId,   
    state?: number
}
    
interface TreeNode {
// 只有根节点没有名字
name?: string,

// 判断是不是叶子节点还是中间的目录结构
type: 'dir' | 'object',

// type = 'dir'情况下有子节点
subs?: Map<string, TreeNode>,

// type='object'情况下有object_id
object_id?: cyfs.ObjectId,
}


/*common handler----------------------------------------------------------------------------------------------------------------------------------------------------------*/

//重建dir的目录树结构
async function build_dir(stack: cyfs.SharedCyfsStack, dir_id: cyfs.DirId) {
    const req = {
        common: {
            level: cyfs.NONAPILevel.Router,
            flags: 0,
        },
        object_id: dir_id.object_id,
    };
    
    const resp = await stack.non_service().get_object(req);
    if (resp.err) {
        console.error(`get dir object from router error!`, resp);
        return;
    }
    
    const ret = resp.unwrap();
    const [dir, _] = new cyfs.DirDecoder().raw_decode(ret.object.object_raw).unwrap();
    
    let root: TreeNode = {
        type: 'dir',
        subs: new Map(
    
        ),
    };
    console.info(root)
    
    dir.desc().content().obj_list().match({
        Chunk: (chunk_id: cyfs.ChunkId) => {
            console.error(`obj_list in chunk not support yet! ${chunk_id}`);
        },
        ObjList: (obj_list) => {
            for (const [inner_path, info] of obj_list.object_map().entries()) {
                const segs = inner_path.value().split('/');
                console.assert(segs.length > 0);
                console.info(`###节点信息：${inner_path},${info.node().object_id()}`)
                // 一个叶子节点就是一个object_id，可能是FileObj，也可能是DirObj
                const leaf_node: TreeNode = {
                    name: segs.pop(),
                    type: 'object',
                    object_id: info.node().object_id()!,
                };
    
                let cur = root.subs!;
                for (const seg of segs) {
                    if (!cur.get(seg)) {
                        const sub_node: TreeNode = {
                            name: seg,
                            type: 'dir',
                            subs: new Map(),
                        };
                        console.info(`添加叶子节点dir：${seg} ${sub_node}`)
                        cur!.set(seg, sub_node);
                    }
                    cur = cur.get(seg)!.subs!;
                }
    
                cur.set(leaf_node.name!, leaf_node);
                console.info(`添加叶子节点object：${leaf_node.name!} ${leaf_node}`)
            }
        }
    });
    return root;
    
    }
        
async function buildDirTree(root: TreeNode, inner_path: cyfs.BuckyString, info: cyfs.InnerNodeInfo) {
    
    const segs = inner_path.value().split('/');

    if (segs.length <= 0) {
        assert(false, "inner_path error")
    }
    else if (segs.length === 1) {
        //console.info(`$$$${inner_path},${segs[0]}`)
        root.subs!.set(segs[0], {
            name: segs[0],
            type: 'object',
            object_id: info.node().object_id()!,
        })
        console.info(`${root.subs!.get(segs[0])!.object_id}`)
    } else if (!root.subs!.get(segs[0])) {
        //console.info(`&&&${inner_path}`)
        let path = ""
        for (let s in segs.slice(1)) {
            path = path + segs.slice(1)[s]
        }
        root.subs!.set(segs[0],
            {
                name: segs[0],
                type: 'dir',
                subs: new Map()
            }

        )
        root.subs!.get(segs[0])!.subs = await buildDirTree(root.subs!.get(segs[0])!, new cyfs.BuckyString(path), info)
    }
    else {
        // console.info(`***${inner_path}`)
        let path = ""
        for (let s in segs.slice(1)) {
            path = path + segs.slice(1)[s]
        }
        root.subs!.get(segs[0])!.subs = await buildDirTree(root.subs!.get(segs[0])!, new cyfs.BuckyString(path), info)
    }
    for (let [abc, test] of root.subs!.entries()) {
        console.info(`##### ${JSON.stringify(abc)}`)
        console.info(`##### ${JSON.stringify(test)}`)
    }
    //console.info(`%%%%${root.subs!.values()}`)
    return root.subs;

}

class GetObjectHandlerDefault implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

async function test_people() {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap()
    let owner_id = cyfs.ObjectId.from_string_as_data("owner").unwrap()
    let author_id = cyfs.ObjectId.from_string_as_data("author").unwrap()
    let dec_id = cyfs.ObjectId.from_string_as_data("decid").unwrap()
    let people = cyfs.People.create(undefined, [], pk.public(), undefined, undefined, undefined, (builder) => {
        builder.author(author_id).dec_id(dec_id);
    });
    

    console.log(people.desc().dec_id()?.toString(), people.desc().dec_id()?.data_as_string())
    console.log(people.desc().author()?.toString(), people.desc().author()?.data_as_string())

    console.assert(people.desc().dec_id()?.data_as_string() === "decid")
    console.assert(people.desc().author()?.data_as_string() === "author")
}

async function create_test_obj1() {
    //模拟器初始化
    await ZoneSimulator.init(false,false,' Console',"http");
    //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
    let stack = ZoneSimulator.zone1_ood_stack
    zone1device1 =ZoneSimulator.zone1_device1_stack
    zone1device2 = ZoneSimulator.zone1_device2_stack

    zone2ood = ZoneSimulator.zone2_ood_stack
    zone2device1 = ZoneSimulator.zone2_device1_stack
    zone2device2 = ZoneSimulator.zone2_device2_stack
    console.info("dec_id",stack.dec_id)

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let deviceidstr = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
    let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16';
    let fileidstr = '7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu';
    let name = "TEST123456!@#$%^";
    let people_author = cyfs.ObjectId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGG').unwrap()
    let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let deviceid = cyfs.DeviceId.from_base_58(deviceidstr).unwrap();
    let ood_list1 = [deviceid]
    let people_area1 = new cyfs.Area(245, 2, 5, 10);
    let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
    let secret = cyfs.PrivateKey.generate_rsa(2048).unwrap();
    let icon = fileid
    let lenstr = '18816701828220000'
    let ex_time = JSBI.BigInt(lenstr)

    let people =  cyfs.People.create(owner, ood_list1, secret.public(), people_area1,name,icon,(pb) => {pb.author(people_author).dec_id(DecId.DecIdF).owner(DecId.DecIdE).expired_time(ex_time)});
    let data = new cyfs.PeopleDecoder().raw_decode(people.to_vec().unwrap()).unwrap();  //对象编解码
    
    interface nonreq extends cyfs.NONPutObjectRequest{}
    let req_non = <nonreq>{}
    req_non.common = {level:cyfs.NONAPILevel.NOC,flags:0}
    req_non.object = new cyfs.NONObjectInfo(people.desc().calculate_id(),data[1])
    console.info("put object",await stack.non_service().put_object(req_non))

    interface nonreq1 extends cyfs.NONGetObjectRequest {}
    let req_non1 = <nonreq1>{}
    req_non1.common = {level:cyfs.NONAPILevel.Router,target:stack.local_device().device_id().object_id,flags:0}
    req_non1.object_id = people.desc().calculate_id()
    console.info("get_file",await stack.non_service().get_object(req_non1))

}

class CreateTestObj {
    constructor(){}

    create_people(): [cyfs.People, cyfs.PrivateKey] {
        let pk = cyfs.PrivateKey.generate_rsa(2048).unwrap();
        let public_key = pk.public();
        let people = cyfs.People.create(undefined, [], public_key, undefined);
        return [people, pk];
    }
    Uint8ArrayToString(fileData: Uint8Array) {
        var dataString = "";
        for (var i = 0; i < fileData.length; i++) {
            dataString += String.fromCharCode(fileData[i]);
        }
        return dataString
    }
    stringToUint8Array(str: string) {
        var arr = [];
        for (var i = 0, j = str.length; i < j; ++i) {
            arr.push(str.charCodeAt(i));
        }
        var tmpUint8Array = new Uint8Array(arr);
        console.info("tmpUint8Array",tmpUint8Array)
        return tmpUint8Array
    }
    


    async create_test_obj() {
        //模拟器初始化
        await ZoneSimulator.init(false,false,' Console',"http");
        //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
        let stack = ZoneSimulator.zone1_ood_stack
        zone1device1 =ZoneSimulator.zone1_device1_stack
        zone1device2 = ZoneSimulator.zone1_device2_stack

        zone2ood = ZoneSimulator.zone2_ood_stack
        zone2device1 = ZoneSimulator.zone2_device1_stack
        zone2device2 = ZoneSimulator.zone2_device2_stack
        console.info("dec_id",stack.dec_id)

        let [ower,key] = this.create_people();
        let pk = cyfs.PrivateKey.generate_rsa(2048).unwrap();
        let public_key = pk.public();
        let people = cyfs.People.create(ower.calculate_id(), [], public_key, undefined);
        // (1)NamedObject 基类方法
        people.calculate_id()  //NamedObject
        people.desc().obj_type_code() //NamedObjectDesc
        people.body_expect().content //ObjectMutBody
        people.signs().body_signs() //ObjectSigns
        let data = new cyfs.PeopleDecoder().raw_decode(people.to_vec().unwrap()).unwrap();  //对象编解码

    
        //(2) 标准对象/核心对象自带方法
        people.desc().author()
        people.body_expect().content().ood_work_mode()
        
    
        //(3) 参数边界值之类的东西
        //let buf = this.stringToUint8Array(RandomGenerator.string(1*1024*1024)) //单个值
        let buf = this.stringToUint8Array('7Tk94YfN97gw6CVG') //单个值
        console.info("buf length",buf.length)/* 2DEG12QA90fruy$^& */
        let unique_id : cyfs.UniqueId = new cyfs.UniqueId(buf);
        let area = new cyfs.Area(1, 2, 3, 4);
        let public_key_device = cyfs.PrivateKey.generate_rsa(2048).unwrap().public();
        let category = cyfs.DeviceCategory.OOD;
        //let device_id = cyfs.DeviceId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ').unwrap()
        let device = cyfs.Device.create(ower.calculate_id(),unique_id,[],[],[],public_key_device,area,category)
        // list 一些结构
        let deviceList : Array<cyfs.DeviceId> = []
        for(let i =0 ; i<3;i++){
            let unique_id : cyfs.UniqueId = cyfs.UniqueId.default();
            let area = new cyfs.Area(1, 2, 3, 4);
            let public_key_device = cyfs.PrivateKey.generate_rsa(2048).unwrap().public();
            let category = cyfs.DeviceCategory.OOD;
            let device = cyfs.Device.create(ower.calculate_id(),unique_id,[],[],[],public_key_device,area,category)
            deviceList.push(device.device_id());
            
        }
        
        let people_area = new cyfs.Area(1, 2, 3, 4)
        let people_name = "test"


        //let desc_content = new cyfs.PeopleDescContent()
        //let body_content = new cyfs.PeopleBodyContent(deviceList)
        //let pb = new cyfs.PeopleBuilder(desc_content,body_content)


            //定义创建对象传入参数
            let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
            let deviceidstr = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
            let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16';
            let fileidstr = '7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu';
            let name = "TEST123456!@#$%^";
            let people_author = cyfs.ObjectId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGG').unwrap()
            let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
            let deviceid = cyfs.DeviceId.from_base_58(deviceidstr).unwrap();
            let ood_list1 = [deviceid]
            let people_area1 = new cyfs.Area(245, 2, 5, 10);
            let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
            let secret = cyfs.PrivateKey.generate_rsa(2048).unwrap();
            let icon = fileid
            let lenstr = '18816701828220000'
            let ex_time = JSBI.BigInt(lenstr)



            //变量定义：set_icon的调用
            let fileidstr1 = '7Tk94Yfh3i5r5fFtvPMZqreFA9tcYfrhMext8dVDU5Zi'
            let fileid1 = cyfs.FileId.from_base_58(fileidstr1).unwrap()

            let PeopleId: cyfs.ObjectId
        
        //let builder = () => {pb.option_author(people_author).option_dec_id(DecId.DecIdF).option_owner(DecId.DecIdE).expired_time(ex_time)}
        
        let people2 =  cyfs.People.create(owner, ood_list1, secret.public(), people_area1,name,icon,(pb) => {pb.author(people_author).dec_id(DecId.DecIdF).owner(DecId.DecIdE).expired_time(ex_time)});

        //let people2 =  cyfs.People.create(undefined, [], public_key, undefined,undefined,undefined, (pb) => {pb.author(people_author).dec_id(DecId.DecIdF).owner(DecId.DecIdE).expired_time(ex_time)});
        let data2 = new cyfs.PeopleDecoder().raw_decode(people2.to_vec().unwrap()).unwrap();  //对象编解码
        console.info("obj_type_code",people2.obj_type_code().toString())
        console.info("obj_category",people2.calculate_id().object_category().toString())
        console.info("obj_type",people2.obj_type().toString())
        console.info("object.dec_id",people2.desc().dec_id()?.toString())
        console.info("object.author",people2.desc().author()?.toString())
        console.info("object.owner",people2.desc().owner()?.toString())
        console.info("object.create_time",people2.desc().create_time().toString())
        console.info("object.update_time",people2.body()?.update_time().toString())
        console.info("object.expired_time",people2.desc().expired_time())
        console.info("PeopleDescTypeInfo", new cyfs.PeopleDescTypeInfo().sub_desc_type().author_type)
        console.info("insert_time noc 插入时间")
        console.info("update_time body 更新时间 ")

       // interface ndnreq extends cyfs.NDNPutDataOutputRequest{}

       // let req_ndn = <ndnreq>{}
    
       // req_ndn.common = {level:cyfs.NDNAPILevel.NDC,flags:0}
       // req_ndn.object_id = people2.desc().calculate_id()
       // req_ndn.data = data2[1]
    
       // await stack.ndn_service().put_data(req_ndn)

        interface nonreq extends cyfs.NONPutObjectRequest{}

        let req_non = <nonreq>{}
    
        req_non.common = {level:cyfs.NONAPILevel.NOC,flags:0}
        req_non.object = new cyfs.NONObjectInfo(people2.desc().calculate_id(),data2[1])
    
        console.info("put object",await stack.non_service().put_object(req_non))
        console.info("file_obj_code",people2.desc().calculate_id().obj_type_code().toString())

        interface nonreq1 extends cyfs.NONGetObjectRequest {}
        let req_non1 = <nonreq1>{}
        req_non1.common = {level:cyfs.NONAPILevel.Router,target:stack.local_device().device_id().object_id,flags:0}
        req_non1.object_id = people2.desc().calculate_id()
    
    
    
        console.info("get_file",await stack.non_service().get_object(req_non1))

        return [people2,stack]

        
    }
}

let para = 
        {
            "acl_path":"/test/api/test/",
            "path":{
            "en_fileName":RandomGenerator.string(10),
            "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
            "cn_fileName":RandomGenerator.string(0,10,0), 
            "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
            "chunkSize" : 4 * 1024 * 1024,
            "timeout" : 600 * 1000,
            "root_path" : "/123/test/",
            "chunkNumber" : 10,
            "flags":0 
        }

/*common functions----------------------------------------------------------------------------------------------------------------------------------------------------*/
//acl参数生成
async function gen_acl(type:string,per:cyfs.AccessPermissions = cyfs.AccessPermissions.Full,acc_num?:number):Promise<cyfs.AccessString|undefined>{
    let acc:cyfs.AccessString
    switch(type){
        case"num":{
            //acc_num 0o777
            acc= (new cyfs.AccessString(acc_num!))}
            return acc
        case"method":{
            acc= cyfs.AccessString.full()}
            return acc
        case"set":{
            acc = new cyfs.AccessString(0)
            acc.set_group_permissions(cyfs.AccessGroup.OthersZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OthersDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OwnerDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.FriendZone,per)
            return  acc
        }
    }
}
//[zone1ood,zone1device1,zone2ood,zone2device1]

//本测试使用的的acl生成
async function r_meta_acc_acl(source:cyfs.SharedCyfsStack,target:cyfs.SharedCyfsStack,path:string,per:cyfs.AccessPermissions):Promise<cyfs.PathOpEnvStub[]|undefined>{
            
            let acc:cyfs.AccessString
            acc = new cyfs.AccessString(0)
            acc.set_group_permissions(cyfs.AccessGroup.OthersZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OthersDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OwnerDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.FriendZone,per)
            
            //rmeta acl
            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
            
            //root_state acl
            let env_acc:cyfs.RootStateOpEnvAccess = {
            path:path,
            access:cyfs.AccessPermissions.Full 
            }
            let stub_source = source.root_state_stub(undefined,undefined)
            let stub_target = target.root_state_stub(undefined,undefined)

            let source_opEnv = (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
            let target_opEnv = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
            console.info("root_state_acc_source: ",(source_opEnv))
            console.info("root_state_acc_target: ",(target_opEnv))
            

            return [source_opEnv,target_opEnv]
}

async function trans_chunk_for_getdata(filePath: string,inner_path:string, chunkSize: number):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    await ZoneSimulator.init(false,false,' Console',"http");
    //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
    let stack = ZoneSimulator.zone1_ood_stack
    
    zone1device1 =ZoneSimulator.zone1_device1_stack
    zone1device2 = ZoneSimulator.zone1_device2_stack

    zone2ood = ZoneSimulator.zone2_ood_stack
    zone2device1 = ZoneSimulator.zone2_device1_stack
    zone2device2 = ZoneSimulator.zone2_device2_stack
    console.info("dec_id",stack.dec_id)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack.local_device().desc().owner()!
    const file_resp_0 = (await stack.trans().publish_file({
        common: {
            level: cyfs.NDNAPILevel.NDC,
            flags: 0,
            dec_id: stack.dec_id,
            referer_object: [],
            target:stack.local_device_id().object_id

        },
        owner:owner,
        local_path: filePath ,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
        }));

        if (file_resp_0.err) {
        console.info(file_resp_0);
        return { err: true, log: "transChunks publish_file failed" }
        }
        
    let object_map_id = cyfs.ObjectMapId.try_from_object_id(file_resp_0.unwrap().file_id).unwrap()   
    console.info("object_map_id: ",object_map_id)

    //2. source 设备 使用NOC 获取本地文件对象
    const file_obj_resp_0 = (await stack.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0,
            dec_id: stack.dec_id,
            target:stack.local_device_id().object_id    
        },
        object_id: object_map_id.object_id,
        inner_path:inner_path
        }))

        if (file_obj_resp_0.err) {
        return { err: true, log: "source noc get file object failed" }
        }
        console.info("get_object_file_id:",file_obj_resp_0.unwrap().object.object_id)
    
    let file_id_from_objectmap = cyfs.FileId.try_from_object_id(file_obj_resp_0.unwrap().object.object_id).unwrap()
    console.info("file_id_from_objectmap: ",file_id_from_objectmap)
    

    //3.从dir map 获取dir 对象
    let dir_from = await stack.util().build_dir_from_object_map({
        common: {flags: 0},
        object_map_id:object_map_id.object_id.clone(),
        dir_type: cyfs.BuildDirType.Zip,
    })

    let dir_id = cyfs.DirId.try_from_object_id(dir_from.unwrap().object_id).unwrap()
    console.info("dir_id: ",dir_id)


    const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();

    const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();

    file_obj_resp_0.unwrap().object.object?.calculate_id().object_category().toString()


    let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
    console.info("chunkIdList", chunkIdList)

    //CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL
    let bundle = new cyfs.ChunkBundle(chunkIdList,cyfs.ChunkBundleHashMethod.Serial)
    let hash = bundle.calc_hash_value()
    //let chunks = cyfs.ChunkList.ChunkInBundle(bundle)
    let chunks = new cyfs.ChunkList(chunkIdList,file_id_from_objectmap ,bundle)
   // cyfs.File.create(file_obj_resp_0.unwrap().object.object_id,file,hash,chunks)

   for(let i = 0 ; i< chunks.inner_chunk_list()?.length!; i++){
    
    let chunk_id = chunks.inner_chunk_list()![i]
    console.info("chunk_id",chunk_id)
    console.info("object.dec_id",chunk_id.desc().dec_id()?.toString())
    //console.info("object.author",chunk_id.desc().

}


   console.info("obj_type_code",file_obj_resp_0.unwrap().object.object?.obj_type_code().toString())
   console.info("obj_category", file_obj_resp_0.unwrap().object.object?.calculate_id().object_category().toString())
   console.info("obj_type",file_obj_resp_0.unwrap().object.object?.obj_type().toString())
   console.info("object.dec_id",)
   console.info("object.author",file.desc().author()?.object_id)
   console.info("object.owner",file.desc().owner()?.toString())
   console.info("object.create_time",file.desc().create_time().toString())
   console.info("object.update_time",file.body()?.update_time().toString())
   console.info("object.expired_time",file.desc().expired_time()?.toString())


    //4. source 设备 将文件对象put 到 targrt 设备
    
    let put_file_object = (await stack.non_service().put_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            dec_id:stack.dec_id,
            target: stack.local_device_id().object_id,
            flags: 0,
        },
        object: file_obj_resp_0.unwrap().object
        }))
        if (put_file_object.err) {
        console.info("put_file_object",put_file_object)
        }


    return [object_map_id,file_id_from_objectmap,dir_id,chunkIdList,stack]
}

async function trans_file_for_task(filePath: string,inner_path:string, chunkSize: number, level:any[]):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    await ZoneSimulator.init(false,false,' Console',"http");
    //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
    let stack = ZoneSimulator.zone1_ood_stack
    
    zone1device1 =ZoneSimulator.zone1_device1_stack
    zone1device2 = ZoneSimulator.zone1_device2_stack

    zone2ood = ZoneSimulator.zone2_ood_stack
    zone2device1 = ZoneSimulator.zone2_device1_stack
    zone2device2 = ZoneSimulator.zone2_device2_stack
    console.info("dec_id",stack.dec_id)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack.local_device().desc().owner()!
    const add_file = (await stack.trans().publish_file({
        common: {
            level: level[0],
            flags: 0,
            dec_id: stack.dec_id,
            referer_object: [],
            target:stack.local_device_id().object_id

        },
        owner:owner,
        local_path: filePath + inner_path,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
        }));

        if (add_file.err) {
        console.info(add_file);
        return { err: true, log: "transChunks publish_file failed" }
        }
        
     
    //console.info("object_map_id: ",object_map_id)
    let file_id = add_file.unwrap().file_id
    //2. source 设备 使用NOC 获取本地文件对象
    const file_obj_resp_0 = (await stack.non_service().get_object({
        common: {
            level: level[1],
            flags: 0,
            dec_id: stack.dec_id,
            target:stack.local_device_id().object_id    
        },
        object_id: file_id,
        //inner_path:inner_path
        }))

        if (file_obj_resp_0.err) {
        return { err: true, log: "source noc get file object failed" }
        }
        console.info("get_object_file_id:",file_obj_resp_0.unwrap().object.object_id)
    
    //3. source 设备 将文件对象put 到 targrt 设备
    const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
    let put_file_object = (await stack.non_service().put_object({
        common: {
            level: level[2],
            dec_id:stack.dec_id,
            target: stack.local_device_id().object_id,
            flags: 0,
        },
        object: file_obj_resp_0.unwrap().object
        }))
        if (put_file_object.err) {
        console.info("put_file_object",put_file_object)
        }
        const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();

    let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
    console.info("chunkIdList", chunkIdList)

    return [file_id,chunkIdList]
}

async function get_data(stack:cyfs.SharedCyfsStack[],referer:cyfs.NDNDataRefererObject[],
                        path_handler:string,level:any,object_id:cyfs.ObjectId,flags:number=0,inner_path?:string){
    
    let req: cyfs.NDNGetDataOutputRequest = {

        common: {                                   
            level: cyfs.NDNAPILevel.NDN,// api级别
            dec_id: stack[0].dec_id, //这里可以模拟当前dec_id
            target: stack[1].local_device_id().object_id,
            // 需要处理数据的关联对象，主要用以chunk/file等+-
            referer_object: referer,
            //new cyfs.NDNDataRefererObject(target,object_id,innerpath), 
            flags: flags,
            req_path: path_handler//如果没有DecId，那么就当当前decid处理
        },
        // 目前只支持ChunkId/FileId/DirId
        object_id: object_id,
        inner_path:inner_path,
        //range:range
        
    }
    let resp = await stack[2].ndn_service().get_data(req)
    return resp
}

async function tarns_task(stack:cyfs.SharedCyfsStack[],referer:cyfs.NDNDataRefererObject[],path_handler:string,level:any,object_id:cyfs.ObjectId,path:string,flags:number,timeout:number){

        let create_task = (await stack[0].trans().create_task({
            common: {
                level: level[0],
                flags: flags,
                dec_id: stack[1].dec_id,
                target: stack[2].local_device_id().object_id,
                //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                referer_object: referer,
                req_path:path_handler
            },
            //不支持DirId,支持ChunkId/FileId
            object_id: object_id,
            local_path: path,
            device_list: [stack[3].local_device_id()],
            auto_start: true
        })).unwrap()
        console.log("create_task_id",JSON.stringify(create_task.task_id))
        let sleepTime = 50;
        console.log("create_task_id",JSON.stringify(create_task.task_id))
    
        //target 设备 get_task_state 检查下载状态
        let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
            setTimeout(() => {
                console.info(`下载文件超时`)
                v({ err: true, log: `下载文件超时：${object_id}` })
            }, timeout)
            while (true) {
                console.log(`savePath: ${path}`);
                const resp = (await stack[4].trans().get_task_state({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                        dec_id: stack[5].dec_id,
                        target: stack[6].local_device_id().object_id,
                        req_path: "",
                        referer_object: []

                    },
                    task_id: create_task.task_id
                })).unwrap();
                console.log("get task status", JSON.stringify(resp.state));
                if (resp.state === cyfs.TransTaskState.Finished) {
                    console.log("download task finished")
                    break;
                }
                if (sleepTime > 2000) {
                    await cyfs.sleep(2000);
                } else {
                    await cyfs.sleep(sleepTime);
                    sleepTime = sleepTime * 2;
                }

            }
            v({ err: false, log: `下载文件成功：${object_id}` })
        })
        return create_task   
}

async function clean_test_data(source:cyfs.SharedCyfsStack,target:cyfs.SharedCyfsStack,obj_id:cyfs.ObjectId,root_state_path:string,test_file_path:string){
    //clear test object 
    let delete_sourceobject_result = (await source.non_service().delete_object(
        {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: obj_id
        }))
    console.info("delete_object_result",JSON.stringify(delete_sourceobject_result))

    let delete_targetobject_result = (await target.non_service().delete_object(
        {
            common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: obj_id
        }))
    console.info("delete_targetobject_result",JSON.stringify(delete_targetobject_result))
    
    //clear test data
    let delete_sourcedata_result = (await source.ndn_service().delete_data(
        {
            common: {
                level: cyfs.NDNAPILevel.NDC,
                referer_object:[],
                flags: 0
            },
            object_id: obj_id
        })).err;
    console.info("delete_sourcedata_result",JSON.stringify(delete_sourcedata_result))
    
    let delete_targetdata_result = (await target.ndn_service().delete_data(
        {
            common: {
                level: cyfs.NDNAPILevel.NDC,
                referer_object:[],
                flags: 0
            },
            object_id: obj_id
        }));
    console.info("delete_targetdata_result",JSON.stringify(delete_targetdata_result))
    
    //clear acl conf
    await source.root_state_meta_stub(undefined,undefined).clear_access()
    await target.root_state_meta_stub(undefined,undefined).clear_access()

    //clear root_state conf
    let env_acc:cyfs.RootStateOpEnvAccess = {
        path:root_state_path,
        access:cyfs.AccessPermissions.Full 
        }
    let stub_source = source.root_state_stub(undefined,undefined)
    let stub_target = target.root_state_stub(undefined,undefined)

    let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
    let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()

    console.info("remove_with_path", await op_env_stub_source.remove_with_path(root_state_path))
    console.info("remove_with_path", await op_env_stub_target.remove_with_path(root_state_path))
    
    //clear test file path
    console.log("clear_file_path",test_file_path)
    fs.removeSync(test_file_path)

}

async function insert_object_map(type:string,path:string,key:any,PathOpEnv:cyfs.PathOpEnvStub){
    //将对象id挂在objet_map上 &&
    let obj  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
    let obj_id = obj.desc().object_id();
    switch(type){
        case "Map":   
            console.info(`#create_new_with_path_map ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Map))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, key))}`)

            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, obj_id))}`)
            console.info(`#before update_result",${JSON.stringify(await PathOpEnv.update())}`)
            let before_path_map_1 = await PathOpEnv.update()
            let before_root_1 = before_path_map_1.unwrap().root
            let before_dec_root_1 = before_path_map_1.unwrap().dec_root
            console.info(`#set_with_path_result:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            let after_path_map_1 = await PathOpEnv.update()
            let after_root_1 = after_path_map_1.unwrap().root
            let after_dec_root_1 = after_path_map_1.unwrap().dec_root
            return [before_root_1,before_dec_root_1,after_root_1,after_dec_root_1]
        case "Set":
            console.info(`#create_new_with_path_Set ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Set))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, key))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, obj_id))}`)
            console.info(`#before update_result",${JSON.stringify(await PathOpEnv.update())}`)
            let before_path_map_2 = await PathOpEnv.update()
            let before_root_2  = before_path_map_2.unwrap().root
            let before_dec_root_2  = before_path_map_2 .unwrap().dec_root
            console.info(`#set_with_path_result:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            let after_path_map_2 = await PathOpEnv.update()
            let after_root_2 = after_path_map_2.unwrap().root
            let after_dec_root_2 = after_path_map_2.unwrap().dec_root
            return [before_root_2,before_dec_root_2,after_root_2,after_dec_root_2]
    }
    
}


    
//desc文件保存路径
export function descpath(file: string) {
    let path = __dirname  + '\\' +file + '_run.desc'
    console.info("path",path)
    return path
}

//读取desc文件desc_buffer
export function decoder(filepath: string): Uint8Array {
    let targetDesc = path.join('', filepath);
    let desc_buf = fs.readFileSync(targetDesc);
    let desc_buffer = new Uint8Array(desc_buf);
    return desc_buffer
};

async function add_file(stack:cyfs.SharedCyfsStack){

    console.info("dec_id",stack.dec_id)
    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let fileidstr = '7Tk94YfN97gw6CVGFLqxuEZWwYJrYcF6C7idYBU7MkiQ';
    let chunkidstr = 'Ua1Fgkj3oyPyVztLZ3bt7NEiPUGSX7hTTuZZXs4HGyz'
    let lenstr = '13316788279729000'
    let filepath = descpath('File1');
    let filepath1 = descpath('File2');
    let filepath2 = descpath('File3')  //只传入fileid参数
    let filepath3 = descpath('File4')  //传入fileid、chunkid参数

    let ranfilepath = 'D:\\Project_Code\\test_lab\\cyfs-test-lab\\src\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface'
    let filename = "test_file.desc"
    let filesize = 1024



    gen.RandomGenerator.createRandomFile(ranfilepath,filename,filesize)

    //创建File对象所需要的参数
    let objectid = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    console.log("objectid",objectid)
    let len = JSBI.BigInt(lenstr)
    console.log("len",len)

    
    //let filehash = file_hash()
    //console.log("filehash",filehash)
    let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
    let chunkid = cyfs.ChunkId.from_base_58(chunkidstr).unwrap()
    console.info("fileid",fileid)
    console.info("chunkid",chunkid)
    
    
    let chunk_list = new cyfs.ChunkList(
        [chunkid],
        undefined,
    )
    
    for(let i = 0 ; i<= chunk_list.inner_chunk_list()?.length!; i++){
        console.info("chunk_list",chunk_list.inner_chunk_list()![i])
    }

    /***let chunk_list2 = new cyfs.ChunkList(
        undefined,
        fileid,
    )
    let chunk_list3 = new cyfs.ChunkList(
        [chunkid],
        fileid,
    )***/
    let owner = stack.local_device().desc().owner()!
    let data = cyfs.buffer_from_hex(chunkidstr).unwrap()

    interface ndnreq extends cyfs.NDNPutDataOutputRequest{}

    let req_ndn = <ndnreq>{}

    req_ndn.common = {level:cyfs.NDNAPILevel.NDC,flags:0}
    req_ndn.object_id = chunkid.calculate_id()
    req_ndn.data = data 

    await stack.ndn_service().put_data(req_ndn)

    let hash = cyfs.HashValue.hash_data(data)

    let object_author = cyfs.ObjectId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGG').unwrap()
    let object_owner = cyfs.ObjectId.from_base_58('5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC').unwrap();
    let object_dec_id = DecId.DecIdF
    let object_create_time = JSBI.BigInt('18616788279729000')
    let object_update_time = JSBI.BigInt('18716788279729000')
    let object_expired_time = JSBI.BigInt('18816788279729000')
    let insert_time = JSBI.BigInt(lenstr)
    let update_time = JSBI.BigInt(lenstr)

    let file = cyfs.File.create(owner,len,hash,chunk_list,(builder) => {builder.author(object_author).dec_id(object_dec_id).expired_time(object_expired_time)})
    //let file = cyfs.File.create(owner,len,hash,chunk_list,(builder) => {builder.create_time(object_create_time).dec_id(DecId.DecIdF).author(object_author).update_time(object_update_time).expired_time(object_expired_time).})
    console.info("obj_type_code",file.obj_type().toString())
    console.info("obj_category",file.file_id().object_id.object_category().toString())
    console.info("obj_type",file.obj_type().toString())
    console.info("object.dec_id",file.desc().dec_id())
    console.info("object.author",file.desc().author()?.toString())
    console.info("object.owner",file.desc().owner()?.toString())
    console.info("object.create_time",file.desc().create_time().toString())
    console.info("object.update_time",file.body()?.update_time().toString())
    console.info("object.expired_time",file.desc().expired_time()?.toString())
    


    let file_id = file.desc().calculate_id()

    console.info("fileid_code",file.obj_type_code())


    interface nonreq extends cyfs.NONPutObjectRequest{}

    let req_non = <nonreq>{}

    req_non.common = {level:cyfs.NONAPILevel.NOC,flags:0}
    req_non.object = new cyfs.NONObjectInfo(file_id,file.to_vec().unwrap())

    let non_res =  await stack.non_service().put_object(req_non)    
    console.info("non_res",JSON.stringify(non_res))
    cyfs.sleep(100)
    let non_res1 =await stack.non_service().put_object(req_non)
    console.info("non_res1",JSON.stringify(non_res1))

    
    

    return [stack,file_id,owner]
}

async function get_file(stack:cyfs.SharedCyfsStack,file_id: cyfs.ObjectId, target:cyfs.DeviceId):Promise<cyfs.BuckyResult<cyfs.NONGetObjectOutputResponse>>{
    interface nonreq extends cyfs.NONGetObjectRequest {}
    let req_non = <nonreq>{}
    req_non.common = {level:cyfs.NONAPILevel.Router,target:target.object_id,flags:0}
    req_non.object_id = file_id
    let res = await stack.non_service().get_object(req_non)
    return res
   
}  

function file_hash(): cyfs.HashValue {

    let desc_buffer = decoder(__dirname + '\\test_file.desc')
    
    let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
    console.info("target",target)
    let desc = target.desc().content().hash
    return desc
}

/*----------------------------------------------------------------------------------------------------------------------------------------------------------*/

describe("object meta测试执行",function(){
    this.timeout(0);
    this.beforeAll(async function () {
        await ZoneSimulator.init(false,false,' Console',"http");
        //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
        zone1ood = ZoneSimulator.zone1_ood_stack
        zone1device1 =ZoneSimulator.zone1_device1_stack
        zone1device2 = ZoneSimulator.zone1_device2_stack
    
        zone2ood = ZoneSimulator.zone2_ood_stack
        zone2device1 = ZoneSimulator.zone2_device1_stack
        zone2device2 = ZoneSimulator.zone2_device2_stack

    })
    this.afterAll(async ()=>{
        console.info(`#########用例执行完成`);
        //ZoneSimulator.clearZoneSimulator();
        ZoneSimulator.stopZoneSimulator();
        //process.exit(0)
    })
                
    it("file_obj_type_run",async () =>{ 
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `obj_type == ${cyfs.ObjectTypeCode.File}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)

        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)

        console.info("remove_res",remove_res)

        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())

        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)  

        await stack.root_state_meta_stub().add_object_meta(test_meta)

        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())
        
        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))

        await stack.root_state_meta_stub().remove_object_meta(test_meta)

    })
    it("file_obj_type_code_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `obj_type_code == ${cyfs.ObjectTypeCode.File.toString()}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)
    
        console.info("res2",JSON.stringify(res2))
        await stack.root_state_meta_stub().remove_object_meta(test_meta)

        
    })
    it("object_category_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object_category == ${cyfs.ObjectCategory.Standard}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)

        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)

        console.info("remove_res",remove_res)

        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())

        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)

        await stack.root_state_meta_stub().add_object_meta(test_meta)

        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))
        await stack.root_state_meta_stub().remove_object_meta(test_meta)

    })
    it("object_dec_id_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object.dec_id == ${DecId.DecIdF}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)

        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)

        console.info("remove_res",remove_res)

        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())

        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)

        await stack.root_state_meta_stub().add_object_meta(test_meta)

        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))

        await stack.root_state_meta_stub().remove_object_meta(test_meta)

    
    })
    it("object_author_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object.author == ${cyfs.ObjectId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGG').unwrap()}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)

        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)

        console.info("remove_res",remove_res)

        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())

        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)

        await stack.root_state_meta_stub().add_object_meta(test_meta)

        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))

        await stack.root_state_meta_stub().remove_object_meta(test_meta)
    })
    it("object_create_time_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object.create_time == ${JSBI.BigInt('18616788279729000')}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id()) 

        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))
    
        await stack.root_state_meta_stub().remove_object_meta(test_meta)
    

    })
    it("object_update_time_run",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object.update_time == ${JSBI.BigInt('18716788279729000')}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)
    
        console.info("res2",JSON.stringify(res2))
    
        await stack.root_state_meta_stub().remove_object_meta(test_meta)

    })
    it("object_expired_time_run()",async () =>{
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        test_meta.selector = `object.expired_time == ${JSBI.BigInt('18816788279729000')}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)

        console.info("res2",JSON.stringify(res2))
    
        await stack.root_state_meta_stub().remove_object_meta(test_meta)
    
    })    
    it("insert_time",async () =>{
        console.info("cyfs.bucky_time_now()",cyfs.bucky_time_now())
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        
        test_meta.selector = `insert_time > ${cyfs.bucky_time_now()}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

       
    
        assert(res2.err , `权限验证成功`)
    
        await stack.root_state_meta_stub().remove_object_meta(test_meta)
    

    })
    it("update_time",async () =>{
        console.info("cyfs.bucky_time_now()",cyfs.bucky_time_now())

        console.info(cyfs.bucky_time_now())
        interface test extends cyfs.GlobalStateObjectMetaItem{}        
        let test_meta = <test>{}
        
        test_meta.selector = `update_time > ${cyfs.bucky_time_now()}`
        
        test_meta.access = cyfs.GlobalStatePathGroupAccess.Default(0o777773)
        test_meta.depth = undefined 
        console.info("test_meta",JSON.stringify(test_meta))
        
        let add_file_res = await add_file(zone1ood)
    
        let stack = add_file_res[0] as cyfs.SharedCyfsStack
        
        let remove_res = await stack.root_state_meta_stub().remove_object_meta(test_meta)
        console.info("stack_dec_id",stack.local_device().device_id().object_id)
    
        console.info("remove_res",remove_res)
    
        await get_file(stack,add_file_res[1] as cyfs.ObjectId,stack.local_device().device_id())
    
        let stack1 = stack.fork_with_new_dec(DecId.DecIdA)
    
        await stack.root_state_meta_stub().add_object_meta(test_meta)
    
        let res2 = await  get_file(stack1,add_file_res[1] as cyfs.ObjectId,stack1.local_device().device_id())

        assert(res2.err , `权限验证成功`)
    
        console.info("res2",JSON.stringify(res2))
    
        await stack.root_state_meta_stub().remove_object_meta(test_meta)
    
    })
})