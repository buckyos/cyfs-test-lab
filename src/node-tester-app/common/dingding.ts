import * as http from "http"
import * as fs from 'fs' 
import * as crypto from "crypto"
import {dingdingConfig} from "../config/config";
var request=require('request');
//钉钉消息推送配置
const dingdingUrl = dingdingConfig.NFT.dingdingUrl
const  secret=dingdingConfig.NFT.secret
let dinfdingMsg =  {
    "at": dingdingConfig.NFT.msg.at,
    "text": {
        "content": "测试"
    },
    "msgtype":dingdingConfig.NFT.msg.msgtype
};


export async function dingding(content:string){
    dinfdingMsg.text.content = content;
    let postData= JSON.stringify(dinfdingMsg);
    let header = {'Content-Type': 'application/json','Content-Length': Buffer.byteLength(postData)}
    //进行签名
    const timestamp = new Date().getTime()
    const stringToSign = timestamp + "\n" + secret
    const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest("base64");
    // 最终得到的签名sign
    const sign_urlencode = encodeURIComponent(sign)
    let dindding = dingdingUrl + `&sign=${sign_urlencode}&timestamp=${timestamp}`; ;
    return  new Promise(async(V)=>{
        var e = request({
            url:dindding,
            method:'POST',
            headers:{'Content-Type':'application/json' },
            body: JSON.stringify(dinfdingMsg)
        },function(error:any,response:any,body:any){
            if(error){
                console.error(error)
            }
            V(response.body)
    });
    })
    
}