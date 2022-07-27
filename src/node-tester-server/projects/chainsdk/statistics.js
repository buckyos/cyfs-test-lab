"use strict";

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HIWIFI_ONLY = false;

/*
统计项：
1.在线用户数，peer数，同时在线peer数，参与IP数
2.各peer最大高度，启动次数
3.各高度hash值
*/
class Stat{
    constructor() {
        this.m_logFilePath = '';
        this.m_readLineNo = 0;
        this.m_startTime = 0;
        this.m_maxOnlinePeerCount = 0;
        this.m_totalAccountCount = 0;
        this.m_hiwifiPeerCount = 0;

        this.m_allPeers = new Map(/*peerid, attrs(onlineTime, offlineTime, onlineTimes[], blockHeight)*/);
        this.m_allBlocks = new Map(/*hash, attrs(heights{}, )*/);
        this.m_allBlockHeights = new Map(/*height, attrs(hashs{}, )*/);

        this.m_allIPs = new Map();
    }

    async start(logPath, startTime) {
        this.m_logFilePath = logPath;
        this.m_startTime = startTime;
        //this.m_logFilePath = 'E:\\project\\node_tester\\userlogs\\2018-06-07_15.log';

        // 先扫描一遍获取所有peer的基本信息
        this.m_readLineNo = 0;
        await this._findAllOnlinePeers();
        // 再计算统计信息
        this.m_readLineNo = 0;
        await this._calcStat();
        this._outputStatResult();
    }

    _onRecord(record) {
        this.m_readLineNo++;
        let peerinfo = this.m_allPeers.get(record.peerid);
        if (!peerinfo) {
            return;
        }

        record.serverTime *= 1000;
        let date = new Date(record.serverTime);
        if (date.getHours() < this.m_startTime) {
            return;
        }
                    
        if (HIWIFI_ONLY && !Stat.isHiwifi(record.peerid)) {
            return;
        }

        peerinfo.lastReportTime = record.serverTime;
        
        switch(record.type) {
            case 'chainsdk/startup':
            case 'chainsdk/onTipBlock':
                return {};
            default:
                return {notImpl: true};
        }
    }

    _findAllOnlinePeers() {
        let accountSet = new Set();
        let hiwifiPeerSet = new Set();
        return new Promise(reslove => {
            const rl = readline.createInterface({
                    input: fs.createReadStream(this.m_logFilePath),
                    crlfDelay: Infinity
                });
              
                rl.on('line', (line) => {
                    this.m_readLineNo++;
                    if (line.length <= 0) {
                        return;
                    }
                    let record = null;
                    try {
                        record = JSON.parse(line);
                    } catch (error) {
                        return;
                    }
                    record.serverTime *= 1000;
                    let date = new Date(record.serverTime);
                    if (date.getHours() < this.m_startTime) {
                        return;
                    }
            
                    if (HIWIFI_ONLY && !Stat.isHiwifi(record.peerid)) {
                        return;
                    }

                    let lastReportTime = 0;
                    let peerInfo = this.m_allPeers.get(record.peerid);
                    accountSet.add(Stat._peerid2AccountID(record.peerid));

                    if (Stat.isHiwifi(record.peerid)) {
                        hiwifiPeerSet.add(record.peerid);
                    }
    
                    if (peerInfo) {
                        lastReportTime = peerInfo.lastReportTime;
                        peerInfo.lastReportTime = record.serverTime;
                        peerInfo.offlineTime = record.serverTime;
                    } else {
                        lastReportTime = record.serverTime;
                        peerInfo = {
                            peerid: record.peerid,
                            status: 'running', // 'starting'
                            onlineTime: record.serverTime,
                            offlineTime: record.serverTime,
                            lastOnlineTime: record.serverTime,
                            lastReportTime: record.serverTime,
                            onlineTimes: [],
                            blockHeight: -1,
                        };

                        if (record.type !== 'chainsdk/startup') {
                            peerInfo.onlineTimes.push({on: record.serverTime, off: record.serverTime});
                        }
                        this.m_allPeers.set(record.peerid, peerInfo);
                    }

                    if (record.type === 'chainsdk/startup') {
                        if (peerInfo.status !== 'starting') {
                            peerInfo.status = 'starting';
                            peerInfo.onlineTimes.push({on: record.serverTime, off: record.serverTime});
                        }
                    } else {
                        peerInfo.status = 'running';
                        if (record.serverTime >= lastReportTime) {
                            let lastOnline = peerInfo.onlineTimes[peerInfo.onlineTimes.length - 1];
                            lastOnline.off = record.serverTime;
                        }
                    }

                    if (record.maxPeerCount > this.m_maxOnlinePeerCount) {
                        this.m_maxOnlinePeerCount = record.maxPeerCount;
                    }

                    if (record.type === 'chainsdk/onTipBlock') {
                        if (record.content.tip > peerInfo.blockHeight) {
                            peerInfo.blockHeight = record.content.tip;
                        }

                        let heights = this.m_allBlocks.get(record.content.hash);
                        if (!heights) {
                            heights = new Set();
                            this.m_allBlocks.set(record.content.hash, heights);
                        }
                        heights.add(record.content.tip);

                        let blocks = this.m_allBlockHeights.get(record.content.tip);
                        if (!blocks) {
                            blocks = new Set();
                            this.m_allBlockHeights.set(record.content.tip, blocks);
                        }
                        blocks.add(record.content.hash);
                    }

                    if (record.ip) {
                        let ipInfo = this.m_allIPs.get(record.ip);
                        if (ipInfo) {
                            ipInfo.count++;
                        } else {
                            ipInfo = {
                                count: 1,
                            };
                            this.m_allIPs.set(record.ip, ipInfo);
                        }
                    }
                });
    
                rl.on('close', () => {
                    this.m_totalAccountCount = accountSet.size;
                    this.m_hiwifiPeerCount = hiwifiPeerSet.size;
                    reslove(0);
                });
        });
    }

