import * as fs from "fs-extra"
import * as toml from "toml"
import path from "path"
import {DirHelper} from "./util"

export function load_toml(file_path:string){
    if(!fs.pathExistsSync(file_path)){
        console.error(`${file_path} is not exists`)
        return undefined
    }
    let data = fs.readFileSync(file_path);
    return toml.parse(data.toString());
}


export function load_cyfs_driver_client_conf(){
    let cyfs_driver_client_conf = path.join(DirHelper.getConfigDir(),"cyfs_driver_client.toml")
    let config = load_toml(cyfs_driver_client_conf);
    if(config == undefined){
        console.info("load cyfs_driver_client.toml failed, use default")
        return {
            "version" : "2.12", 
            "server_host" : "bdttest.tinyappcloud.com",
            "server_port" : 11080,
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


export function load_driver_machine_conf(){
    let cyfs_driver_client_conf = path.join(DirHelper.getConfigDir(),"driver_machine.toml")
    let config = load_toml(cyfs_driver_client_conf).config;
    let simulator :Array<{
        peer_name: string,
        zone_tag: string,
        stack_type: string,
        bdt_port: number,
        http_port: number,
        ws_port: number,
        ood_daemon_status_port?:number,
    }> = [];
    let real_machine:Array<{
        peer_name: string,
        zone_tag: string,
        stack_type: string,
        bdt_port: number,
        http_port: number,
        ws_port: number,
        ood_daemon_status_port?:number,
    }> = [];
    for(let agent in config.simulator){
        for(let device in config.simulator[agent]){
            if(config.simulator[agent][device].peer_name){
                simulator.push(config.simulator[agent][device])
            }
            
        }
       
    }
    for(let agent in config.real_machine){
        for(let device in config.real_machine[agent]){
            if(config.real_machine[agent][device].peer_name){
                real_machine.push(config.real_machine[agent][device])
            }
            
        }
       
    }
    return {
        simulator,
        real_machine,
        DRIVER_TYPE:config.DRIVER_TYPE
    }

}



export const GlobalConfig = ()=>{
    let conf = path.join(DirHelper.getConfigDir(),"cyfs_driver_client.toml")
    let config = load_toml(conf);
    if(config == undefined){
        console.info("load cyfs_driver_client.toml failed, use default")
        return {
            "version" : "2.12", 
            "server_host" : "bdttest.tinyappcloud.com",
            "server_port" : 11080,
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