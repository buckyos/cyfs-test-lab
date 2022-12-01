
export type CyfsStackClientConfig = {
    peer_name: string,
    zone_tag: string,
    stack_type: string,
    bdt_port: number,
    http_port: number,
    ws_port: number,
}


export const DRIVER_TYPE = "real_machine";

/**
 * 真机代理配置
 */
export const REAL_MACHINE_LIST: Array<CyfsStackClientConfig> = [
    {
        peer_name: "zone1_ood",
        zone_tag: "zone1",
        stack_type: "ood",
        bdt_port: 30001,
        http_port: 31000,
        ws_port: 31001,
    },
    {
        peer_name: "zone1_device1",
        zone_tag: "zone1",
        stack_type: "runtime",
        bdt_port: 30002,
        http_port: 31002,
        ws_port: 31003,
    },
    // {
    //     peer_name : "zone1_device2",
    //     zone_tag : "zone1",
    //     stack_type : "runtime",
    //     bdt_port:30003,
    //     http_port:31004,
    //     ws_port: 31005,
    // },
    // {
    //     peer_name : "zone1_standby_ood",
    //     zone_tag : "zone1",
    //     stack_type : "ood",
    //     bdt_port:30004,
    //     http_port:31006,
    //     ws_port: 31007,
    // },
    {
        peer_name: "zone2_ood",
        zone_tag: "zone2",
        stack_type: "ood",
        bdt_port: 30010,
        http_port: 31010,
        ws_port: 31011,
    },
    {
        peer_name: "zone2_device1",
        zone_tag: "zone2",
        stack_type: "runtime",
        bdt_port: 30011,
        http_port: 31012,
        ws_port: 31013,
    },
    // {
    //     peer_name : "zone2_device2",
    //     zone_tag : "zone2",
    //     stack_type : "runtime",
    //     bdt_port:30012,
    //     http_port:31014,
    //     ws_port: 31015,
    // },
    // {
    //     peer_name : "zone2_standby_ood",
    //     zone_tag : "zone2",
    //     stack_type : "ood",
    //     bdt_port:30013,
    //     http_port:31016,
    //     ws_port: 31017,
    // }
]

/**
 * 模拟器代理配置
 */
export const SIMULATOR_LIST: Array<CyfsStackClientConfig> = [
    {
        peer_name: "zone1_ood",
        zone_tag: "zone1",
        stack_type: "ood",
        bdt_port: 20001,
        http_port: 21000,
        ws_port: 21001,
    },
    {
        peer_name: "zone1_device1",
        zone_tag: "zone1",
        stack_type: "runtime",
        bdt_port: 20002,
        http_port: 21002,
        ws_port: 21003,
    },
    {
        peer_name: "zone1_device2",
        zone_tag: "zone1",
        stack_type: "runtime",
        bdt_port: 20003,
        http_port: 21004,
        ws_port: 21005,
    },
    {
        peer_name: "zone1_standby_ood",
        zone_tag: "zone1",
        stack_type: "ood",
        bdt_port: 20004,
        http_port: 21006,
        ws_port: 21007,
    },
    {
        peer_name: "zone2_ood",
        zone_tag: "zone2",
        stack_type: "ood",
        bdt_port: 20010,
        http_port: 21010,
        ws_port: 21011,
    },
    {
        peer_name: "zone2_device1",
        zone_tag: "zone2",
        stack_type: "runtime",
        bdt_port: 20011,
        http_port: 21012,
        ws_port: 21013,
    },
    {
        peer_name: "zone2_device2",
        zone_tag: "zone2",
        stack_type: "runtime",
        bdt_port: 20012,
        http_port: 21014,
        ws_port: 21015,
    },
    {
        peer_name: "zone2_standby_ood",
        zone_tag: "zone2",
        stack_type: "ood",
        bdt_port: 20013,
        http_port: 21016,
        ws_port: 21017,
    }
]