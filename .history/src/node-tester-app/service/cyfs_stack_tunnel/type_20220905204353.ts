import { number } from "echarts"

export type BdtLpcCommand = {
    seq?: number; // 请求序列号，暂时不使用
    bytes?: Buffer; // Buffer数据，暂时不使用
    json: {
        name: string;// Objetct 类型
        obj_type :number; // Objetct 编号
        rust_path : string; //rust 编码保存的位置
        ts_path : string; //ts 编码保存的位置
        desc:{
            name : string,
            owner : string,
            ood_list : Array<string>,
            public_key_type : string, // 如果有引用类型，通过${变量名}_type 解析
            public_key :string
        },
        body:{
            ood_work_mode :string

        }
    } 
    
};
