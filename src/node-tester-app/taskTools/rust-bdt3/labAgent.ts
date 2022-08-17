
export const LabSnList=['sn-miner_lab.desc',]
import { RandomGenerator } from '../../base';
import {TestRunner,Testcase,Agent,Task,taskType} from './bdtRunner';

export enum NAT_Type{
    None = 0,
    FullCone = 1,
    RestrictedCone = 1,
    PortRestrictedCone = 2,
    Symmetric = 3, 
}

export type AgentData = {
    tags : Array<string>,
    type : NAT_Type,
    ipv4 : Array<string>,
    ipv6 : Array<string>,
    error?:boolean
}
export const labAgent = {

    NFT1:{
        tags:["NFT1"],
        type :NAT_Type.None,
        ipv4: ['192.168.100.242'],
        ipv6: ['[::]'],
    },
    NFT2:{
        tags:["NFT2"],
        type :NAT_Type.None,
        ipv4: ['192.168.100.175'],
        ipv6: ['[::]'],
    },
    WIN7_0001:{
        tags:["WIN7_0001"],
        type :NAT_Type.None,
        ipv4: ['192.168.100.112'],
        ipv6: ['[::]'],
    },
    Ubuntu20_0019:{
        tags:["Ubuntu20_0019"],
        type :NAT_Type.None,
        ipv4: ['192.168.100.209'],
        ipv6: ['[::]'],
        error : true,
    },
    WIN7_0002:{
        type :NAT_Type.FullCone,
        tags:["WIN7_0002"],
        ipv4: ['192.168.1.180'],
        ipv6: ['[::]'], 
    },
    WIN10_0025:{
        type :NAT_Type.FullCone,
        tags:["WIN10_0025"],
        ipv4: ['192.168.1.139'],
        ipv6: ['[::]'],  

    },
    CentOS8_0030:{
        tags:["CentOS8_0030"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.238'],
        ipv6: ['[::]'],
    },
    Ubuntu20_0021:{
        tags:["Ubuntu20_0021"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.199'],
        ipv6: ['[::]'],
        error : true,

    },
    WIN7_0026:{
        tags:["WIN7_0026"],
        type :NAT_Type.Symmetric,
        ipv4: ['10.1.1.151'],
        ipv6: ['[::]'],
    },
    Ubuntu20_0022:{
        tags:["Ubuntu20_0022"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.100'],
        ipv6: ['[::]'], 
    },
    WIN7_0005:{
        tags:["WIN7_0005"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.101'], 
        ipv6: ['[::]'], 
    },	
    NAS_29:{
        tags:["NAS_29"],
        ipv4: ['192.168.100.29'],
        ipv6: ['[::]'], 
    },
    NAS_235:{
        tags:["NAS_235"],
        ipv4: ['192.168.100.235'],
        ipv6: ['[::]'],
    },
    Ubuntu20_0018:{
        tags:["Ubuntu20_0018"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.126'],
        ipv6: ['[::]'],
    },
    WIN7_32_0024:{
        tags:["WIN7_32_0024"],
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.159'],
        ipv6: ['[::]'],
    },
    Ubuntu20_0020:{
        tags:["Ubuntu20_0020"],
        type :NAT_Type.Symmetric,
        ipv4: ['10.1.1.189'],
        ipv6: ['[::]'],
    },
    WIN7_0027:{
        tags:["WIN7_0027"],
        type :NAT_Type.Symmetric,
        ipv4: ['192.168.1.142'],
        ipv6: ['[::]'],
        error : true,

    }
}

export const PNType = {
    active : {
        activePnFiles:["pn-miner-189.desc"],
        passivePnFiles:[],
        knownPeerFiles:[]
    },
    all : {
        activePnFiles:["pn-miner-189.desc"],
        passivePnFiles:["pn-miner-189.desc"],
        knownPeerFiles:["pn-miner-189.desc"]
    },
    passive : {
        activePnFiles:[],
        passivePnFiles:["pn-miner-189.desc"],
        knownPeerFiles:[]
    },
    none : {
        activePnFiles:[],
        passivePnFiles:[],
        knownPeerFiles:["pn-miner-189.desc"]
    }
}



export async function InitAgentData(testAgent:Array<AgentData>,eps:{ipv4?:{udp?:Boolean,tcp?:Boolean},ipv6?:{udp?:boolean,tcp?:boolean},},logType:string,agentMult:number,SN:Array<string>, config?:{tcpReserve?:boolean,report?:boolean,report_time?:number } ) {
    let agentList:Array<Agent> = [];
    for(let i in testAgent){
        // 节点异常不用
        // if(testAgent[i].error){
        //     continue;
        // }
        // 根据节点计算EP信息
        let epList:Array<string> = [];
        let LW_type = "L"
        if(testAgent[i].type == NAT_Type.None){
            LW_type = "W"
        }else{
            //如果开启tcp 反连 内网设备开启udp 端口
            if(config?.tcpReserve && !eps.ipv4?.udp){
                for(let j in testAgent[i].ipv4){
                    epList.push(`${LW_type}4udp${testAgent[i].ipv4[j]}`)
                } 
            }
        }
        if(eps.ipv4){
            if(eps.ipv4.tcp){
                for(let j in testAgent[i].ipv4){
                    epList.push(`${LW_type}4tcp${testAgent[i].ipv4[j]}`)
                } 
            }
            if(eps.ipv4.udp){
                for(let j in testAgent[i].ipv4){
                    epList.push(`${LW_type}4udp${testAgent[i].ipv4[j]}`)
                } 
            }
        }
        if(eps.ipv6){
            if(eps.ipv6.tcp){
                for(let j in testAgent[i].ipv6){
                    epList.push(`L6tcp${testAgent[i].ipv4[j]}`)
                } 
            }
            if(eps.ipv6.udp){
                for(let j in testAgent[i].ipv6){
                    epList.push(`L6udp${testAgent[i].ipv4[j]}`)
                } 
            }
        }
        let report :boolean  = false;
        let report_time = 5*1000;
        if(config?.report){
            report  = config!.report!;
            report_time  = config!.report_time!;
        }
        
        agentList.push({
            name:testAgent[i].tags[0],
            eps:epList,
            SN,
            agentMult,
            logType,
            NAT:testAgent[i].type,
            report:report, //报错cyfs库的性能数据
            report_time, //间隔时间
        })
    }
    return agentList;
}


/**
 * 
 *  将测试用例集合乱序排序,并且设置运行数量
 */
export async function shuffle(agentList:Array<Task>) : Promise<Array<Task>>  {
    let len = agentList.length;
    while(len){
        let i = RandomGenerator.integer(len);
        len = len - 1;
        let t  = agentList[len]
        agentList[len] = agentList[i]
        agentList[i]  =t
    }
    return agentList;
}