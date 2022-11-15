
import {NAT_Type,Agent,Peer} from "./type"

export let LabSnList = ['sn-miner.desc',];
export let PNType = {
    active: {
        activePnFiles: ["pn-miner.desc"],
        passivePnFiles: [],
        knownPeerFiles: []
    },
    all: {
        activePnFiles: ["pn-miner.desc"],
        passivePnFiles: ["pn-miner.desc"],
        knownPeerFiles: ["pn-miner.desc"]
    },
    passive: {
        activePnFiles: [],
        passivePnFiles: ["pn-miner.desc"],
        knownPeerFiles: []
    },
    none: {
        activePnFiles: [],
        passivePnFiles: [],
        knownPeerFiles: ["pn-miner.desc"]
    }
};
export let labAgentData = [
    {
        tags: ["PC_0005"],
        OS: "CentOS8.5",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.161'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0006"],
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.Symmetric,
        ipv4: ['10.1.1.236'],
        router: "Router8",
    },
    {
        tags: ["PC_0007"],
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['10.1.2.189'],
        router: "Router2",
    },
    {
        tags: ["PC_0008"],
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.Symmetric,
        ipv4: ['10.1.1.199'],
        router: "Router3",
    },
    {
        tags: ["PC_0009"],
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['10.1.1.132', '10.1.2.131'],
        router: "Router2&Router6",
    },
    {
        tags: ["PC_0010"],
        OS: "Windows11",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.137'],
        router: "Router5",
    },
    {
        tags: ["PC_0011"],
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.109'],
        //ipv6: ['[::]'],
        router: "Router1",
    },
    {
        tags: ["PC_0012"],
        OS: "Debian11",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.133'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0013"],
        OS: "CentOS8.5",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.171','192.168.1.182'], // 
        //ipv6: ['[::]'],
        router: "Router1&Router5",
    },
    {
        tags: ["PC_0014"],
        OS: "Windows10",
        NAT: NAT_Type.Symmetric,
        ipv4: ['192.168.1.139'],
        router: "Router7",
    },
    {
        tags: ["PC_0015"],
        OS: "Windows7",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.145'],
        router: "Router6",
    },
    {
        tags: ["PC_0016"],
        OS: "Windows11",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.109'],
        router: "Router6",
    },
    {
        tags: ["PC_0017"],
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.177'],
        //ipv6: ['[::]'],
        router: "Router1&Router6",
    },
    {
        tags: ["PC_0018"],
        OS: "Ubuntu 22.04",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.151'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
];
function shuffle (arr:Array<any>) {
    let newArr = Array.prototype.slice.call(arr), // copy 新数组
        temp = 0
    for (let i = arr.length; i > 0; i--) {
        temp = Math.floor(Math.random() * i);
        [newArr[i], newArr[temp]] = [newArr[temp], newArr[i]];
    }
    return newArr
}
export function randShuffle(len:number){
    let result = [];
    for(let i = 0;i<len;i++){
        for(let j = 0;j<len;j++){
            result.push([i,j]);
        } 
    }
    result =  shuffle(result);
    return result

}

// 将测试节点数据乱序
export const labAgent : Array<{
    tags: string[];
    OS: string;
    NAT: NAT_Type;
    ipv4: string[];
    ipv6: string[];
    router: string;
}> = shuffle(labAgentData)


export async function IPv6Agent() {
    let ipv6_list = []
    for(let agent of labAgent){
        if(agent.ipv6){
            ipv6_list.push(agent)
        }
    }
    return ipv6_list
}

export type BdtPeerClientConfig={
    LW_type? :string,
    eps:{ipv4?:{tcp?:boolean,udp?:boolean},ipv6?:{tcp?:boolean,udp?:boolean}}
    bdt_port? : number,
    PN? : {
        activePnFiles: Array<string>,
        passivePnFiles: Array<string>,
        knownPeerFiles: Array<string>,
    },
    SN : Array<string>,
    logType? : string,
    firstQA_answer? : string,
    resp_ep_type? : string,
    udp_sn_only? : number,
    chunk_cache? : string,
    tcp_port_mapping? : string,
}
export async function InitBdtPeerClientData(agent:Agent,config: BdtPeerClientConfig):Promise<Peer>  {
    let epList = [];
    let LW_type = "L";
    if (agent.NAT == NAT_Type.Public) {
        LW_type = "W";
    }
    if (config.LW_type) {
        LW_type = config.LW_type;
    }
    
    if (config.eps.ipv4) {
        if (config.eps.ipv4.tcp) {
            for (let j in agent.ipv4) {
                epList.push(`${LW_type}4tcp${agent.ipv4[j]}`);
            }
        }
        if (config.eps.ipv4.udp) {
            for (let j in agent.ipv4) {
                epList.push(`${LW_type}4udp${agent.ipv4[j]}`);
            }
        }
    }
    if (config.eps.ipv6) {
        if (config.eps.ipv6.tcp) {
            for (let j in agent.ipv6) {
                epList.push(`L6tcp${agent.ipv6[j]}`);
            }
        }
        if (config.eps.ipv6.udp) {
            for (let j in agent.ipv6) {
                epList.push(`L6udp${agent.ipv6[j]}`);
            }
        }
    }
    if (!config.PN) {
        config.PN = PNType.none;
    }
    if(!config.udp_sn_only){
        config.udp_sn_only = 0; 
    }
    let chunk_cache = "file";
    if(config.chunk_cache){
        chunk_cache = config.chunk_cache
    }
    return {
        agent: agent,
        addrInfo: epList,
        sn_files: config.SN,
        RUST_LOG: config.logType,
        active_pn_files: config.PN.activePnFiles,
        passive_pn_files: config.PN.passivePnFiles,
        known_peer_files: config.PN.knownPeerFiles,
        FristQA_answer: config.firstQA_answer,
        ep_type: config.resp_ep_type,
        udp_sn_only:config.udp_sn_only,
        tcp_port_mapping: config.tcp_port_mapping,
        chunk_cache
    };
}

export  function SameRouter(routerA:String, routerB:String) {
    let listA = routerA.split("&");
    let listB = routerB.split("&");
    for (let i in listA) {
        for (let j in listB) {
            if (listA[i] == listB[j]) {
                // 暂时不支持同路由器通过Endpoint L 类型建立连接
                return true;
            }
        }
    }
    return false;
}
export async function AgentList_LAN_WAN(agentList:Array<Agent>) {
    let agentListLAN = [];
    let agentListWAN = [];
    for (let i in agentList) {
        if (agentList[i].NAT == 0) {
            agentListWAN.push(agentList[i]);
        }
        else {
            agentListLAN.push(agentList[i]);
        }
    }
    return { LAN: agentListLAN, WAN: agentListWAN };
}

