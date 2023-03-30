

import * as cyfs from '../../cyfs';
// nightly 用来测试的两个dec_app
import {DEC_APP} from '../../cyfs';
export class StackInstance {
    static instance?: StackInstance;
    public stack : cyfs.SharedCyfsStack;
    public ood? : cyfs.ObjectId;
    static createInstance(): StackInstance {
        if (!StackInstance.instance) {
            StackInstance.instance = new StackInstance();
        }
        return StackInstance.instance;
    }
    constructor(){
        this.stack = cyfs.SharedCyfsStack.open_runtime(cyfs.ObjectId.from_base_58(DEC_APP).unwrap());
    }
    async wait_online(){
        console.info(`wait cyfs stack online!`)
        let result =await this.stack.wait_online(); //cyfs.JSBI.BigInt(100000000)
        console.info(`wait cyfs stack online success! device_id = ${this.stack.local_device_id()}`)
        let ood_info =await  this.stack.util().get_ood_status({
            common :{
                flags: 1,
            }
        })
        this.ood = ood_info.unwrap().status.ood_device_id.object_id;
        console.info(`get ood status success , ood = ${ood_info.unwrap().status}`)
    }
}