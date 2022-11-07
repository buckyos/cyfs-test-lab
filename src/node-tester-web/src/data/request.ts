// import * as http from "http"


// export const ContentType = {
//     urlencoded: 'application/x-www-form-urlencoded',
//     json: 'application/json',
//     raw: 'text/plain'
// }


// export async function request(method: string, route: string, postData?: any, psotType?: string) {
//     let header = {}
//     if (method == 'POST') {
//         header = { 'Content-Type': psotType, 'Content-Length': Buffer.byteLength(postData) }
//     }
//     let options = {
//         host: "192.168.100.205",//远端服务器域名
//         port: 5000,//远端服务器端口号
//         path: '/' + route,
//         method: method,
//         headers: header
//     };
//     let data = '';
//     return new Promise<any>(function (resolve: any, reject: any) {
//         let req = http.request(options, function (res) {
//             res.setEncoding('utf8');
//             res.on('data', function (chunk: any) {
//                 data += chunk;
//             });

//             res.on('end', function () {
//                 //console.info(data)
//                 resolve({ err: 0, data: eval("(" + data + ")") });
//             });

//         });

//         req.on('error', (e: any) => {
//             resolve({ err: 110, errmsg: e.message });
//         });
//         if (method == 'POST') {
//             req.write(postData)
//         }
//         req.end();
//     });
// }
