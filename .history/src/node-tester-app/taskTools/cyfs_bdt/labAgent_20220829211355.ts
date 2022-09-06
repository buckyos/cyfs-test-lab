
import {} from "./type"
const type_1 = require("./type");
exports.LabSnList = ['sn-miner.desc',];
exports.PNType = {
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
exports.labAgent = [
    {
        tags: ["PC_0005"],
        OS: "CentOS8.5",
        NAT: type_1.NAT_Type.Public,
        ipv4: ['192.168.100.156'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0006"],
        OS: "Ubuntu 20.04",
        NAT: type_1.NAT_Type.Symmetric,
        ipv4: ['10.1.1.236'],
        ipv6: ['[::]'],
        router: "Router8",
    },
    {
        tags: ["PC_0007"],
        OS: "Windows10",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.189'],
        ipv6: ['[::]'],
        router: "Router2",
    },
    {
        tags: ["PC_0008"],
        OS: "Ubuntu 20.04",
        NAT: type_1.NAT_Type.Symmetric,
        ipv4: ['10.1.1.199'],
        ipv6: ['[::]'],
        router: "Router3",
    },
    {
        tags: ["PC_0009"],
        OS: "Windows10",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.199.132', '10.1.1.131'],
        ipv6: ['[::]'],
        router: "Router2&Router6",
    },
    {
        tags: ["PC_0010"],
        OS: "Windows11",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.10.137'],
        ipv6: ['[::]'],
        router: "Router5",
    },
    {
        tags: ["PC_0011"],
        OS: "Ubuntu 20.04",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.109'],
        ipv6: ['[::]'],
        router: "Router1",
    },
    {
        tags: ["PC_0012"],
        OS: "Debian11",
        NAT: type_1.NAT_Type.Public,
        ipv4: ['192.168.100.132'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
    {
        tags: ["PC_0013"],
        OS: "CentOS8.5",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.182', '192.168.10.171'],
        ipv6: ['[::]'],
        router: "Router1&Router5",
    },
    {
        tags: ["PC_0014"],
        OS: "Windows10",
        NAT: type_1.NAT_Type.Symmetric,
        ipv4: ['192.168.1.139'],
        ipv6: ['[::]'],
        router: "Router7",
    },
    {
        tags: ["PC_0015"],
        OS: "Windows7",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.145'],
        ipv6: ['[::]'],
        router: "Router6",
    },
    {
        tags: ["PC_0016"],
        OS: "Windows11",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.142'],
        ipv6: ['[::]'],
        router: "Router6",
    },
    {
        tags: ["PC_0017"],
        OS: "Windows10",
        NAT: type_1.NAT_Type.PortRestrictedCone,
        ipv4: ['192.168.1.177', '192.168.1.178'],
        ipv6: ['[::]'],
        router: "Router1&Router6",
    },
    {
        tags: ["PC_0018"],
        OS: "Ubuntu 22.04",
        NAT: type_1.NAT_Type.Public,
        ipv4: ['192.168.100.36'],
        ipv6: ['[::]'],
        router: "Bucky",
    },
];
async function InitBdtPeerClientData(agent, config) {
    let epList = [];
    let LW_type = "L";
    if (agent.NAT == type_1.NAT_Type.Public) {
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
        config.PN = exports.PNType.none;
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
    };
}
exports.InitBdtPeerClientData = InitBdtPeerClientData;
function SameRouter(routerA, routerB) {
    let listA = routerA.split("&");
    let listB = routerB.split("&");
    for (let i in listA) {
        for (let j in listB) {
            if (listA[i] == listB[j]) {
                // 暂时不支持同路由器通过Endpoint L 类型建立连接
                return false;
            }
        }
    }
    return false;
}
exports.SameRouter = SameRouter;
async function AgentList_LAN_WAN(agentList) {
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
exports.AgentList_LAN_WAN = AgentList_LAN_WAN;