    _calcStat() {
        return new Promise(reslove => {
            const rl = readline.createInterface({
                    input: fs.createReadStream(this.m_logFilePath),
                    crlfDelay: Infinity
                });
              
                let lineno = 0;
                rl.on('line', (line) => {
                    lineno++;
                    if (line.length <= 0) {
                        return;
                    }
                    let record = null;
                    try {
                        record = JSON.parse(line);
                    } catch (error) {
                        return;
                    }
                    record.lineno = lineno;
                    this._onRecord(record);
                });
    
                rl.on('close', () => {
                    reslove(0);
                });
        });
    }

    _outputStatResult() {
        // <TODO> output
        let resultPath = path.join(path.dirname(this.m_logFilePath), `${path.basename(this.m_logFilePath, '.log')}.stat.txt`);

        let fd = fs.openSync(resultPath, 'a');
        fs.writeFileSync(fd, `统计时间: ${Date().toString()}, from:${this.m_startTime}\r\n`);
        fs.writeFileSync(fd, `当日上线用户数: ${this.m_totalAccountCount}\r\n`);
        fs.writeFileSync(fd, `当日上线极X用户数: ${this.m_hiwifiPeerCount}\r\n`);
        fs.writeFileSync(fd, `最大同时在线peer数: ${this.m_maxOnlinePeerCount}\r\n`);
        fs.writeFileSync(fd, `当日上线peer总数: ${this.m_allPeers.size}\r\n`);
        fs.writeFileSync(fd, `参与IP数: ${this.m_allIPs.size}\r\n`);
        
        fs.writeFileSync(fd, `\r\n`);
        
        fs.writeFileSync(fd, '各PEER信息(peerid,高度,启动次数):\r\n');
        this.m_allPeers.forEach(peerinfo => {
            fs.writeFileSync(fd, `${peerinfo.peerid}\t${peerinfo.blockHeight}\t${peerinfo.onlineTimes.length}\r\n`);
        });
        
        fs.writeFileSync(fd, `\r\n`);
        
        fs.writeFileSync(fd, '统计拥有不同HASH数的高度数（如：第2和5高度各自都有三个不同的块HASH，则称拥有三个块的高度数为2）:\r\n');
        let hashCount2HeightMap = new Map();
        this.m_allBlockHeights.forEach(h => {
            let heightCount = hashCount2HeightMap.get(h.size) || 0;
            heightCount++;
            hashCount2HeightMap.set(h.size, heightCount);
        });

        hashCount2HeightMap.forEach((heightCount, hashCount) => {
            fs.writeFileSync(fd, `${hashCount}\t${heightCount}\r\n`);
        });
        
        fs.writeFileSync(fd, `\r\n`);
        
        fs.writeFileSync(fd, '统计拥有不同高度数的HASH数（如：HASH为0xA和0xB的块都分别出现在不同的三个高度上，则称拥有三个不同高度的块数为2）:\r\n');
        let heightCount2HashMap = new Map();
        this.m_allBlocks.forEach(b => {
            let hashCount = heightCount2HashMap.get(b.size) || 0;
            hashCount++;
            heightCount2HashMap.set(b.size, hashCount);
        });

        heightCount2HashMap.forEach((hashCount, heightCount) => {
            fs.writeFileSync(fd, `${heightCount}\t${hashCount}\r\n`);
        });
    }

