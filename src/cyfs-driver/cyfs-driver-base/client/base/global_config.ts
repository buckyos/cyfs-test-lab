import * as fs from "fs-extra"
import * as toml from "toml"
import path from "path"

export function load_toml(file_path:string){
    if(!fs.pathExistsSync(file_path)){
        console.error(`${file_path} is not exists`)
        return undefined
    }
    let data = fs.readFileSync(file_path);
    return toml.parse(data.toString());
}


export function load_cyfs_driver_client_conf(){
    let cyfs_driver_client_conf = path.join(__dirname,"../../../config/cyfs_driver_client.toml")
    let config = load_toml(cyfs_driver_client_conf);
    if(config == undefined){
        console.info("load cyfs_driver_client.toml failed, use default")
        return {
            "version" : "2.12", 
            "server_host" : "bdttest.tinyappcloud.com",
            "server_port" : 11080,
            heartbeatIntervalTime : 60000,
            "agentServer":{
                "host":"bdttest.tinyappcloud.com",
                "port": 11080
            },
            "updateServer":{
                "host":"bdttest.tinyappcloud.com",
                "port": 9012
            },
            "reportServer":{
                "host":"bdttest.tinyappcloud.com",
                "port": 11000
            },
            "fileUploadServer":{
                "host":"bdttest.tinyappcloud.com",
                "port": 11000 
            },
            "reportCrash":false,
            "removeLog":false
        }
    }
    return config.config

}
export const GlobalConfig = load_cyfs_driver_client_conf();