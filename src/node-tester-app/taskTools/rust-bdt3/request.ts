import fetch from 'node-fetch';
import AbortError from 'node-fetch';

export const ContentType = {
    urlencoded : 'application/x-www-form-urlencoded',
    json : 'application/json',
    raw : 'text/plain'
}


//const hostname = "106.12.128.114";
const hostname = "http://192.168.100.74"
//const hostname = "http://106.12.128.114"
const port  = 5000


export async function request(method:string,route:string,postData?:any,psotType?:string) {
    return new Promise(async(V)=>{
        let url = `${hostname}:${port}/${route}`
        let sendResp = false;
        setTimeout(async()=>{
            if(!sendResp){
                console.log(`request ${route} was timeout ,data = ${JSON.stringify(postData)}`);
                V({err:1,log:`send http request timeout`}) 
            }
            
        },10*1000)
        try {
            const response = await fetch(url, {
                method: method,
                body: JSON.stringify(postData),
                headers: {'Content-Type': psotType!}
            });
            sendResp = true;
            const data = await response.json()
            console.info(`${JSON.stringify(data)}`)
            V(data);
        } catch (error) {
            console.log(`${JSON.stringify(error)}`);
            V({err:1,log:`${error}`});
        }
    })
    
    
}















