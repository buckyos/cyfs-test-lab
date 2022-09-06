// TS 运行 Rust 程序，TS通过网络请求把参数传输给Rust，返回执行结果

/**
 * 流程：
 * （1）TS 构造一个对象，封装BdtLpcCommand
 * （2）TS 将BdtLpcCommand发送Rust
 * （3）Rust 解析BdtLpcCommand进行解码，读取参数，重新构造BdtLpcCommand
 * （4）Rust 返回TS 解析后的 BdtLpcCommand
 *  (5) TS 判断结果 
 */

export type BdtLpcCommand = {
    seq?: number; // 请求序列号，请求的序列号和返回序列号相同，序列号自增
    bytes?: Buffer; // Buffer数据，把对象编码数据放里面，返回解码数据
    json: {
        name: string;// Objetct 类型
        obj_type :number; // Objetct 编号
        desc:{ // 每个对象不一样，根据变量定义走。rust 读取少了返回一个错误码
            name : string,
            owner : string,
            ood_list : Array<string>,
            public_key_type : string, // 如果有引用类型，通过${变量名}_type 解析
            public_key :string
        },
        body:{ //每个对象不一样，根据变量定义走。rust 读取少了返回一个错误码
            ood_work_mode :string
        }
        result? : { // rust执行结果
            err : number,
            log : string,
        }
    } 
    
};

