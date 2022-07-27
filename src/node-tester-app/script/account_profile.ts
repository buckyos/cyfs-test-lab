'use strict';
import * as path from 'path';
import * as readline from 'readline';
import * as fs from 'fs-extra';

export enum SessionType {
    JI_LU_YOU = 0, // 极路由的sessionid
    BUCKY = 1, // bucky的sessionid
}

export enum WalletType {
    USER = 0, // 用户指定的钱包地址
    LIANYIN = 1, // 链银扫一扫绑定地址
}

export class AccountStatusProfile {
    private m_filePath: string;
    private m_accountID: string;
    private m_peerid: string;
    private m_sessionID: string;
    private m_sessionType: SessionType;
    private m_totalProfit: number;
    private m_todayProfit: number;
    private m_totalDuration: number;
    private m_todayDuration: number;
    private m_wallet: string;
    private m_walletType: WalletType;
    private m_errorMsg: string;
    private m_status: number;
    private m_seq: number;
    private m_pid: number;
    private m_parentPid: number;
    private m_beatheart: number;
    private m_updateInstallPath: string;
    private m_lastExitTime: number;
    private m_deviceID: string;
    private m_bindingKey: string;

    public static EStatus = {
        notLogin: 0,
        verifing: 1,
        notJoin: 2,
        normal: 3,
        refreshStatus: 4,
    };

    private m_beginIOTime = 0;
    constructor() {
        let dirPath = path.join(`${path.dirname(path.dirname(process.argv[1]))}`, 'config');
        this.m_filePath = path.join(dirPath, 'account.ini');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        this.m_accountID = '';
        this.m_peerid = '';
        this.m_sessionID = '';
        this.m_sessionType = SessionType.JI_LU_YOU;
        this.m_totalProfit = 0;
        this.m_todayProfit = 0;
        this.m_totalDuration = 0;
        this.m_todayDuration = 0;
        this.m_wallet = '';
        this.m_walletType = WalletType.USER;
        this.m_errorMsg = '';
        this.m_status = 0;
        this.m_seq = 0;
        this.m_pid = 0;
        this.m_parentPid = 0;
        this.m_beatheart = 0;
        this.m_updateInstallPath = '';
        this.m_lastExitTime = Date.now();
        this.m_deviceID = '';
        this.m_bindingKey = '';

        this.m_beginIOTime = 0;
    }

    get accountID() {
        return this.m_accountID;
    }

    set accountID(v) {
        this.m_accountID = v;
    }

    get peerid() {
        return this.m_peerid;
    }

    set peerid(v) {
        this.m_peerid = v;
    }

    get sessionID() {
        return this.m_sessionID;
    }

    set sessionID(v) {
        this.m_sessionID = v;
    }

    get sessionType() {
        return this.m_sessionType;
    }

    set sessionType(type) {
        this.m_sessionType = type;
    }

    get totalProfit() {
        return this.m_totalProfit;
    }

    set totalProfit(v) {
        this.m_totalProfit = v;
    }

    get todayProfit() {
        return this.m_todayProfit;
    }

    set todayProfit(v) {
        this.m_todayProfit = v;
    }

    get totalDuration() {
        return this.m_totalDuration;
    }

    set todayDuration(v: number) {
        this.m_todayDuration = v;
    }

    get status() {
        return this.m_status;
    }

    set status(v) {
        this.m_status = v;
    }

    get wallet() {
        return this.m_wallet;
    }

    set wallet(v) {
        this.m_wallet = v;
    }

    get walletType() {
        return this.m_walletType;
    }

    set walletType(v) {
        this.m_walletType = v;
    }

    get pid() {
        return this.m_pid;
    }

    set pid(v) {
        this.m_pid = v;
    }

    get parentPid() {
        return this.m_parentPid;
    }

    set parentPid(v) {
        this.m_parentPid = v;
    }

    get beatheart() {
        return this.m_beatheart;
    }

    set beatheart(v) {
        this.m_beatheart = v;
    }

    get errorMsg() {
        return this.m_errorMsg;
    }

    // 中文格式为utf8字符串的hex
    set errorMsg(v) {
        this.m_errorMsg = v;
    }

    get updateInstallPath() {
        return this.m_updateInstallPath;
    }

    set updateInstallPath(v) {
        this.m_updateInstallPath = v;
    }

    get lastExitTime() {
        return this.m_lastExitTime;
    }

    set lastExitTime(v) {
        this.m_lastExitTime = v;
    }

    get deviceID() {
        return this.m_deviceID;
    }

    get bindingKey() {
        return this.m_bindingKey;
    }

    set bindingKey(k) {
        this.m_bindingKey = k;
    }

    get isIOBlock() {
        return this.m_beginIOTime > 0 && Date.now() - this.m_beginIOTime > 10000;
    }

