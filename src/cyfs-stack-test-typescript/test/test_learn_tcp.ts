import * as net from "net";

function proxyHttp() {
    let bind = ["127.0.0.1",19999]
    let server = ["192.168.100.36",9008]
        //server] = [conf.bind, conf.server];
    let tcpServer = net.createServer((c) => {
        console.info(` [INFO] - TCP Client connect ${c.remoteAddress}:${c.remotePort}`);
        let client = net.connect(Number(server[1]), String(server[0]), () => {
            c.pipe(client);
        });
        client.pipe(c);
        client.on('error', (err) => {
            console.error(` [ERROR] - ${err}`);
            c.destroy();
        });
        c.on('error', (err) => {
            console.error(`[ERROR] -  ${err}`);
            client.destroy();
        }); 
    });
    tcpServer.listen({ host: bind[0], port: bind[1], }, () => {
        console.info(`[INFO] - TCP Server start ${bind[0]}:${bind[1]}`);
    });
    return tcpServer;
}
function proxyWs() {
    let bind = ["127.0.0.1",20000]
    let server = ["192.168.100.36",9015]
        //server] = [conf.bind, conf.server];
    let tcpServer = net.createServer((c) => {
        console.info(` [INFO] - TCP Client connect ${c.remoteAddress}:${c.remotePort}`);
        let client = net.connect(Number(server[1]), String(server[0]), () => {
            c.pipe(client);
        });
        client.pipe(c);
        client.on('error', (err) => {
            console.error(` [ERROR] - ${err}`);
            c.destroy();
        });
        c.on('error', (err) => {
            console.error(`[ERROR] -  ${err}`);
            client.destroy();
        }); 
    });
    tcpServer.listen({ host: bind[0], port: bind[1], }, () => {
        console.info(`[INFO] - TCP Server start ${bind[0]}:${bind[1]}`);
    });
    return tcpServer;
}
async function main(){
    let tcp1 = proxyHttp();
    let tcp2 = proxyWs();
    while(true){
        await new Promise(async(V)=>{
            setTimeout(()=>{
                V("")
            },2000)
        })
    }
}
main()

