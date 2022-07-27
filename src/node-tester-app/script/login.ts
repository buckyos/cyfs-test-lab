'use strict';
import {AccountStatusProfile} from './account_profile';
import { Reporter, HttpDownloader, GlobalConfig } from '../base';
const config = require('./config.js');

const fs = require('fs-extra');
const path = require('path');

const SUPPORT_QQ_ADDRESS = '（官方QQ群:777179682）';

const accountProfile = new AccountStatusProfile();

let reporter = new Reporter(GlobalConfig.reportServer.host, GlobalConfig.reportServer.port, '', GlobalConfig.version);

function getErrorMsg(result: any) {
    let errorMsg = '未知错误' + SUPPORT_QQ_ADDRESS;
    let errorCode = 0;
    if (result) {
        if (result.content) {
            if (result.content.result !== 0) {
                if (result.content.errorMsg && result.content.errorMsg.length > 0) {
                    errorMsg = result.content.errorMsg;
                }
            } else {
                return {errorCode: 0, errorMsg: ''};
            }
            errorCode = result.content.result;
        } else {
            errorCode = -1;
        }
    } else {
        errorMsg = '网络通信故障' + SUPPORT_QQ_ADDRESS;
        errorCode = -1;
    }
    return {errorCode, errorMsg};
}

async function sendSMS(phoneNo: any, type: any) {
    await accountProfile.load();
    let body: any = {
        phoneNo,
        deviceID: accountProfile.deviceID,
    };

    let method = 'sendVerifyCode';

    if (type && type === 'bind') {
        method = 'sendBindVerifyCode';
        body.sessionID = accountProfile.sessionID;
    }

    let result = await reporter.report(method, body);
    let {errorCode, errorMsg} = getErrorMsg(result);
    await accountProfile.load();
    accountProfile.errorMsg = errorMsg;
    await accountProfile.save();
    return errorCode;
}

async function checkVerifyCode(phoneNo: any, type: any, verifyCode: any) {
    await accountProfile.load();
    let body: any = {
        phoneNo,
        verifyCode,
        deviceID: accountProfile.deviceID,
    };

    let method = 'checkVerifyCode';
    if (type && type === 'bind') {
        method = 'checkBindVerifyCode';
        body.sessionID = accountProfile.sessionID;
    }

    let result: any = await reporter.report(method, body);
    if (result && result.content && result.content.result === 0) {
        if (!type || type === 'login') {
            await accountProfile.load();
            accountProfile.accountID = phoneNo;
            accountProfile.status = AccountStatusProfile.EStatus.normal;
            accountProfile.sessionID = result.content.sessionID;
            accountProfile.sessionType = 1; // 登录类型为bucky
            await accountProfile.save();
        } else {
            await accountProfile.load();
            accountProfile.bindingKey = result.content.bindingKey;
            await accountProfile.save();
            
            return await downloadQRCode(result.content.qrcode);
        }
        return 0;
    } else {
        let {errorCode, errorMsg} = getErrorMsg(result);
        await accountProfile.load();
        accountProfile.errorMsg = errorMsg;
        await accountProfile.save();
        return errorCode;
    }
}

// 绑定钱包的操作不在客户端了，下面这个函数废弃
async function updateWallet(sessionID: any, wallet: any, platform: any) {
    let result: any = await reporter.report('updateGTCAddress', {sessionID, address: wallet, platform});
    if (result && result.content && result.content.result === 0) {
        await accountProfile.load();
        accountProfile.wallet = wallet;
        accountProfile.errorMsg = '正常' + SUPPORT_QQ_ADDRESS;
        await accountProfile.save();
        return 0;
    } else {
        let {errorCode, errorMsg} = getErrorMsg(result);
        await accountProfile.load();
        accountProfile.errorMsg = errorMsg;
        await accountProfile.save();
        return errorCode;
    }
}

