import fetch from 'node-fetch';
import AbortError from 'node-fetch';

export const ContentType = {
    urlencoded : 'application/x-www-form-urlencoded',
    json : 'application/json',
    raw : 'text/plain'
}


//const hostname = "106.12.128.114";
const hostname = "http://192.168.100.205"
//const hostname = "http://106.12.128.114"
const port  = 5000


export async function request(host:string,method:string,route:string,postData?:any,psotType?:string) {
    
    let url = `${host}/${route}`
    let sendResp = false;
    const response = await fetch(url, {
        method: method,
        body: JSON.stringify(postData),
        headers: {'Content-Type': psotType!},
        timeout : 5*60*100
    });
    sendResp = true;
    if(response.status !=200){
        return {status:response.status }
    }

    // console.info(`status: `,response.status);
    // console.info(`url:`,response.url);
    // console.info(`headers:`,JSON.stringify(response.headers));
    try {
        const data = await response.json()
        console.info(`body: ${JSON.stringify(data)}`)
        return data
    } catch (error) {
        return response.status
    }
    
    
}

// async function main() {
//     let run =await request("http://192.168.100.205:5000","POST","api/bdt/report/reportHtml",{version:"Stream_AllEP"},ContentType.json)
//     console.info(JSON.stringify(run))
// }
// main()











