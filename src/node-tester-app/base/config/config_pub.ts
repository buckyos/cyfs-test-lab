export class GlobalConfig {
    static heartbeatIntervalTime: number = 60*1000;
    static version: string = '2.12';
    static ip: string = 'bdttest.tinyappcloud.com';
    static port: number = 11080;
    static updateServer: {host: string, port: number} = {
        host: 'bdttest.tinyappcloud.com',
        port: 9012,
    };

    static reportServer: {host: string, port: number} = {
        host: 'bdttest.tinyappcloud.com',
        port: 11000
    };

    static fileUploadServer: {host: string, port: number} = {
        host: '106.75.175.123',
        port: 11000
    };

    static reportCrash: boolean = false;

    static removeLog: boolean = false;
}
