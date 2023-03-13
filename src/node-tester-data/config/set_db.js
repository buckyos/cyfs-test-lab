const path =require("path");
const fs =require("fs-extra");
// 默认使用nightly
let CYFS_CHANNEL = 'nightly';
console.log(`process.env.CYFS_NODE_ENV = `,process.env.CYFS_NODE_ENV)
if(process.env.CYFS_NODE_ENV == "beta"){
    CYFS_CHANNEL = 'beta'
}else{
    CYFS_CHANNEL = 'nightly'
}
function get_channel(){
    return CYFS_CHANNEL;
}

/**
需要设置环境变量

nightly 环境：(数据库配置为内网nightly)
CYFS_NODE_ENV=nightly
CYFS_DATA_ENV_NIGHTLY=mysql://root:Bucky@0809@192.168.100.205:3306/cyfs_test_lab

beta 环境：
CYFS_NODE_ENV=beta
CYFS_DATA_ENV_BETA=mysql://root:Bucky@0809@${mysql_host}/cyfs_test_lab

 * **/
function set_db(){
    let url= "";
    if(get_channel()=="beta"){
        if(process.env.CYFS_DATA_ENV_BETA == undefined){
            console.error("Error: pealse set process.env.CYFS_DATA_ENV_BETA")
            return;
        }
        url = process.env.CYFS_DATA_ENV_BETA
    }else{
        if(process.env.CYFS_DATA_ENV_NIGHTLY == undefined){
            console.error("Error: pealse set process.env.CYFS_DATA_ENV_NIGHTLY")
            return;
        }
        url = process.env.CYFS_DATA_ENV_NIGHTLY
    }
    let save_path = path.join(__dirname,"../prisma/schema.prisma");
    fs.writeFileSync(save_path,`generator client {
        provider = "prisma-client-js"
      }
      
      datasource db {
        provider = "mysql"
        url      = "${url}"
      }`);
}
set_db();