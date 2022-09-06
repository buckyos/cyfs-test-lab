import { number } from "echarts"

export type BdtLpcCommand = {
    seq?: number; // 请求序列号
    bytes?: Buffer; // Buffer数据
    json: {
        name: string;// Objetct 类型
        obj_type :number; // Objetct 编号
        rust_path : string; //
        ts_path : string;
        desc:{
            name : string,
            ood_list : Array<string>,
            public_ket :string
        },
        body:{
            ood_work_mode :string

        }
    } 
    
};
