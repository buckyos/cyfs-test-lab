import { simulator } from '../../config/zoneData';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import  {ZoneSimulator} from './simulator'

export type ACLType = {
    access: string;
    action: {
        direction: string;
        operation: string;
    };
    group: {
        location: string,
        protocol?: string,
        dec?: string,
        relaction?: {
            who: string,
            what?: string,
            categroy: string,
        }
    }
};

const zoneSimulatorConfigPath = `C:/cyfs/etc/zone-simulator` //zoneSimulatorConfigPath 配置文件目录
const defaultACL =`in = { action = "in-*", group = { location = "inner" }, access = "accept" }\nout = { action = "out-*", group = { location = "inner" }, access = "accept" }`


async function createAclToml(peerId:string,aclContent?:string) {    
    let aclTomldir = path.join(zoneSimulatorConfigPath,peerId,'acl/') //ACL 配置目录
    await fs.mkdirpSync(aclTomldir) 
    let aclPath = path.join(aclTomldir,'acl.toml')
    if(!aclContent){
        aclContent = defaultACL
    }
    //let file =  await fs.createFileSync(aclPath)
    await fs.writeFileSync(aclPath,aclContent)
    
}

async function removeAclToml(peerId:string){
    let aclTomlPath = path.join(`C:/cyfs/etc/zone-simulator`,peerId,'acl')
    console.info(aclTomlPath)
    await fs.removeSync(aclTomlPath)
    //await fs.removeSync(aclTomlPath);

}

export class Acl {
    private peerName : string 
    private peerId : string 
    private aclContent : string
    private aclList : Array<{id: string, acl:ACLType}>
    constructor(peerName:string,peerId:string){
        this.peerId = peerId;
        this.peerName = peerName;
        this.aclList = [];
        this.aclContent = "";
    }
    async ACLTypeToContent(){
        let content = ""
        for(let i in this.aclList){
            let acl = this.aclList[i].acl;
            let id  = this.aclList[i].id;
            const actionStr = `"${acl.action.direction}-${acl.action.operation}"`;
            let groupStr = `{`;
            if(acl.group.location){
                groupStr = groupStr + `location="${acl.group.location}",`
            }
            if(acl.group.dec){
                groupStr = groupStr + `dec="${acl.group.dec}",`
            }
            if(acl.group.relaction){
                let relationStr = `${acl.group.relaction.who}-${acl.group.relaction.categroy}`;
                if (acl.group.relaction.what) {
                    relationStr = `${acl.group.relaction.who}-${acl.group.relaction.what}-${acl.group.relaction.categroy}`;
                }
                groupStr = groupStr + `relation="${relationStr}"`
            }
            groupStr = groupStr + `}`
            const aclStr = `${id} = {action=${actionStr}, group=${groupStr}, access=${acl.access}}\n`;
            content = content + aclStr;
        }
        this.aclContent = content;

    }
    async saveAclToml() {
        //await this.ACLTypeToContent();
        let aclTomldir = path.join(zoneSimulatorConfigPath,this.peerId,'acl/') //ACL 配置目录
        await fs.mkdirpSync(aclTomldir) 
        let aclPath = path.join(aclTomldir,'acl.toml')
        console.info(`${this.peerName} 配置 acl.toml,content = ${this.aclContent}`)
        if(!this.aclContent || this.aclContent ===""){
            console.info(`${this.peerName} 设置默认AclToml`)
            this.aclContent = defaultACL
        }
        await fs.writeFileSync(aclPath,this.aclContent)
    }
    async removeAclToml(){
        let clearPath = path.join(zoneSimulatorConfigPath,this.peerId,'acl/')
        console.info(`清除${this.peerName} acl 配置文件${clearPath}`)
        await fs.emptyDirSync(clearPath)
        await fs.removeSync(clearPath);
        this.aclContent = "";
        this.aclList = [];
    }
    async addAclRule(id:string,acl:ACLType){
        this.aclList.push({id,acl})
    }
    async initAcl(ACL:{configFile:string,rulesPath?:Array<string>}){
        if(ACL.configFile){
            // let aclPath = path.join(__dirname,'acl_rule',ACL.configFile)
            console.info(`复制 acl 文件 aclPath = ${ACL.configFile}`)
            let content = await fs.readFileSync(ACL.configFile);
            //console.info(content)
            this.aclContent = content.toString();
            await this.saveAclToml();
            return ;
        }else{
            //TODO 根据规则生成配置文件
        }
    }
    async copyContent(file:string) {
        let aclPath = path.join(__dirname,'acl_rule',file)
        console.info(`复制 acl 文件 aclPath = ${aclPath}`)
        let content = await fs.readFileSync(aclPath);
        //console.info(content)
        this.aclContent = content.toString();
        await this.saveAclToml();
    }
}


