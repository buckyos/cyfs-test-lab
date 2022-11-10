import { type } from "os";
import * as cyfs from "../../../cyfs_node";

export type testNameObject = {
    stack_type:StackType;
    testObject: string;
    casename: string;
    outfile: string; //输出到path.join(cyfs.get_temp_path(), "people");
    expect: string, //比对了哪些属性
    input: {
        owner: string, //限制32位字符，cyfs.ObjectId.from_base_58(str).unwrap()
        ood_list: number, //  代表一个device
        area: string, //"41:2:30:4"
        name: string, 
        icon: string, //限制32位字符，cyfs.FileId.from_base_58(str).unwrap()
        public_key: string, //cyfs.PrivateKey.generate_rsa(2048).unwrap()
        single_key?: string,
        ood_mode?:cyfs.OODWorkMode,
        author?:string,
        dec_id?:string,
        create_time?:cyfs.JSBI,
        update_time?:cyfs.JSBI,
    }
    testowner? : string;
    timeout?:number;
    skip?: boolean;
}



export enum StackType {
    Sim       = "sim",
    Real      = "real",
}
