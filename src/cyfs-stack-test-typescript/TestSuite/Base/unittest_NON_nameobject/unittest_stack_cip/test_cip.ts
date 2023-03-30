import assert  from 'assert'; 
import * as cyfs from '../../cyfs_node';
import {ZoneSimulator,stringToUint8Array,RandomGenerator,stackInfo} from "../../common";
import * as path from 'path';
import { before } from 'mocha';
import { PassThrough } from 'stream';
import * as bip39 from 'bip39';
import * as Buffer from 'safe-buffer'
import * as fs from 'fs-extra';
import { dir } from "console";
import * as jsonfile from 'jsonfile'
//import * as proxyquire from 'proxyquire'
const sleep = require('util').promisify(setTimeout)


//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_object_map",
    dir: cyfs.get_app_log_dir("unittest_object_map"),
    file_max_size: 1024 * 1024 *10,
    file_max_count: 10,
});



let temp: string[] = new Array();
export function fileDisplay(filePath: string) {
    // 根据文件路径读取文件，返回一个文件列表
    const files = fs.readdirSync(filePath);
    // 遍历读取到的文件列表
    for (let filename of files) {
     // path.join得到当前文件的绝对路径
        const filepath = path.join(filePath, filename);
     // 根据文件路径获取文件信息
        const stats = fs.statSync(filepath);
        const isFile = stats.isFile(); // 是否为文件
        const isDir = stats.isDirectory(); // 是否为文件夹
        if (isFile) {
            temp.push(filepath);
            }
        if (isDir) {
           fileDisplay(filepath); // 递归，如果是文件夹，就继续遍历该文件夹里面的文件
             }
         };
    return temp
    }
    
function readjson(temp:string[]){
    for (let item of temp){
        let extname = path.extname(item)
        if (extname == ".json"){
        let basename = path.basename(item, extname);
        console.log("basename",item)
        
        jsonfile.readFile(item, function(err, jsonData) {
        if (err) throw err;
        for (var i = 0; i < jsonData.length; ++i) {   
            console.log("Emp ID: "+jsonData[i].emp_id);
            console.log("Emp Name: "+jsonData[i].emp_name);
            console.log("Emp Address: "+jsonData[i].emp_addr);
            console.log("Designation: "+jsonData[i].designation);
            console.log("input: "+jsonData[i].input.owner);
            console.log("input: "+jsonData[i].input.ood_list);
            console.log("input: "+jsonData[i].input.area);
            console.log("input: "+jsonData[i].input.name);
            console.log("input: "+jsonData[i].input.icon);
            console.log("input: "+jsonData[i].input.public_key);
            console.log("---------------------------------------");
    } 
    });
    }
}
}

function get_sk(people_sk?:cyfs.PrivateKey,people?:cyfs.People,device?:cyfs.Device,ob_type?:string):cyfs.PrivateKey | undefined{
    let bip:cyfs.CyfsSeedKeyBip
    let path:cyfs.CyfsChainBipPath
    let sk:cyfs.PrivateKey
    let sk_hex:string
    switch(ob_type){
        case"people" :
            bip = cyfs.CyfsSeedKeyBip.from_mnemonic(bip39.generateMnemonic()).unwrap()
            path = cyfs.CyfsChainBipPath.new_people()
            sk = bip.sub_key(path).unwrap()
            return sk;
        case"people_sign":
            bip = cyfs.CyfsSeedKeyBip.from_mnemonic(bip39.generateMnemonic()).unwrap()
            path = cyfs.CyfsChainBipPath.new_people()
            sk= bip.sub_key(path).unwrap()
            //签名
            cyfs.sign_and_set_named_object(
                people_sk!,
                people!,
                new cyfs.SignatureRefIndex(254),
                ).unwrap();
            return sk;
        case"device":
            sk_hex = cyfs.toHexString(people_sk!.to_vec().unwrap())
            bip = cyfs.CyfsSeedKeyBip.from_private_key(sk_hex, people!.desc().calculate_id().to_string()).unwrap();
            path = cyfs.CyfsChainBipPath.new_device(0);
            sk = bip.sub_key(path).unwrap()
            return sk;
        case"device_sign":
            sk_hex = cyfs.toHexString(people_sk!.to_vec().unwrap())
            bip = cyfs.CyfsSeedKeyBip.from_private_key(sk_hex, people!.desc().calculate_id().to_string()).unwrap();
            path = cyfs.CyfsChainBipPath.new_device(0);
            sk = bip.sub_key(path).unwrap()
            //签名
            cyfs.sign_and_set_named_object(
                people_sk!,
                device!,
                new cyfs.SignatureRefIndex(254),
                ).unwrap();
            return sk;
    }
}