export class AclManager{
    public zone1_device1_acl? : Acl 
    public zone1_device2_acl? : Acl
    public zone1_ood_acl? : Acl  
    public zone2_device1_acl? : Acl 
    public zone2_device2_acl? :Acl
    public zone2_ood_acl? : Acl
    constructor(){
       this.init()
    }
    async init(){
        await ZoneSimulator.getPeerId();
        this.zone1_device1_acl = new Acl(simulator.zone1.device1.name,ZoneSimulator.zone1_device1_peerId)
        this.zone1_device2_acl = new Acl(simulator.zone1.device2.name,ZoneSimulator.zone1_device2_peerId)
        this.zone1_ood_acl = new Acl(simulator.zone1.ood.name,ZoneSimulator.zone1_ood_peerId)
        this.zone2_device1_acl = new Acl(simulator.zone2.device1.name,ZoneSimulator.zone2_device1_peerId)
        this.zone2_device2_acl = new Acl(simulator.zone2.device2.name,ZoneSimulator.zone2_device2_peerId)
        this.zone2_ood_acl = new Acl(simulator.zone2.ood.name,ZoneSimulator.zone2_ood_peerId)
    }
    getdevice(name:string) {
        switch(name){
            case "zone1_device1" :{
                return this.zone1_device1_acl;
            }
            case "zone1_device2" :{
                return this.zone1_device2_acl;
            }
            case "zone1_ood" :{
                return this.zone1_ood_acl;
            }
            case "zone2_device1" :{
                return this.zone2_device1_acl;
            }
            case "zone2_device2" :{
                return this.zone2_device2_acl;
            }
            case "zone2_ood" :{
                return this.zone2_ood_acl;
            }
                
        }       
    }
    async removeAllAcl(){
        await this.zone1_device1_acl!.removeAclToml();
        await this.zone1_device2_acl!.removeAclToml();
        await this.zone1_ood_acl!.removeAclToml();
        await this.zone2_device1_acl!.removeAclToml();
        await this.zone2_device2_acl!.removeAclToml();
        await this.zone2_ood_acl!.removeAclToml();
    }
    async saveAllAcl(){
        await this.zone1_device1_acl!.saveAclToml();
        await this.zone1_device2_acl!.saveAclToml();
        await this.zone1_ood_acl!.saveAclToml();
        await this.zone2_device1_acl!.saveAclToml();
        await this.zone2_device2_acl!.saveAclToml();
        await this.zone2_ood_acl!.saveAclToml();
    }
}



const dec_id = 'xxxxx';

const deviceMap: Map<string, {
    aclFd: number
}> = new Map();



export const aclRules = {
    access: {accept:'accept', reject:'reject', drop:'drop', pass:'pass'},
    filter: {
        action: {
            direction: {in:'in', out:'out'},
            operation: {
                put_object:'put-object', 
                get_object:'get-object',
                post_object :'post-object', 
                delete_object:'delete-object', 
                select_object:'select-object',
                put_data:'put-data', 
                get_data:'get-data', 
                delete_data:'delete-data', 
                sign:'sign', 
                verify:'verify', 
                get:'get', 
                put:'put', 
                delete:'delete', 
                read:'read', 
                write:'write',
                all : "*"
            }
        },
        res: { // 先放在这里，写几个常量就可以
            path: [],
            type: [],
        },
        group: {
            location: {inner:'inner', outer:'outer'},
            protocol: {native:'native', meta:'meta', sync:'sync',http_bdt:'http-bdt', http_local:'http-local',data_bdt: 'data-bdt', remote:'remote', local:'local'},
            dec: {system:'system', dec_id},
            relation: {
                who:{my:'my', source:'source', target:'target'},
                what:{device:'device', ood:'ood', zone:'zone', friend:'friend'},
                category: {device:'device', object:'object'}
            }
        }
    }
}
