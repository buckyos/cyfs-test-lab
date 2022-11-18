
import * as cyfs from '../../cyfs_node';
import { ZoneSimulator } from './simulator'

export enum all_stacks {
    zone1ood = "zone1ood",
    z1soodsamedec = "z1soodsamedec",
    zone1_device1 = "zone1_device1",
    zone1_device2 = "zone1_device2",
    zone1device1_sys = "zone1device1sys",

    zone2_ood = "zone2ood",
    zone2_device1 = "zone2device1",
    z2d2samedec = "z2d2samedec"
}
export enum all_dec_id {
    zone1ood_decid = "zone1ood_decid",
    //zone1sood_decid = "zone1sood_decid",
    zone1device1_decid = "zone1device1_decid",
    zone1device2_decid = "zone1device2_decid",
    zone1device1sys_decid = "zone1device1sys_decid",

    zone2ood_decid = "zone2ood_decid",
    zone2device1_decid = "zone2device1_decid",
    //zone2device2_decid = "zone2device2_decid",
    diff_zone_same_decid = "diff_zone_same_decid"
}

function decid(dec_id: all_dec_id): cyfs.ObjectId { return cyfs.DecApp.generate_id(cyfs.ObjectId.default(), dec_id) }

export function getDecId(dec_id: string|undefined): cyfs.ObjectId {
    switch (dec_id) {
        case "zone1ood_decid": { return decid(all_dec_id.zone1ood_decid) }
        //case "zone1sood_decid": { return decid(all_dec_id.zone1sood_decid) }
        case "zone1device1_decid": { return decid(all_dec_id.zone1device1_decid) }
        case "zone1device2_decid": { return decid(all_dec_id.zone1device2_decid) }
        case "zone1device1sys_decid": { let sysdec = cyfs.get_system_dec_app().object_id; return sysdec }

        case "zone2ood_decid": { return decid(all_dec_id.zone2ood_decid) }
        case "zone2device1_decid": { return decid(all_dec_id.zone2device1_decid) }
        //case "zone2device2_decid": { return decid(all_dec_id.zone2device2_decid) }
        case "diff_zone_same_decid": { return decid(all_dec_id.diff_zone_same_decid) }
        default: console.warn("==============> decId传参不在可选范围内！返回默认decid"); return ZoneSimulator.zone1_device1_stack.dec_id!
    }
}

export function getStack(ostack: string|undefined): cyfs.SharedCyfsStack {
    let getsamedec:cyfs.ObjectId = getDecId(all_dec_id.diff_zone_same_decid)
    switch (ostack) {
        case "zone1ood": { return ZoneSimulator.zone1_ood_stack.fork_with_new_dec(getDecId(all_dec_id.zone1ood_decid)) }
       // case "zone1sood": { return ZoneSimulator.zone1_standby_ood_stack.fork_with_new_dec(getDecId(all_dec_id.zone1sood_decid)) }
        case "zone1_device1": { return ZoneSimulator.zone1_device1_stack.fork_with_new_dec(getDecId(all_dec_id.zone1device1_decid)) }
        case "zone1_device2": { return ZoneSimulator.zone1_device2_stack.fork_with_new_dec(getDecId(all_dec_id.zone1device2_decid)) }
        case "z1soodsamedec": { return ZoneSimulator.zone1_standby_ood_stack.fork_with_new_dec(getsamedec) }
        case "zone1device1sys": { return ZoneSimulator.zone1_device1_stack.fork_with_new_dec(getDecId(all_dec_id.zone1device1sys_decid)) }
        case "zone2ood": { return ZoneSimulator.zone2_ood_stack.fork_with_new_dec(getDecId(all_dec_id.zone2ood_decid)) }
        case "zone2device1": { return ZoneSimulator.zone2_device1_stack.fork_with_new_dec(getDecId(all_dec_id.zone2device1_decid)) }
        //case "zone2device2": { return ZoneSimulator.zone2_device2_stack.fork_with_new_dec(getDecId(all_dec_id.zone2device2_decid)) }
        case "z2d2samedec": { return ZoneSimulator.zone2_device2_stack.fork_with_new_dec(getsamedec) }
        default: console.warn("==============> stack传参不在可选范围内！返回默认协议栈"); return ZoneSimulator.zone1_device1_stack
    }
}

export function getPeerId(name: string): string {
    switch (name) {
        case "zone1_device1": {
            return ZoneSimulator.zone1_device1_peerId
        }
        case "zone1_device2": {
            return ZoneSimulator.zone1_device2_peerId
        }
        case "zone1_ood": {
            return ZoneSimulator.zone1_ood_peerId
        }
        case "zone2_device1": {
            return ZoneSimulator.zone2_device1_peerId
        }
        case "zone2_device2": {
            return ZoneSimulator.zone2_device2_peerId
        }
        case "zone2_ood": {
            return ZoneSimulator.zone2_ood_peerId
        }
    }
    return ZoneSimulator.zone1_device1_peerId;
}