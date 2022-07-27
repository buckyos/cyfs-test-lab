import { PrismaClient,agent } from '@prisma/client'
import {prisma} from "../"
export type AgentModel =  {
    name: string ;
    online: string ;
    type: string; 
    agentinfo: string ;
    last_time: string ;
  }
  var date = require("silly-datetime");

  export class Agent{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }
    async  checkOnline(check:string,time:number = 10*60*1000) {
        const allUsers = await this.prisma.agent.findMany({
            where: { type: check },
        });
        let message = `检查${check}状态：\n`;
        let err = 0;
        for(let i in allUsers){
            if(Number(allUsers[i].online)<Date.now() - time){
                message = message + `${allUsers[i].name}：离线 ${new Date(Number(allUsers[i].online))}\n`;
                err = 1;
            }else{
                message = message + `${allUsers[i].name}：在线 ${new Date(Number(allUsers[i].online))}\n`;
            }
        }
        return {err,message};
    }
    async agentList(page_index: number =0,page_size: number =10){
        const allUsers = await this.prisma.agent.findMany({
            take:page_size,
            skip: page_index * page_size,
            distinct : "name"
        });
        return allUsers;
    }
    async online(name:string){
        const allUsers = await this.prisma.agent.updateMany({
            data:{
                online : Date.now().toString(),
                last_time : date.format(new Date(),'YYYY/MM/DD HH:mm:ss')
            },
            where:{
                name:name,
            },
        })
        return allUsers;
    }
    async  createAgent(name:string,type:string,agentInfo:string) {
        const result = await this.prisma.agent.create({data:{
            name,
            type:type,
            agentinfo:agentInfo,
            online:Date.now().toString(),
        }})
        //prisma.agent.count
        return result;
    }
  
  }