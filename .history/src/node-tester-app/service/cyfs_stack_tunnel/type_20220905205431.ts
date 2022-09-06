import { number } from "echarts"

// TS 运行 Rust 程序，TS通过网络请求把参数传输给Rust，返回执行结果

export type BdtLpcCommand = {
    seq?: number; // 请求序列号，请求的序列号和返回序列号相同
    bytes?: Buffer; // Buffer数据，本地网络通讯需要使用，可以替代读磁盘操作
    json: {
        name: string;// Objetct 类型
        obj_type :number; // Objetct 编号
        desc:{ // 
            name : string,
            owner : string,
            ood_list : Array<string>,
            public_key_type : string, // 如果有引用类型，通过${变量名}_type 解析
            public_key :string
        },
        body:{
            ood_work_mode :string
        }
        result? : { // rust执行结果
            err : number,
            log : string,
        }
    } 
    
};
