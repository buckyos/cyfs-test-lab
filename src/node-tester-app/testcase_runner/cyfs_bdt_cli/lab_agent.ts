
import {NAT_Type,Agent,Peer} from "./type"

export let LabSnList = ['sn-miner-cn.desc','sn-miner-un.desc','sn-miner-zero.desc'];

export let LabMutSnList = ['sn-miner-cn.desc','sn-miner-un.desc','sn-miner-zero.desc'];
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
        area : "0:0:0:1",
        OS: "CentOS8.5",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.161'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0006"],
        area : "44:0:0:1",
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.Symmetric,
        ipv4: ['10.1.1.236'],
        router: "Router8",
    },
    {
        tags: ["PC_0007"],
        area : "44:0:0:1",
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['10.1.2.189'],
        router: "Router2",
    },
    {
        tags: ["PC_0008"],
        area : "6:0:20:1",
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.Symmetric,
        ipv4: ['10.1.1.199'],
        router: "Router3",
    },
    {
        tags: ["PC_0009"],
        area : "226:11:20:1",
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['10.1.1.132', '10.1.2.131'],
        router: "Router2&Router6",
    },
    {
        tags: ["PC_0010"],
        area : "226:12:20:1",
        OS: "Windows11",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.137'],
        router: "Router5",
    },
    {
        tags: ["PC_0011"],
        area : "226:1:20:1",
        OS: "Ubuntu 20.04",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.109'],
        //ipv6: ['[::]'],
        router: "Router1",
    },
    {
        tags: ["PC_0012"],
        area : "12:9:20:1",
        OS: "Debian11",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.133'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0013"],
        area : "226:5:20:1",
        OS: "CentOS8.5",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.171','192.168.1.182'], // 
        //ipv6: ['[::]'],
        router: "Router1&Router5",
    },
    {
        tags: ["PC_0014"],
        area : "89:12:20:1",
        OS: "Windows10",
        NAT: NAT_Type.Symmetric,
        ipv4: ['192.168.1.139'],
        router: "Router7",
    },
    {
        tags: ["PC_0015"],
        area : "128:10:20:1",
        OS: "Windows7",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.145'],
        router: "Router6",
    },
    {
        tags: ["PC_0016"],
        area : "196:4:20:1",
        OS: "Windows11",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.109'],
        router: "Router6",
    },
    {
        tags: ["PC_0017"],
        area : "44:6:20:1",
        OS: "Windows10",
        NAT: NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.177'],
        //ipv6: ['[::]'],
        router: "Router1&Router6",
    },
    {
        tags: ["PC_0018"],
        area : "226:4:20:1",
        OS: "Ubuntu 22.04",
        NAT: NAT_Type.Public,
        ipv4: ['192.168.200.151'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
];
const shuffle = function (arr:Array<any>) {
    let newArr = Array.prototype.slice.call(arr), // copy 新数组
        temp = 0
    for (let i = arr.length - 1; i > 0; i--) {
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
export const LabAgent : Array<{
    tags: string[];
    area : string;
    OS: string;
    NAT: NAT_Type;
    ipv4: string[];
    ipv6: string[];
    router: string;
}> = shuffle(labAgentData)


export async function IPv6Agent() {
    let ipv6_list = []
    for(let agent of LabAgent){
        if(agent.ipv6){
            ipv6_list.push(agent)
        }
    }
    return ipv6_list
}

export type BdtCliConfig={
    LW_type? :string,
    eps:{ipv4?:{tcp?:boolean,udp?:boolean},ipv6?:{tcp?:boolean,udp?:boolean},is_wan?:boolean}
    bdt_port_range? : number,
    client_port? : number,
    PN? : {
        activePnFiles: Array<string>,
        passivePnFiles: Array<string>,
        knownPeerFiles: Array<string>,
    },
    SN : Array<string>,
    logType? : string,
    listern_type? : string, 
    firstQA_answer? : string,
    answer_size ? : number,
    resp_ep_type? : string,
    udp_sn_only? : boolean,
    chunk_cache? : string,
    tcp_port_mapping? : string,
}
export async function InitBdtCliData(agent:Agent,config: BdtCliConfig):Promise<Peer>  {
    let epList = [];
    let LW_type = "L";
    if (agent.NAT == NAT_Type.Public) {
        LW_type = "W";
    }
    if (config.eps.is_wan) {
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
        config.udp_sn_only = false; 
    }
    let chunk_cache = "file";
    if(config.chunk_cache){
        chunk_cache = config.chunk_cache
    }
    if(!config.listern_type){
        config.listern_type = "auto_accept"
    }
    if(config.firstQA_answer){
        config.answer_size =  config.firstQA_answer?.length
    }
    if(!config.answer_size){
        config.answer_size = 0;
    }
    return {
        agent: agent,
        area : agent.area,
        addrInfo: epList,
        sn_files: config.SN,
        RUST_LOG: config.logType,
        active_pn_files: config.PN.activePnFiles,
        passive_pn_files: config.PN.passivePnFiles,
        known_peer_files: config.PN.knownPeerFiles,
        answer_size: config.answer_size!,
        ep_type: config.resp_ep_type,
        udp_sn_only:config.udp_sn_only,
        tcp_port_mapping: config.tcp_port_mapping,
        chunk_cache,
        listern_type : config.listern_type,
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

