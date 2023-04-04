export const public_host = "bdttest.tinyappcloud.com";
export const lab_host = "192.168.100.205";
export const dev_host = "192.168.100.205";
export const host  = dev_host;

export class GlobalConfig {
    static heartbeatIntervalTime: number = 60*1000;   
    static version: string = '2.12';
    static ip: string = host;
    // 公司内网100网段支持三个端口 11070（lizhihong） 11080(lixiang)  11090 (未使用)
    static port: number = 11080;
    static updateServer: {host: string, port: number} = {
        host: host,
        port: 9012,
    };

    static reportServer: {host: string, port: number} = {
        host: host,
        port: 11000
    };

    static fileUploadServer: {host: string, port: number} = {
        host: host,
        port: 11000
    };

    static reportCrash: boolean = false;

    static removeLog: boolean = false;
}
