
import { RandomGenerator } from '../../base';
import {Agent,NAT_Type,Resp_ep_type,AgentData} from './type';


export const LabSnList=['sn-miner.desc',]
export const labAgent = {
    PC_0005:{
        tags:["PC_0005"],
        OS : "CentOS8.5",
        type :NAT_Type.Public,
        ipv4: ['192.168.100.156'],
        ipv6: ['[::]'],
        router:"Bucky",
    },
    PC_0006:{
        tags:["PC_0006"],
        OS : "Ubuntu 20.04",
        type :NAT_Type.Symmetric,
        ipv4: ['10.1.1.236'],
        ipv6: ['[::]'],
        router:"Router8",
    },
    PC_0007:{
        tags:["PC_0007"],
        OS : "Windows10",
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.189'],
        ipv6: ['[::]'],
        router:"Router2",
    },
    PC_0008:{
        tags:["PC_0008"],
        OS : "Ubuntu 20.04",
        type :NAT_Type.Symmetric,
        ipv4: ['10.1.1.199'],
        ipv6: ['[::]'],
        router:"Router3",
    },
    PC_0009:{
        tags:["PC_0009"],
        OS : "Windows10",
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.132','10.1.1.131'],
        ipv6: ['[::]'],
        router:"Router2&Router6",
    },
    PC_0010:{
        tags:["PC_0010"],
        OS : "Windows11",
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.137'],
        ipv6: ['[::]'],
        router:"Router5",
    },
    PC_0011:{
        tags:["PC_0011"],
        OS : "Ubuntu 20.04",
        type :NAT_Type.FullCone,
        ipv4: ['192.168.1.109'],
        ipv6: ['[::]'],
        router:"Router1",
    },
    PC_0012:{
        tags:["PC_0012"],
        OS : "Debian11",
        type :NAT_Type.Public,
        ipv4: ['192.168.100.132'],
        ipv6: ['[::]'],
        router:"Bucky",
    },
    PC_0013:{
        tags:["PC_0013"],
        OS : "CentOS8.5",
        type :NAT_Type.FullCone,
        ipv4: ['192.168.1.182','192.168.10.171'],
        ipv6: ['[::]'],
        router:"Router1&Router5",
    },
    PC_0014:{
        tags:["PC_0014"],
        OS : "Windows10",
        type :NAT_Type.Symmetric,
        ipv4: ['192.168.1.139'],
        ipv6: ['[::]'],
        router:"Router7",
    },
    PC_0015:{
        tags:["PC_0015"],
        OS : "Windows7",
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.145'],
        ipv6: ['[::]'],
        router:"Router6",
    },
    PC_0016:{
        tags:["PC_0016"],
        OS : "Windows11",
        type :NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.142'],
        ipv6: ['[::]'],
        router:"Router6",
    },
    PC_0017:{
        tags:["PC_0017"],
        OS : "Windows10",
        type : NAT_Type.FullCone,
        ipv4: ['192.168.1.177','192.168.1.178'],
        ipv6: ['[::]'],
        router:"Router1&Router6",
    },
    PC_0018:{
        tags:["PC_0018"],
        OS : "Ubuntu 22.04",
        type :NAT_Type.Public,
        ipv4: ['192.168.100.36'],
        ipv6: ['[::]'],
        router:"Bucky",
    },
}

export const PNType = {
    active : {
        activePnFiles:["pn-miner.desc"],
        passivePnFiles:[],
        knownPeerFiles:[]
    },
    all : {
        activePnFiles:["pn-miner.desc"],
        passivePnFiles:["pn-miner.desc"],
        knownPeerFiles:["pn-miner.desc"]
    },
    passive : {
        activePnFiles:[],
        passivePnFiles:["pn-miner.desc"],
        knownPeerFiles:[]
    },
    none : {
        activePnFiles:[],
        passivePnFiles:[],
        knownPeerFiles:["pn-miner.desc"]
    }
}



export async function InitAgentData(testAgent:Array<AgentData>,eps:{ipv4?:{udp?:Boolean,tcp?:Boolean},ipv6?:{udp?:boolean,tcp?:boolean},},logType:string,agentMult:number,SN:Array<string>, config?:{tcpReserve?:boolean,report?:boolean,report_time?:number,PN?:{ activePnFiles: Array<string>,passivePnFiles: Array<string>,knownPeerFiles: Array<string>}} ,firstQA_answer?:string,resp_ep_type?:Resp_ep_type ) {
    let agentList:Array<Agent> = [];
    if(!config){
        config = {}
    }
    for(let i in testAgent){
        // 节点异常不用
        // if(testAgent[i].error){
        //     continue;
        // }
        // 根据节点计算EP信息
        let epList:Array<string> = [];
        let LW_type = "L"
        if(testAgent[i].type == NAT_Type.Public){
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
                    epList.push(`L6tcp${testAgent[i].ipv6[j]}`)
                } 
            }
            if(eps.ipv6.udp){
                for(let j in testAgent[i].ipv6){
                    epList.push(`L6udp${testAgent[i].ipv6[j]}`)
                } 
            }
        }
 
        let report_time = 0;
        if(config?.report){
            report_time  = config!.report_time!;
        }
        if (!config!.PN){
            config!.PN = PNType.none;
        }
        agentList.push({
            name:testAgent[i].tags[0],
            eps:epList,
            SN,
            agentMult,
            logType,
            NAT:testAgent[i].type,
            report_time, //间隔时间
            firstQA_answer,
            resp_ep_type,
            router:testAgent[i].router,
            PN:config!.PN!
        })
    }
    return agentList;
}


