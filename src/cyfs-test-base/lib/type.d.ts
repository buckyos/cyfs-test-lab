export type PeerInfo = {
    peer_name: string;
    dec_id?: string;
    type?: number;
    device_id?: string;
};
export declare enum CyfsDriverType {
    real_machine = "Real_machine",
    runtime = "Runtime",
    gateway = "Gateway",
    simulator = "Simulator",
    bdt_client = "Bdt_client",
    other = "Other"
}
