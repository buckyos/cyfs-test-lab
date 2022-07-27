import * as cyfs from "../../cyfs";
import mongoose from "mongoose";
import {stack} from './stack';



/**
 * 性能统计工具 本地缓存mongodb
 * 
 * 
 */

//定义 perfMode
export const PerfTest = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    peerId: {
      type: String,
      required: true
    },
    time: {
        type: Number,
        default: Date.now()
    },
    cpu_usage: {
        type: Number,
    },
    total_memory: {
        type: Number,
    },
    used_memory: {
        type: Number,
    },
    transmitted_bytes: {
        type: Number,
    },
    received_bytes: {
        type: Number,
    }
})
const PerfRecord = mongoose.model("PerfRecord", PerfTest);
export class PerfManager{
    private stack : cyfs.SharedCyfsStack
    private stop : boolean;
    private mongooseInstance: any;
    private mongooseConnection?: mongoose.Connection;
    constructor(stackType?:string){
        
        this.stop = false;
        if(stackType == "runtime"){
            this.stack = cyfs.SharedCyfsStack.open_runtime();
        }else if(stackType == "ood"){
            this.stack = cyfs.SharedCyfsStack.open_default();
        }else{
            this.stack = stack
        }
    }
    private connect(): mongoose.Connection {
        const MONGODB_CONNECTION: string = 'mongodb://localhost:27017/qaTest';
        if (this.mongooseInstance) return this.mongooseInstance;
        this.mongooseInstance = mongoose.connect(MONGODB_CONNECTION,{}).then(()=>{
            console.info("连接数据库成功")
        }).catch((error)=>{
            console.info(`连接数据库失败${error}`);
        })
        .catch(() => console.log('数据库连接失败'));;
        this.mongooseConnection = mongoose.connection;       
        return this.mongooseInstance;
    }
    async init(){
        this.connect();
        let check =await this.stack.online();
        if(check.err){
            return {err:check.err,log:`${check.val}`}
        }
    }
    async stopRecord(){
        this.stop = true;
    }
    async recordOne():Promise<{err:boolean,log:string}>{

        return new Promise(async(v)=>{
            let info =await this.stack.util().get_system_info({common:{flags:0}});
        if(info.err){
            v({err:info.err,log:`${info.val}`});
        }
        let record ={
            name : info.unwrap().info.name,
            peerId : this.stack.local_device_id().to_base_58(),
            time : Date.now(),
            cpu_usage : info.unwrap().info.cpu_usage,
            received_bytes : info.unwrap().info.received_bytes,
            transmitted_bytes : info.unwrap().info.transmitted_bytes,
            total_memory : info.unwrap().info.total_memory,
            used_memory : info.unwrap().info.used_memory,

        } 
        console.info(`添加一条perf 记录 ${JSON.stringify(record)}`)
        try {
            let perf = new PerfRecord(record).save().then((recordInfo:any)=> {
                console.log(`保存到mongo:${JSON.stringify(recordInfo)}`)  
            })
        } catch (error) {
            console.info(error)
             v({err:true,log:"mongo 报存数据失败"})
        }
            v({err:false,log:"保存性能数据成功"})
        })

        
    }
    async record(total:number,interval:number) {
        while(total>0 && !this.stop){
            let info = await this.recordOne();
            if(info.err){
                return {err:info.err,log:info.log}
            }
            await cyfs.sleep(interval);
            total = total - 1;
        }
        return {err:false,log:"性能统计完成"}
    }
    async findRecord(num:number=50) {
        return new Promise(async(v)=>{
            let query =PerfRecord.find().sort({time:-1}).limit(num).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`,datas:[]})
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }
    async findRecordByTime(begin:number,end:number) {
        return new Promise(async(v)=>{
            let query =PerfRecord.find({"time":{$gt: begin,$lt: end}}).exec((err, docs)=>{
                if(err){
                    v({err:true,log:`${err}`,datas:[]})
                }else{
                    v({err:false,datas:docs,log:"查询成功"})
                }
            });
        })    
    }


}


