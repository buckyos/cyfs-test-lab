
import { simulator, simulatorPath, DATA_PATH, CONFIG_PATH, LOG_PATH } from '../../config/zoneData';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node';
import JSBI from 'jsbi';
import { TEST_DEC_ID } from "../../config/decApp"



export class ZoneSimulator {


    static pid: number;
    static process: ChildProcess.ChildProcess;
    static zone1_ood_stack: cyfs.SharedCyfsStack;
    static zone1_standby_ood_stack: cyfs.SharedCyfsStack;
    static zone1_device1_stack: cyfs.SharedCyfsStack;
    static zone1_device2_stack: cyfs.SharedCyfsStack;

    static zone2_ood_stack: cyfs.SharedCyfsStack;
    static zone2_device1_stack: cyfs.SharedCyfsStack;
    static zone2_device2_stack: cyfs.SharedCyfsStack;

    static zone1_ood_peerId: string;
    static zone1_standby_ood_peerId: string;
    static zone1_people: string;
    static zone1_device1_peerId: string;
    static zone1_device2_peerId: string;

    static zone2_ood_peerId: string;
    static zone2_people: string;
    static zone2_device1_peerId: string;
    static zone2_device2_peerId: string;
    static APPID: cyfs.ObjectId;


    /**
     * 初始化模拟器测试程序
     * debug 要手动启动模拟器
     */
    static async init(debug: boolean = false, clear: boolean = false) {
        if (clear) {
            //(0) 清理模拟器的数据
            await this.clearZoneSimulator();
        }

        //（1）启动模拟器
        console.info(`###启动模拟器`)
        await this.startZoneSimulator();
        if (debug) {
            await cyfs.sleep(50000);
        }
        await cyfs.sleep(15000);
        // (2) 读取模拟器的peerId 数据
        await this.getPeerId();
        ZoneSimulator.APPID = TEST_DEC_ID;
        // (3)连接协议栈,默认http方式
        console.info(`###连接协议栈`)
        await this.connecStimulator("ws");

    }

