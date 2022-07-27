import * as cyfs from "../../cyfs";
import mongoose from "mongoose";
import {stack} from '../utils/stack';


export class Model{
    public stack : cyfs.SharedCyfsStack
    public mongooseConnection?: mongoose.Connection;
    public mongooseInstance: any;
    constructor(stackType?:string){
        
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
    async initMongo(){
        this.connect();
    }
    async initStack(){
        let check =await this.stack.online();
        if(check.err){
            return {err:check.err,log:`${check.val}`}
        }
    }
}