    static _createFailReasonStat() {
        let failReasonStat = {
            clientOnline: [],
            acceptorOnline: [],
            acceptorLastReportTime: [],
            acceptorOffline: 0,
            sourceUdpRecvSendRate: [],
            acceptorUdpRecvSendRate: [],
            miniUdpRecvSendRate: [],
            symNAT: {
                client: 0,
                acceptor: 0,
                both: 0,
            }
        };
        return failReasonStat;
    }

    static _grade(value, base, linear) {
        if (value < 0) {
            return {grade: 0, scope: '(-, 0)'};
        }

        let grade = 1;
        let low = 0;
        let up = base;
        for (grade = 1; value >= up; grade++) {
            low = up;
            if (linear) {
                up += base;
            } else {
                up *= 2;
            }
        }

        let cutFloat = n => {
            let s = `${n}`;
            let l = s.split('.');
            if (l.length > 1) {
                if (l[1].length > 2) {
                    l[1] = l[1].slice(0, 2);
                }
                return `${l[0]}.${l[1]}`;
            }
            return s;
        }
        return {grade, scope: `[${cutFloat(low)}, ${cutFloat(up)})`};
    }

    static _gradeScopeCountInc(grade, gradeList, bugDesc) {
        while (gradeList.length <= grade.grade) {
            gradeList.push({scope: null, count: 0});
        }

        let gradeItem = gradeList[grade.grade];
        if (!gradeItem.scope) {
            gradeItem.scope = grade.scope;
        } else if (gradeItem.scope != grade.scope) {
            this.m_failConnectionStat.unknownStatError.add(bugDesc);
        }
        gradeItem.count++;
    }

    static _gradeSimple(value, base, gradeList, bugDesc, linear) {
        let grade = Stat._grade(value, base, linear);
        return Stat._gradeScopeCountInc(grade, gradeList, bugDesc);
    }

    static _peerid2AccountID(peerid) {
        let [account, random] = peerid.split('-');
        return account;
    }

    static isHiwifi(peerid) {
        return peerid.split(':').length === 6;
    }
}

let startTime = 0;
if (process.argv.length > 3) {
    startTime = parseInt(process.argv[3]);
}
let stat = new Stat();
stat.start(process.argv[2], startTime);

const NAT_TYPE = {
    unknown: 0,
    internet: 1,
    NAT: 2,
    restrictedNAT: 3,
    symmetricNAT: 4,
    udpForbiden: 5,

    toString(type) {
        switch (type) {
            case NAT_TYPE.unknown: return 'unknown';
            case NAT_TYPE.internet: return 'internet';
            case NAT_TYPE.NAT: return 'NAT';
            case NAT_TYPE.restrictedNAT: return 'restrictedNAT';
            case NAT_TYPE.symmetricNAT: return 'symmetricNAT';
            case NAT_TYPE.udpForbiden: return 'udpForbiden';
        }
        return 'unknown';
    }
}