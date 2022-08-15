import { simulator,CONFIG_PATH } from '../../config/zoneData';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import  {ZoneSimulator} from './simulator'
import {} from "../../config/zoneData"

export class Acl{
    public peerName : string;
    public peerId : string;

    constructor(peerName:string,peerId:string){
        this.peerName = peerName;
        this.peerId = peerId;

    }
    public async removeAclToml(){
        let aclTomlPath = path.join(CONFIG_PATH,this.peerId,'acl')
        console.info(aclTomlPath)
        let result =  fs.removeSync(aclTomlPath)
        return result;
    }
    public async initAclToml(acl_path:string){
        let content = await fs.readFileSync(acl_path);
        let save_path =  path.join(CONFIG_PATH,this.peerId,'acl','acl.toml')
        await this.removeAclToml();
        await fs.mkdirpSync(path.join(CONFIG_PATH,this.peerId,'acl'))
        let result = await fs.writeFileSync(save_path,content)
        return result;
    }
    async initAcl(ACL:{configFile:string,rulesPath?:Array<string>}){
        if(ACL.configFile){
            return await this.initAclToml(ACL.configFile);
        }else{
            //TODO 根据规则生成配置文件
        }
    }

}

export class AclManager{
    public zone1_device1_acl? : Acl 
    public zone1_device2_acl? : Acl
    public zone1_ood_acl? : Acl  
    public zone1_standby_ood_acl? : Acl 
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
        this.zone1_standby_ood_acl = new Acl(simulator.zone1.standby_ood.name,ZoneSimulator.zone1_standby_ood_peerId)
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
            case "zone1_standby_ood" :{
                return this.zone1_standby_ood_acl;
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
        await this.zone1_standby_ood_acl!.removeAclToml();
        await this.zone2_device1_acl!.removeAclToml();
        await this.zone2_device2_acl!.removeAclToml();
        await this.zone2_ood_acl!.removeAclToml();
    }
}