
import { Callback } from "mongoose";
//const mysql = require("mysql");
import * as mysql from "mysql"
/*
测试数据数据库配置
*/
const config = {
    host: '106.13.86.98',
    user: 'testGen',
    password: 'testGen@1996',
    port: 3306,
    database: 'NFT' // 使用数据库名字
};


function dataBaseControl(sql:string,args: Array<any>, callback:any) {
    const connection = mysql.createConnection(config);
    if (args == null || args.length == 0) {
        connection.query(sql, function (error, results, fields) {
            //释放连接
            connection.emit("end");
            if (error) {
                console.error(error);
                callback(null);
                return;
            }
            callback(results);
        });
    }
    else {
        connection.query(sql, args, function (error, results, fields) {
            //释放连接
            connection.emit("end");
            if (error) {
                console.error(error);
                callback(null);
                return;
            }
            callback(results);
        });
    }
}

/*
参数说明：
sqlObj: SQL语句结构体，Object类型
{
    "sql": sql语句,
    "value": sql语句中的参数值
}
return：语句执行结果
*/
// 传入单条SQL语句
export async function ControlAPI_mysql_async(sqlObj:{sql:string,value:Array<any>}) {
    
    return new Promise((resolved, rejected) => {
        dataBaseControl(sqlObj["sql"], sqlObj["value"], (result:any) => {
            if (result === null) {
                rejected(null);
            }
            else {
                resolved(result);
            }
        });
    });
}




export async function agentList(){
    let result =  await ControlAPI_mysql_async({sql:"select * from agent",value:[]});
    return  result
}

export async function addAgent(name:string,check:string,agentinfo:string){
    let result =  await ControlAPI_mysql_async({sql:"INSERT INTO agent(`name`,`online`,`check`,`agentinfo`) VALUES(?,?,?,?);",value:[name,Date.now(),check,agentinfo]});
    return  result
}

export async function online(){
    let result =  await ControlAPI_mysql_async({sql:"select * from agent",value:[]});
    return  result
}

export async function checkOnline(){
    let result:any =  await ControlAPI_mysql_async({sql:"select * from agent",value:[]});
    let now = Date.now();
    let message = "";
    let errorAgent 
    console.info(result!.length)
    for(let i=0; i< result!.length;i++){
        console.info(result[0].online)
        if(now > Number(result[0].online!) + 600*1000 ){
            console.info(`${result[0].name} 离线`)
        }else{
            console.info(`${result[0].name} 在线`)
        }
    }
    return  result;
}


async function main() {
    let add1 = await addAgent("NFT1_runtime","NFT","NFT always run agent")
    let add2 = await addAgent("NFT2_runtime","NFT","NFT always run agent")
    let add3 = await addAgent("NFT1_ood","NFT","NFT always run agent")
    let add4 = await addAgent("NFT2_runtime","NFT","NFT always run agent")
    let info =  await checkOnline();
    console.info(JSON.stringify(info))
    

}
main();



