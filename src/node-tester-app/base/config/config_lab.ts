export const dev_host = "192.168.100.205";
export const host  = dev_host;
export class GlobalConfig {
    static heartbeatIntervalTime: number = 60*1000;   
    static version: string = '2.12';
    static ip: string = host;
    static port: number = 11070;
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