async function updateStatus(mac: any, platform: any) {
    await accountProfile.load();

    if (!accountProfile.peerid || accountProfile.peerid.length === 0) {
        return 0;
    }

    let body = null;
    if (platform && platform === 'hiwifi') {
        body = {
            mac: mac || accountProfile.accountID,
            platform,
        };
    } else {
        body = {
            sessionID: accountProfile.sessionID,
            deviceID: accountProfile.deviceID,
            platform: 'win',
        };
    }

    reporter.peerid = accountProfile.peerid;

    let resp: any = await reporter.report('update', body);
    if (!resp || !resp.content) {
        console.log(`update failed: network-error`);
        return -1;
    }

    // console.log(`updated command: ${JSON.stringify(resp)}`);

    await accountProfile.load();
    
    let profit = resp.content.profit;
    if (resp.content.errorMsg && resp.content.errorMsg.length > 0) {
        accountProfile.errorMsg = resp.content.errorMsg;
    } else {
        accountProfile.errorMsg = '正常' + SUPPORT_QQ_ADDRESS;
        accountProfile.totalProfit = profit.totalProfit;
        accountProfile.todayProfit = profit.todayProfit;
        accountProfile.wallet = profit.gctAddress;
        console.log(body.deviceID || body.mac, profit.gctAddress);
        accountProfile.walletType = 1;
    }

    await accountProfile.save();

    return 0;
}

async function downloadQRCode(url: any) {
    async function writeErrorMsg(errorMsg: any) {
        await accountProfile.load();
        accountProfile.errorMsg = errorMsg + SUPPORT_QQ_ADDRESS;
        await accountProfile.save();
    }

    let qrCodePath = path.join(`${path.dirname(path.dirname(process.argv[1]))}`, 'config', 'qrcode.png');
    if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
        if (fs.existsSync(qrCodePath)) {
            await writeErrorMsg('配置文件有损坏，请卸载后重新安装.');
            return -2;
        }
    }
    
    await accountProfile.load();
    if (accountProfile.sessionType !== 1) {
        await writeErrorMsg('登录状态失效，请点击“切换账号”重新登录.');
        return -3; // 没登录
    }

    const urlFields = url.split('/');
    const requestPath = urlFields.slice(3).join('/');
    const schemaFields = url.split(':');
    const schema = schemaFields.length > 1 ? schemaFields[0] : 'http';
    let [host, port] = urlFields[2].split(':');
    port = port || (schema === 'https' ? 443 : 80);

    if (await HttpDownloader.download({schema, host, port, path: `/${requestPath}`}, qrCodePath)) {
        return 0;
    } else {
        await writeErrorMsg('偶然性网络故障，请稍后再试.');
        return -1;
    }
}

async function checkBindingKey(isRemove: any) {
    if (isRemove) {
        await accountProfile.load();
        accountProfile.bindingKey = '';
        await accountProfile.save();
        return 0;
    }

    await accountProfile.load();
    let body = {
        bindingKey: accountProfile.bindingKey
    };

    let resp: any = await reporter.report('checkBindingKey', body);
    if (resp && resp.content && resp.content.result === 0) {
        return resp.content.status;
    } else {
        return -1;
    }
}

async function main() {
    // *
    let cmd = process.argv[2];
    let phoneNo = process.argv[3];
    // */
    /*
    let cmd = '-checkVerifyCode';
    let phoneNo = '137xxx';
    //*/

    /*
    let cmd = '-sendVerifyCode';
    let phoneNo = '137xxx';
    //*/

    // let cmd = '-updateWallet';
    // let phoneNo = '2yvIAUpJ+wyAj0tqWuTbygmBiYjYTOTUwLosv9RZm5+2WD3tV0f5kw==';

    if (cmd === '-sendVerifyCode') {
        let type = process.argv[4];
        process.exit(await sendSMS(phoneNo, type));
    } else if (cmd === '-checkVerifyCode') {
        let verifyCode = process.argv[4];
        let type = process.argv[5];
        process.exit(await checkVerifyCode(phoneNo, type, verifyCode));
    } else if (cmd === '-updateWallet') {
        let wallet = process.argv[4];
        let platform = process.argv[5] || 'win';
        // wallet = '0xB71eCeF7CD91812270d71dA3E0811bE75E8B6182';
        process.exit(await updateWallet(phoneNo, wallet, platform));
    } else if (cmd === '-updateStatus') {
        let mac = process.argv[3];
        let platform = process.argv[4];

        process.exit(await updateStatus(mac, platform));
    } 
    
    if (cmd === '-checkBindingKey') {
        let isRemove = process.argv[3];
        process.exit(await checkBindingKey(isRemove));
    } else {
        process.exit(-1);
    }
}

main();
/*
async function test() {
    while (1) {
        await Promise.all([updateStatus(), updateStatus("D4:EE:07:60:E5:08", "hiwifi")]);
        await new Promise(resolve => {
            setTimeout(() => resolve(), 1000);
        })
    }
}

test();
//*/