function people_create(name:string,owner:string,deviceid:string,area:string,icon:string,pk:cyfs.PrivateKey):cyfs.People{
    let people = cyfs.People.create(
        cyfs.Some(cyfs.ObjectId.from_base_58(owner).unwrap()),
        [cyfs.DeviceId.from_base_58(deviceid).unwrap()],
        pk.public(),
        cyfs.Some(new cyfs.Area(Number(area.split(":")[0]),Number(area.split(":")[1]),Number(area.split(":")[2]),Number(area.split(":")[3]))),
        name,
        cyfs.FileId.from_base_58(icon).unwrap())
    return people
        }
                 

function device_create(name:string,owner:string,device_sk:cyfs.PrivateKey,area:string,people:cyfs.People):cyfs.Device{
    let unique_id0 = cyfs.UniqueId.create_with_hash(cyfs.fromHexString(name));
    //简单创建Device对象
    let device = cyfs.Device.create(
        cyfs.Some(cyfs.ObjectId.from_base_58(owner).unwrap()),
        unique_id0,
        [],
        [],
        [],
        device_sk.public(),
        (new cyfs.Area(Number(area.split(":")[0]),Number(area.split(":")[1]),Number(area.split(":")[2]),Number(area.split(":")[3]))),
        cyfs.DeviceCategory.OOD 
    )
    return device                
}


describe("#state_storage 测试执行",function(){
    let stack:cyfs.SharedCyfsStack;
    this.beforeAll(async function(){
        
        //测试前置条件，连接测试模拟器设备      
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack = ZoneSimulator.zone1_device1_stack!;;
    })
    this.afterAll(async ()=>{
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })
    
    describe("##Cip 接口测试",async()=>{
        describe("#Ts端生成People私钥",async()=>{  
            it("长度小于12英文助记词,分段密码,多次生成一枚people私钥",async()=>{  
                 

            })
            it("长度大于12英文助记词,分段密码,多次生成一枚people私钥",async()=>{     

            })
            it("长度等于12英文助记词,分段密码,多次生成一枚people私钥",async()=>{   

            })
            it("长度等于12助记词,随机密码,随机密码多次生成不同people私钥",async()=>{     

            })
            it("长度等于12助记词,混合密码,多次生成一枚people私钥",async()=>{

            })
        })
        describe("#Ts端生成Device私钥",async()=>{ 
            it("长度等于12英文助记词,分段密码,多次生成一枚device私钥",async()=>{  

            })
            it("长度等于12英文助记词,随机密码,多次生成多枚不同device私钥",async()=>{   

            })
            it("长度等于12英文助记词,混合密码,多次生成一枚device私钥",async()=>{   

            })         
        })
        describe("#TS端到Rust端生成people私钥",async()=>{
            it("长度等于12英文助记词,分段密码,多次生成一枚people私钥",async()=>{    

            })
            it("长度等于12英文助记词,分段密码,多次生成不同people私钥",async()=>{  

            })
            it("长度等于12英文助记词,随机密码,多次生成一枚people私钥",async()=>{   

            })
            it("长度等于12英文助记词,随机密码,多次生成不同people私钥",async()=>{   

            })
            it("长度等于12英文助记词,混合密码,多次生成一枚people私钥",async()=>{   

            })
            it("长度等于12英文助记词,混合密码,多次生成不同people私钥",async()=>{    

            })
        })
        describe("#TS端到Rust端生成device私钥",async()=>{
            it("长度等于12英文助记词,分段密码,多次生成一枚device私钥",async()=>{   

            })
            it("长度等于12英文助记词,分段密码,多次生成不同device私钥",async()=>{   

            })
            it("长度等于12英文助记词,随机密码,多次生成一枚device私钥",async()=>{   

            })
            it("长度等于12英文助记词,随机密码,多次生成不同device私钥",async()=>{     

            })
            it("长度等于12英文助记词,混合密码,多次生成一枚device私钥",async()=>{    

            })
            it("长度等于12英文助记词,混合密码,多次生成不同device私钥",async()=>{   

            })
        })
    })
})