    load() {
        return new Promise<number>(async (_reslove) => {
            this.m_beginIOTime = Date.now();
            const reslove = (err: number) => {
                this.m_beginIOTime = 0;
                _reslove(err);
            };

            // 检查保存用户信息的文件是否存在
            if (!fs.existsSync(this.m_filePath)) {
                return reslove(0);
            }

            // 从account.ini中读取用户信息
            const rl = readline.createInterface({
                input: fs.createReadStream(this.m_filePath),
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                let sqlitIdx = line.indexOf('=', 0);
                let key = line.slice(0, sqlitIdx);
                let value = line.slice(sqlitIdx + 1);
                switch (key) {
                    case 'ID':
                        // 只允许js代码修改，不接收外部修改文件
                        if (!this.m_accountID || this.m_accountID === '') {
                            this.m_accountID = value.slice(1, value.length - 1); // 去 ""
                        }
                        break;
                    case 'peerid':
                        // 只允许js代码修改，不接收外部修改文件
                        if (!this.m_peerid || this.m_peerid === '') {
                            this.m_peerid = value.slice(1, value.length - 1); // 去 ""
                        }
                        break;
                    case 'sessionID':
                        // 只允许js代码修改，不接收外部修改文件
                        if (!this.m_sessionID || this.m_sessionID === '') {
                            this.m_sessionID = value.slice(1, value.length - 1); // 去 ""
                        }
                        break;
                    case 'sessionType':
                        this.m_sessionType = parseInt(value);
                        break;
                    case 'totalProfit':
                        this.m_totalProfit = parseInt(value) / 100000;
                        break;
                    case 'todayProfit':
                        this.m_todayProfit = parseInt(value) / 100000;
                        break;
                    case 'totalDuration':
                        this.m_totalDuration = parseInt(value);
                        break;
                    case 'todayDuration':
                        this.m_todayDuration = parseInt(value);
                        break;
                    case 'seq':
                        this.m_seq = parseInt(value);
                        break;
                    case 'status':
                        this.m_status = parseInt(value);
                        break;
                    case 'wallet':
                        this.m_wallet = value.slice(1, value.length - 1);
                        break;
                    case 'walletType':
                        this.m_walletType = parseInt(value);
                        break;
                    case 'errorMsg':
                        this.m_errorMsg = value.slice(1, value.length - 1);
                        break;
                    case 'pid':
                        this.m_pid = parseInt(value);
                        break;
                    case 'parentPid':
                        this.m_parentPid = parseInt(value);
                        break;
                    case 'beatheart':
                        this.m_beatheart = parseInt(value);
                        break;
                    case 'updateInstallPath':
                        this.m_updateInstallPath = value.slice(1, value.length - 1);
                        break;
                    case 'lastExitTime':
                        this.m_lastExitTime = parseInt(value);
                        break;
                    case 'deviceid':
                        this.m_deviceID = value.slice(1, value.length - 1);
                        break;
                    case 'bindingKey':
                        this.m_bindingKey = value.slice(1, value.length - 1);
                        break;
                    default:
                        break;
                }
            });

            rl.on('close', () => {
                reslove(0);
            });
        });
    }

    save() {
        this.m_beginIOTime = Date.now();

        let profileContent = `[ACCOUNT]\n\r`;
        profileContent += `ID="${this.m_accountID}"\n\r`;
        profileContent += `peerid="${this.m_peerid}"\n\r`;
        profileContent += `sessionID="${this.m_sessionID}"\n\r`;
        profileContent += `sessionType=${this.m_sessionType}\n\r`;
        profileContent += `status=${this.m_status}\n\r`;
        profileContent += `totalProfit=${this.m_totalProfit * 100000}\n\r`;
        profileContent += `todayProfit=${this.m_todayProfit * 100000}\n\r`;
        profileContent += `totalDuration=${this.m_totalDuration}\n\r`;
        profileContent += `todayDuration=${this.m_todayDuration}\n\r`;
        if (this.m_wallet) {
            profileContent += `wallet="${this.m_wallet}"\n\r`;
            profileContent += `walletType=${this.m_walletType}\n\r`;
        }
        if (this.m_errorMsg) {
            profileContent += `errorMsg="${this.m_errorMsg}"\n\r`;
        }
        if (this.m_updateInstallPath) {
            profileContent += `updateInstallPath="${this.m_updateInstallPath}"\n\r`;
        }
        profileContent += `pid=${this.m_pid}\n\r`;
        profileContent += `parentPid=${this.m_parentPid}\n\r`;
        profileContent += `beatheart=${this.m_beatheart}\n\r`;
        profileContent += `lastExitTime=${this.m_lastExitTime}\n\r`;
        profileContent += `deviceid="${this.m_deviceID}"\n\r`;
        if (this.m_bindingKey && this.m_bindingKey.length > 0) {
            profileContent += `bindingKey="${this.m_bindingKey}"\n\r`;
        }
        profileContent += `seq=${this.m_seq + 1}\n\r`;
        this.m_seq++;
        fs.writeFileSync(this.m_filePath, profileContent);
        this.m_beginIOTime = 0;
    }
}