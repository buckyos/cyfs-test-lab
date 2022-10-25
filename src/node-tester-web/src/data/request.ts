import fetch from 'node-fetch';

export const ContentType = {
    urlencoded : 'application/x-www-form-urlencoded',
    json : 'application/json',
    raw : 'text/plain'
}


//const hostname = "106.12.128.114";
const hostname = "http://192.168.200.175"
//const hostname = "http://106.12.128.114"
const port  = 5000
export async function request(method:string,route:string,postData?:any,psotType?:string) {
    let url = `${hostname}:${port}/${route}`
    let sendResp = false;
    const response = await fetch(url, {
        method: method,
        body: JSON.stringify(postData),
        headers: {'Content-Type': psotType!},
    });
    sendResp = true;
    const data = await response.json()
    console.info(`${JSON.stringify(data)}`)
    return data
    
}















