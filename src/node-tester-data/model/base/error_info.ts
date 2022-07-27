import { PrismaClient,error_info } from '@prisma/client'
import {prisma} from "../"
var date = require("silly-datetime");
export type ErrorModel =  {
    agent: string 
    create_time?: string 
    error_message?: string 
    error_stack?: string 
    testcase?: string 
    create_date?: string 
  }
  var date = require("silly-datetime");

  export class ErrorInfo{
    private prisma :PrismaClient
    constructor(){
      this.prisma = prisma;
    }

    async  report(myerrr:ErrorModel) {
        const result = await this.prisma.error_info.create({data:{
            agent: myerrr.agent,
            create_time: Date.now().toString(), 
            error_message: myerrr.error_message, 
            error_stack: myerrr.error_stack,
            testcase: myerrr.testcase ,
            create_date: date.format(new Date(),'YYYY/MM/DD'),
        }})
        return result;
    }
  
  }