    static async clearZoneSimulator() {
        await this.stopZoneSimulator();
        await fs.emptyDirSync(DATA_PATH);
        await fs.removeSync(DATA_PATH);
        await fs.emptyDirSync(CONFIG_PATH);
        await fs.removeSync(CONFIG_PATH);
        await fs.emptyDirSync(LOG_PATH);
        await fs.removeSync(LOG_PATH);
    }
    static async getPeerId() {
        let config = path.join(CONFIG_PATH, "desc_list")
        if (!fs.pathExistsSync(config)) {
            //如果没有文件自动进行初始化
            await this.startZoneSimulator();
            await cyfs.sleep(10 * 1000)
            await this.stopZoneSimulator();
        }
        let content = fs.readFileSync(config).toString();
        let strs = content.split(`\n`);
        this.zone1_people = strs[1].split(":")[1];
        this.zone1_ood_peerId = strs[2].split(":")[1];
        this.zone1_standby_ood_peerId = strs[3].split(":")[1];
        this.zone1_device1_peerId = strs[4].split(":")[1];
        this.zone1_device2_peerId = strs[5].split(":")[1];
        this.zone2_people = strs[8].split(":")[1];
        this.zone2_ood_peerId = strs[9].split(":")[1];
        this.zone2_device1_peerId = strs[10].split(":")[1];
    }
    //zone1_ood 设备协议栈连接
    static async stack_conn_zone1_ood_stack(RequestorType = "http") {
        let zone1_ood_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone1.ood.http_port, simulator.zone1.ood.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone1_ood_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone1_ood_stack_conn.requestor_config = ws_param
        }
        this.zone1_ood_stack = cyfs.SharedCyfsStack.open(zone1_ood_stack_conn);
        let res1 = await this.zone1_ood_stack.wait_online(cyfs.Some(JSBI.BigInt(20000)));
        return res1
    }
    //zone1_standby_ood 设备协议栈连接
    static async stack_conn_zone1_standby_ood(RequestorType = "http") {
        let zone1_standby_ood_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone1.standby_ood.http_port, simulator.zone1.standby_ood.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone1_standby_ood_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone1_standby_ood_stack_conn.requestor_config = ws_param
        }
        this.zone1_standby_ood_stack = cyfs.SharedCyfsStack.open(zone1_standby_ood_stack_conn);
        let res1 = await this.zone1_standby_ood_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    //zone1_device1设备协议栈连接
    static async stack_conn_zone1_device1_stack(RequestorType = "http") {
        let zone1_device1_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone1.device1.http_port, simulator.zone1.device1.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone1_device1_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone1_device1_stack_conn.requestor_config = ws_param
        }
        this.zone1_device1_stack = cyfs.SharedCyfsStack.open(zone1_device1_stack_conn);
        let res1 = await this.zone1_device1_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    //zone1_device2设备协议栈连接
    static async stack_conn_zone1_device2_stack(RequestorType = "http") {
        let zone1_device2_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone1.device2.http_port, simulator.zone1.device2.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone1_device2_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone1_device2_stack_conn.requestor_config = ws_param
        }
        this.zone1_device2_stack = cyfs.SharedCyfsStack.open(zone1_device2_stack_conn);
        let res1 = await this.zone1_device2_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    //zone2_ood设备协议栈连接
    static async stack_conn_zone2_ood_stack(RequestorType = "http") {
        let zone2_ood_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone2.ood.http_port, simulator.zone2.ood.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone2_ood_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone2_ood_stack_conn.requestor_config = ws_param
        }
        this.zone2_ood_stack = cyfs.SharedCyfsStack.open(zone2_ood_stack_conn);
        let res1 = await this.zone2_ood_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    //zone2_device2设备协议栈连接
    static async stack_conn_zone2_device2_stack(RequestorType = "http") {
        let zone2_device2_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone2.device2.http_port, simulator.zone2.device2.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone2_device2_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone2_device2_stack_conn.requestor_config = ws_param
        }
        this.zone2_device2_stack = cyfs.SharedCyfsStack.open(zone2_device2_stack_conn);
        let res1 = await this.zone2_device2_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    //zone2_device1设备协议栈连接
    static async stack_conn_zone2_device1_stack(RequestorType = "http") {
        let zone2_device1_stack_conn = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(simulator.zone2.device1.http_port, simulator.zone2.device1.ws_port, ZoneSimulator.APPID).unwrap();
        if (RequestorType == "http" && RequestorType == undefined) {
            let http_param = cyfs.SharedCyfsStackParam.default_requestor_config();
            zone2_device1_stack_conn.requestor_config = http_param

        }
        else if (RequestorType == "ws") {
            let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
            zone2_device1_stack_conn.requestor_config = ws_param
        }
        this.zone2_device1_stack = cyfs.SharedCyfsStack.open(zone2_device1_stack_conn);
        let res1 = await this.zone2_device1_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        return res1
    }
    static async connecStimulator(RequestorType = "http") {
        let connect = 0;
        setTimeout(async () => {
            if (connect < 6) {
                console.info(`连接超时`)
                assert(`连接超时`)
            }
        }, 20 * 1000)
        //let res1 = await this.zone1_ood_stack.wait_online(cyfs.Some(JSBI.BigInt(10000)));
        let res1 = await this.stack_conn_zone1_ood_stack(RequestorType);
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone1_ood_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败1：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        res1 = await this.stack_conn_zone1_standby_ood(RequestorType);
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone1_standby_ood_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败2：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        //等待 zone1_device1_stack 连接成功
        res1 = await this.stack_conn_zone1_device1_stack(RequestorType)
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone1_device1_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败3：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        //等待 zone1_device2_stack 连接成功
        res1 = await this.stack_conn_zone1_device2_stack(RequestorType)
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone1_device2_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败4：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        //等待 zone2_ood_stack 连接成功
        res1 = await this.stack_conn_zone2_ood_stack(RequestorType)
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone2_ood_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败5：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        //等待 zone2_device2_stack 连接成功
        res1 = await this.stack_conn_zone2_device2_stack(RequestorType)
        if (res1.ok) {
            connect = connect + 1;
            console.info(`zone2_device2_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败6：${res1.val?.msg}`)
            //await cyfs.sleep(5000)
        }
        //等待 zone2_device1_stack 连接成功
        let res2 = await this.stack_conn_zone2_device1_stack(RequestorType)
        if (res2.ok) {
            connect = connect + 1;
            console.info(`zone2_device1_stack 连接 ${RequestorType} 成功`)
        } else {
            console.info(`连接失败7：${res1.val?.msg}`)
            assert.equal(res2.val!.code, "0")
        }

    }
    static async removeAllConfig() {
        await this.getPeerId();
        let list = [
            this.zone1_people,
            this.zone1_ood_peerId,
            this.zone1_standby_ood_peerId,
            this.zone1_device1_peerId,
            this.zone1_device2_peerId,
            this.zone2_people,
            this.zone2_ood_peerId,
            this.zone2_device1_peerId,
            this.zone2_device2_peerId,
        ]
        for (let i in list) {
            let clearPath = path.join('C:\\cyfs\\etc\\zone-simulator', list[i])
            console.info(`清空文件夹：${clearPath}`)
            await fs.emptyDirSync(clearPath)
            await fs.removeSync(clearPath);
        }

    }
    static async exportZoneSimulatordesc() {
        await this.stopZoneSimulator();
        return new Promise(async (v) => {
            console.info(`### start Zone Simulator desc and sec`)
            this.process = ChildProcess.spawn(simulatorPath, ['-d'], { windowsHide: false, detached: false, stdio: 'ignore', cwd: path.dirname(simulatorPath) })
            v(this.process)
        })
    }
    static async initPid() {
        return new Promise(async (v) => {
            let process = ChildProcess.exec(`tasklist|findstr /c:zone-simulator.exe`)
            process!.on('exit', (code: number, singal: any) => {
                console.info(`check exit,pid = ${this.pid}`);
                v(this.pid)
            });
            process.stdout?.on('data', (data) => {
                let str: string = `${data.toString()}`;
                console.info(str)
                str = str.split(' Console')[0].split(`zone-simulator.exe`)[1]
                if (str) {
                    this.pid = Number(str)
                } else {
                    this.pid = 0;
                }
            });
            process.on("error", (err) => {
                console.info(`initPid failed,err=${err}`)
                v(false)
            })
        })

    }
    static async restartZoneSimulator() {
        await this.stopZoneSimulator();
        await this.startZoneSimulator();
    }
    static async stopZoneSimulator() {
        return new Promise(async (v) => {
            console.info(`触发 stopZoneSimulator`)
            let process = ChildProcess.exec(`taskkill /f /t /im zone-simulator.exe`)
            process.on('exit', (code: number, singal: any) => {
                v('');

            });
            process.stdout?.on('data', (data) => {
                let str: string = `${data.toString()}`;
            });
        })

    }
    static async startZoneSimulator() {
        await this.stopZoneSimulator();
        return new Promise(async (v) => {
            console.info(`### start Zone Simulator`)
            this.process = ChildProcess.spawn(simulatorPath, [], { windowsHide: false, detached: false, stdio: 'ignore', cwd: path.dirname(simulatorPath) })
            while (!this.pid) {
                await this.initPid();
            }
            v(this.pid)
        })
    }

    static getStackByName(name: string): cyfs.SharedCyfsStack {
        switch (name) {
            case "zone1_device1": {
                return this.zone1_device1_stack!
            }
            case "zone1_device2": {
                return this.zone1_device2_stack!
            }
            case "zone1_ood": {
                return this.zone1_ood_stack!
            }
            case "zone1_standby_ood": {
                return this.zone1_standby_ood_stack!
            }
            case "zone2_device1": {
                return this.zone2_device1_stack!
            }
            case "zone2_device2": {
                return this.zone2_device2_stack!
            }
            case "zone2_ood": {
                return this.zone2_ood_stack!
            }
        }
        return this.zone1_device1_stack!;
    }
    async removeAllConfig() {

    }
    static getPeerIdByName(name: string): string {
        switch (name) {
            case "zone1_device1": {
                return this.zone1_device1_peerId
            }
            case "zone1_device2": {
                return this.zone1_device2_peerId
            }
            case "zone1_ood": {
                return this.zone1_ood_peerId
            }
            case "zone1_standby_ood": {
                return this.zone1_standby_ood_peerId
            }
            case "zone2_device1": {
                return this.zone2_device1_peerId
            }
            case "zone2_device2": {
                return this.zone2_device2_peerId
            }
            case "zone2_ood": {
                return this.zone2_ood_peerId
            }
        }
        return this.zone1_device1_peerId;
    }

}

