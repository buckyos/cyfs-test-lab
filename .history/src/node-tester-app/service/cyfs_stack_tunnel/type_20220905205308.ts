import { number } from "echarts"

// TS 运行 Rust 程序，通过cmd 或者网络请求把参数传输给Rust

export type BdtLpcCommand = {
    seq?: number; // 请求序列号，本地网络通讯需要使用
    bytes?: Buffer; // Buffer数据，本地网络通讯需要使用，可以替代读磁盘操作
    json: {
        name: string;// Objetct 类型
        obj_type :number; // Objetct 编号
        rust_path? : string; //rust 编码保存的位置 ,定一个固定木比如 ${cyfs_root}/TestRecord/${name}/case1_rust.json
        ts_path? : string; //ts 编码保存的位置 定一个固定木比如 ${cyfs_root}/TestRecord/${name}/case1_ts.json
        
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
