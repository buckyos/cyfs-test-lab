
import * as cyfs from '../../cyfs'
import {ZoneSimulator} from './simulator'

export function getStack(name:string):cyfs.SharedCyfsStack{
    switch(name){
        case  "zone1_device1" :{
            return ZoneSimulator.zone1_device1_stack
        }
        case  "zone1_device2" :{
            return ZoneSimulator.zone1_device2_stack
        }
        case  "zone1_ood" :{
            return ZoneSimulator.zone1_ood_stack
        }
        case  "zone2_device1" :{
            return ZoneSimulator.zone2_device1_stack
        }
        case  "zone2_device2" :{
            return ZoneSimulator.zone2_device2_stack
        }
        case  "zone2_ood" :{
            return ZoneSimulator.zone2_ood_stack
        }
    }
    return ZoneSimulator.zone1_device1_stack;
}

export function getPeerId(name:string):string{
    switch(name){
        case  "zone1_device1" :{
            return ZoneSimulator.zone1_device1_peerId
        }
        case  "zone1_device2" :{
            return ZoneSimulator.zone1_device2_peerId
        }
        case  "zone1_ood" :{
            return ZoneSimulator.zone1_ood_peerId
        }
        case  "zone2_device1" :{
            return ZoneSimulator.zone2_device1_peerId
        }
        case  "zone2_device2" :{
            return ZoneSimulator.zone2_device2_peerId
        }
        case  "zone2_ood" :{
            return ZoneSimulator.zone2_ood_peerId
        }
    }
    return ZoneSimulator.zone1_device1_peerId;
}