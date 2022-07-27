const readline = require('readline');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const net = require('net');
const {EndPoint} = require('./util');

const HIWIFI_ONLY = false;

function connectToPeerid(connectRecord) {
    return connectRecord.content.toHash || connectRecord.peerid || connectRecord.content.to;
}

function connectFromPeerid(connectRecord) {
    return connectRecord.content.fromHash || connectRecord.peerid || connectRecord.content.from;
}

/*
统计项：
1.连通成功率，连通消耗时长
2.连通失败原因分析：
    a.主动方在线时长
    b.被连接方在线时长
    c.被连接方最后一次上报时间间隔
    d.主动方对称NAT/被动方对称NAT/双方对称NAT
    e.dht查询超时
        i.主动方在线时长
        ii.被动方在线时长
        iii.被动方最后一次更新时间
        iv.主动方对称NAT/被动方对称NAT/双方对称NAT
    f.dht查询失败
        i.主动方在线时长
        ii.被动方在线时长
        iii.被动方最后一次更新时间
        iv.主动方对称NAT/被动方对称NAT/双方对称NAT
    g.搜索sn失败
        i.主动方在线时长
        ii.sn在线时长(所有SN?)
        iii.sn最后一次更新时间
        iv.主动方对称NAT/sn对称NAT/双方对称NAT
    h.从SN查询remotepeer超时
    i.从SN查询remotepeer失败
3.dht发现peer速度分布：
    上线时间[0,1min）    [0,8)   [8,16)  [16,32) [32,64) [64,128)    ...
            [1, 2)
            [2, 4)
            [4, 8)
            [8, 16)
*/
class Stat{
    constructor() {
        this.m_logFilePath = '';
        this.m_readLineNo = 0;
        this.m_startTime = 0;

        this.m_maxOnlinePeerCount = 0;
        this.m_maxSNCount = 0;
        this.m_totalConnectTimes = 0;
        this.m_succConnectCount = 0;
        this.m_selfSuccConnect = 0;
        this.m_ipv6Connect = 0;
        this.m_reSuccConnections = new Map(/*connectID, times*/);
        this.m_succConnectionStat = [];
        this.m_failConnectionStat = {
            totalCount: 0,
            validCount: 0, // 有效失败连接，成功后中断，或者连接目标近11分钟有过上报，在线可能比较大
            breakCount: 0,
            selfConnect: 0,
            reFailConnections: new Map(/*connectID, times*/),
            errorCode: new Map(/*code, count*/),
            summary: Stat._createFailReasonStat(),
            dhtTimeout: Stat._createFailReasonStat(),
            dhtFail: Stat._createFailReasonStat(),
            findSNFail: Stat._createFailReasonStat(),
            onlineSNCount: [],
            hitRemoteSNCount: [],
            callTimeout: [],
            findSNTime: [], // 搜索SN消耗的时长
            firstSNRespTime: [], // SN 第一次响应call的时长
            firstGotEPTime: [], // SN 第一次返回对方EPlist的时长
            epUpdateTime: [], // SN 返回EPLIST的更新时间
            remoteOnlineSN: [],
            localOnlineSN: [],
            callFail: 0,
            unknownStatError: new Set(), // 统计程序错误
        };
        this.m_foundPeerStat = [];

        this.m_crashStat = {
            totalCount: 0,
            categorys: new Map(),
        };

        this.m_allPeers = new Map(/*peerid, attrs(onlineTime, offlineTime, natType, lastReportTime, foundPeerCount)*/);
        this.m_allSNs = new Map(/*peerid, attrs(onlineTime, offlineTime, natType)*/);

        this.m_connections = new Map(/*'from:peer1,to:peer2', attrs(startTime, from, to, status, statusChangeClientTime ...)*/);
        this.m_totalAccountCount = 0;
        this.m_hiwifiPeerCount = 0;
        this.m_natTypePeerCount = new Map(/*natType, peerCount*/);
        this.m_versionPeerCount = new Map(/*version, peerCount*/);
        this.m_tcpConnectCount = 0;
        this.m_totalFlows = {
            udp: {
                send: {
                    pkgs: 0,
                    bytes: 0,
                },
                recv: {
                    pkgs: 0,
                    bytes: 0,
                }
            }
        };
        this.m_succPayload = {
            totalBytes: 0,
            totalDuration: 0,
            speed: [],
        };
        this.m_breakPayload = {
            totalBytes: 0,
            totalDuration: 0,
            speed: [],
        };
        this.m_allIPs = new Map();
        this.m_dhtPkgsStat = {
            send: {},
            recv: {},
        };

        this.m_findSNTime = [];
        this.m_firstSNRespTime = [];
        this.m_firstGotEPTime = [];
        this.m_firstSynTime = [];
        this.m_epUpdateTime = [];
        this.m_natTypeConnections = new Map();
        this.m_detectNatTypeConnections = new Map();

        this.m_allOfflineSNConnections = [];
    }

    async start(logPath, startTime) {
        this.m_logFilePath = logPath;
        this.m_startTime = startTime;
        // this.m_logFilePath = 'E:\\project\\node_tester\\log\\2019-05-16.log';

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
        let snInfo = this.m_allSNs.get(record.peerid);
        if (snInfo) {
            snInfo.lastReportTime = record.serverTime;
        }
        switch(record.type) {
            case 'bdt2_echo/update':
                return {};
            case 'bdt2_echo/queryCmd':
                return this._onOnline(record);
            case 'bdt2_echo/offline':
                return this._onOffline(record);
            case 'bdt2_echo/bdtEcho.crash':
                return this._onCrash(record);
            case 'bdt2_echo/sn-online':
                return {};
            case 'bdt2_echo/connect-begin':
                return this._onConnectBegin(record);
            case 'bdt2_echo/connect-suc':
                return this._onConnectSucc(record);
            case 'bdt2_echo/connect-error':
                return this._onConnectError(record);
            case 'bdt2_echo/connect-close':
                return this._onConnectClose(record);
            case 'bdt2_echo/connect-suc-accept':
                return this._onConnectSuccAccept(record);
            case 'bdt2_echo/connect-error-accept':
                return this._onConnectErrorAccept(record);
            case 'bdt2_echo/connect-close-accept':
                return this._onConnectCloseAccept(record);
            default:
                return {notImpl: true};
        }
    }

    _getOnlineTime(peerInfo) {
        return peerInfo.lastOnlineTime;
    }

    _isPeerOnline(peerInfo, serverTime) {
        if (serverTime > peerInfo.offlineTime || serverTime < peerInfo.onlineTime) {
            return false;
        } else {
            for (let online of peerInfo.onlineTimes) {
                if (serverTime >= online.on && serverTime <= online.off) {
                    return true;
                }
            }
        }
        return false;
    }

    _onOnline(record) {
        let peerInfo = this.m_allPeers.get(record.peerid);
        if (record.content.online) {
            peerInfo.lastOnlineTime = record.serverTime;
            peerInfo.lastOnlineTimeClient = record.time;
        }

        peerInfo.iRTT = record.content.RTT;
        peerInfo.iNatType = record.content.natType;
        peerInfo.snList = new Set();
        if (record.content.snList) {
            record.content.snList.forEach(sn => peerInfo.snList.add(sn.peerid));
        }
        let timeScopeGrade = Stat._grade(record.serverTime - this._getOnlineTime(peerInfo, record.serverTime), 10000);
        let foundPeerCountGrade = Stat._grade(record.content.foundPeerCount, 8);

        while (this.m_foundPeerStat.length <= timeScopeGrade.grade) {
            this.m_foundPeerStat.push({scope: null, peerCount: []});
        }

        let timeGradeItem = this.m_foundPeerStat[timeScopeGrade.grade];
        if (!timeGradeItem.scope) {
            timeGradeItem.scope = timeScopeGrade.scope;
        } else if (timeGradeItem.scope != timeScopeGrade.scope) {
            this.m_failConnectionStat.unknownStatError.add('found peer stat(timescope) error');
        }

        while (timeGradeItem.peerCount.length <= foundPeerCountGrade.grade) {
            timeGradeItem.peerCount.push({scope: null, peers: new Set()});
        }

        let peerCountGradeItem = timeGradeItem.peerCount[foundPeerCountGrade.grade];
        if (!peerCountGradeItem.scope) {
            peerCountGradeItem.scope = foundPeerCountGrade.scope;
        } else if (peerCountGradeItem.scope != foundPeerCountGrade.scope) {
            this.m_failConnectionStat.unknownStatError.add('found peer stat(peercount) error');
        }
        peerCountGradeItem.peers.add(record.peerid);

        // 各种nattype的peer数
        record.content.natType = record.content.natType || 0;
        let natTypePeerCount = this.m_natTypePeerCount.get(record.content.natType) || 0;
        natTypePeerCount++;
        this.m_natTypePeerCount.set(record.content.natType, natTypePeerCount);

        // 各种版本的peer数
        record.version = record.version || '';
        let versionPeerCount = this.m_versionPeerCount.get(record.version) || 0;
        versionPeerCount++;
        this.m_versionPeerCount.set(record.version, versionPeerCount);
    }

    _onOffline(record) {
    }

    _onCrash(record) {
        this.m_crashStat.totalCount++;
    }

    static makeConnectID(record) {
        let fromVPort = record.content.fromVPort || 'xxx';
        let toVPort = record.content.vport;
        return `[from:${connectFromPeerid(record)}@${fromVPort}|to:${connectToPeerid(record)}@${toVPort}]`;
    }

    _onConnectBegin(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectToPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        let fromPeer = this.m_allPeers.get(connectFromPeerid(record));
        let toPeer = this.m_allPeers.get(connectToPeerid(record));
        if (connectInfo && !connectInfo.status) {
            this.m_failConnectionStat.unknownStatError.add('same connectID');
        } else {
            /*'from:peer1,to:peer2', attrs(startTime, from, to...)*/
            connectInfo = {
                startTime: record.serverTime,
                from: connectFromPeerid(record),
                to: connectToPeerid(record),
                status: null,
                startClientTime: record.time,
                succTime: 0,
                statusChangeClientTime: record.time,
                snCount: record.snCount,
                fromRTT: fromPeer? fromPeer.iRTT : -1,
                toRTT: toPeer? toPeer.iRTT: -1,
                resultType: 'none', // 'succ'/'break'/'fail'
                findSN: 0,
                snResp: 0,
                getEP: 0,
                syn: 0,
                synConsum: -1,
                isIPv6: false,
                natTypeKey: `${NAT_TYPE.toString(fromPeer? fromPeer.iNatType : 0)}->${NAT_TYPE.toString(toPeer? toPeer.iNatType : 0)}`,
                detectNatTypeKey: `${NAT_TYPE.toString(fromPeer? fromPeer.detectNatType : 0)}->${NAT_TYPE.toString(toPeer? toPeer.detectNatType : 0)}`,
            };
   
            this.m_connections.set(connectID, connectInfo);
        }
    }

    _onConnectSucc(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectToPeerid(record))) {
            return;
        }

        this.m_succConnectCount++;
        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }

        if (connectInfo.status === 'succ') {
            let succTimes = this.m_reSuccConnections.get(connectID) || 1;
            this.m_reSuccConnections.set(connectID, succTimes + 1);
        }

        connectInfo.statusChangeClientTime = record.time;
        connectInfo.succTime = record.time;
        connectInfo.status = 'succ';
        connectInfo.resultType = 'succ';
        connectInfo.synConsum = record.content.detail.synConsum || 0;
        let useTime = record.time - connectInfo.startClientTime;
        if (record.content.detail.useTCP) {
            this.m_tcpConnectCount++;
        }
        if (connectFromPeerid(record) === connectToPeerid(record)) {
            this.m_selfSuccConnect++;
        }
        let peerInfo = this.m_allPeers.get(record.peerid);
        peerInfo.succTimes++;
        let toPeerInfo = this.m_allPeers.get(connectToPeerid(record));
        if (toPeerInfo) {
            toPeerInfo.succTimes++;
        }
        Stat._gradeSimple(useTime, 500, this.m_succConnectionStat, 'scope conflict connect-succ');

        // 统计各步骤消耗时长
        if (record.content.detail.sn && record.content.detail.sn.finishsn) {
            Stat._gradeSimple(record.content.detail.sn.finishsn - record.content.detail.sn.start, 500, this.m_findSNTime, 'scope conflict suc-findSNTime');
            Stat._gradeSimple(record.content.detail.sn.respEP1 - record.content.detail.sn.finishsn, 500, this.m_firstSNRespTime, 'scope conflict suc-firstSNRespTime');
            if (record.content.detail.sn.getEP || record.content.detail.sn.getEP === 0) {
                Stat._gradeSimple(record.content.detail.sn.getEP - record.content.detail.sn.finishsn, 500, this.m_firstGotEPTime, 'scope conflict suc-firstGotEPTime');
            }
            if (record.content.detail.syn) {
                Stat._gradeSimple(record.content.detail.syn - record.content.detail.sn.finishsn, 500, this.m_firstSynTime, 'scope conflict suc-firstSynTime');
            }
        }

        if (record.content.detail.sn && (record.content.detail.sn.epTime || record.content.detail.sn.epTime === 0)) {
            Stat._gradeSimple(record.content.detail.sn.epTime, 500, this.m_epUpdateTime, 'scope conflict m_epUpdateTime');
        }
    }

    _onConnectError(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectToPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }

        connectInfo.snCount = Math.min(connectInfo.snCount, record.snCount);
        if (connectFromPeerid(record) === connectToPeerid(record)) {
            this.m_failConnectionStat.selfConnect++;
        }

        let isBreak = false;
        if (connectInfo.status === 'succ') {
            isBreak = true;
            this.m_failConnectionStat.breakCount++;
        } else {
            let toPeerInfo = this.m_allPeers.get(connectToPeerid(record));
            if (toPeerInfo && this._isPeerOnline(toPeerInfo, record.serverTime)) {
                let peerInfo = this.m_allPeers.get(record.peerid);
                peerInfo.failTimes++;
                toPeerInfo.failTimes++;
            }
        }
        if (connectInfo.status === 'fail') {
            let failTimes = this.m_failConnectionStat.reFailConnections.get(connectID) || 1;
            this.m_failConnectionStat.reFailConnections.set(connectID, failTimes + 1);
        }

        let fromPeer = this.m_allPeers.get(connectFromPeerid(record));
        let toPeer = this.m_allPeers.get(connectToPeerid(record));
        let acceptorOffline = (!toPeer || !this._isPeerOnline(toPeer, record.serverTime));
        
        if (connectInfo.status === 'succ' || !acceptorOffline) {
            this.m_failConnectionStat.validCount++;
        }

        connectInfo.statusChangeClientTime = record.time;
        connectInfo.status = 'fail';
        connectInfo.resultType = isBreak? 'break' : 'fail';

        // total
        this.m_failConnectionStat.totalCount++;
            
        // by errorcode
        let errorCodeItem = this.m_failConnectionStat.errorCode.get(record.content.error);
        if (errorCodeItem) {
            errorCodeItem.count++;
        } else {
            errorCodeItem = {count: 1};
            this.m_failConnectionStat.errorCode.set(record.content.error, errorCodeItem);
        }

        // call timeout
        if (record.content.detail.sn && record.content.detail.sn.finishsn) {
            if (!record.content.detail.sn.respEP1) {
                let useTime = record.time - record.content.detail.sn.finishsn;
                Stat._gradeSimple(useTime, 500, this.m_failConnectionStat.callTimeout, 'scope conflict connect-fail-calltimeout');
    
                // SN 无响应次数
                record.content.detail.sn.snList.forEach(sn => {
                    let snInfo = this.m_allSNs.get(sn.pid);
                    if (snInfo) {
                        snInfo.noRespTimes = snInfo.noRespTimes || 0;
                        snInfo.noRespTimes++;
                    }
                });
                fromPeer.snNoRespTimes++;
            }

            Stat._gradeSimple(record.content.detail.sn.finishsn - record.content.detail.sn.start, 500, this.m_failConnectionStat.findSNTime, 'scope conflict findSNTime');
            Stat._gradeSimple(record.content.detail.sn.respEP1 - record.content.detail.sn.finishsn, 500, this.m_failConnectionStat.firstSNRespTime, 'scope conflict firstSNRespTime');
            if (record.content.detail.sn.getEP || record.content.detail.sn.getEP === 0) {
                Stat._gradeSimple(record.content.detail.sn.getEP - record.content.detail.sn.finishsn, 500, this.m_failConnectionStat.firstGotEPTime, 'scope conflict firstGotEPTime');
            }
        }

        if (record.content.detail.sn && (record.content.detail.sn.epTime || record.content.detail.sn.epTime === 0)) {
            Stat._gradeSimple(record.content.detail.sn.epTime, 500, this.m_failConnectionStat.epUpdateTime, 'scope conflict m_failConnectionStat.epUpdateTime');
        }

        // call fail
        if (record.content.detail.sn && record.content.detail.sn.respEP1 && (!record.content.detail.sn.eplist || record.content.detail.sn.eplist.length == 0)) {
            this.m_failConnectionStat.callFail++;
        }

        if (!isBreak && toPeer && this._isPeerOnline(toPeer, record.serverTime) && record.content.detail.sn && record.content.detail.sn.snList && record.content.detail.sn.snList.length) {
            let onlineCount = 0;
            let hitRemoteSNCount = 0;
            record.content.detail.sn.snList.forEach(sn => {
                let self = this;
                let snInfo = this.m_allSNs.get(sn.pid);
                if ((snInfo && this._isPeerOnline(snInfo, record.content.detail.sn.finishsn)) || sn.pid === 'SEED_DHT_PEER_10000') {
                    onlineCount++;
                }
                if (toPeer.snList && toPeer.snList.has(sn.pid)) {
                    hitRemoteSNCount++;
                }
            });
            if (onlineCount === 0) {
                this.m_allOfflineSNConnections.push(connectID);
                if (this.m_allOfflineSNConnections.length > 10) {
                    this.m_allOfflineSNConnections.shift();
                }
            }

            Stat._gradeSimple(onlineCount, 1, this.m_failConnectionStat.onlineSNCount, 'scope conflict onlineSNCount', true);
            if (fromPeer.snList) {
                Stat._gradeSimple(fromPeer.snList.size, 1, this.m_failConnectionStat.localOnlineSN, 'm_failConnectionStat.localOnlineSN', true);
            }
            if (toPeer.snList) {
                Stat._gradeSimple(toPeer.snList.size, 1, this.m_failConnectionStat.remoteOnlineSN, 'm_failConnectionStat.remoteOnlineSN', true);
                Stat._gradeSimple(hitRemoteSNCount, 1, this.m_failConnectionStat.hitRemoteSNCount, 'scope conflict hitRemoteSNCount', true);
            }
        }

        // from and to peer state
        if (!fromPeer) {
            this.m_failConnectionStat.unknownStatError.add('unknown from peer');
            return;
        }
        let clientOnlineGrade = Stat._grade(record.serverTime - fromPeer.onlineTime, 1000);
        let acceptorLastReportGrade = null;
        let acceptorOnlineGrade = null;
        if (!acceptorOffline) {
            acceptorOnlineGrade = Stat._grade(record.serverTime - toPeer.onlineTime, 1000);
            acceptorLastReportGrade = Stat._grade(record.serverTime - toPeer.lastReportTime, 1000);
        }

        // summary
        let isBothSymNAT = false;
        Stat._gradeScopeCountInc(clientOnlineGrade, this.m_failConnectionStat.summary.clientOnline, 'scope conflict connect-fail-summary-client-online');
        if (!acceptorOffline) {
            Stat._gradeScopeCountInc(acceptorOnlineGrade, this.m_failConnectionStat.summary.acceptorOnline, 'scope conflict connect-fail-summary-acceptor-online');
            Stat._gradeScopeCountInc(acceptorLastReportGrade, this.m_failConnectionStat.summary.acceptorLastReportTime, 'scope conflict connect-fail-summary-acceptor-lastreport');
            if (toPeer.detectNatType === NAT_TYPE.symmetricNAT) {
                this.m_failConnectionStat.summary.symNAT.acceptor++;
                if (fromPeer.detectNatType === NAT_TYPE.symmetricNAT) {
                    this.m_failConnectionStat.summary.symNAT.both++;
                    isBothSymNAT = true;
                } else if (fromPeer.detectNatType === NAT_TYPE.restrictedNAT) {
                    this.m_failConnectionStat.summary.symNAT.both++;
                }
            } else if (toPeer.detectNatType === NAT_TYPE.restrictedNAT && fromPeer.detectNatType === NAT_TYPE.symmetricNAT) {
                this.m_failConnectionStat.summary.symNAT.both++;
            }
        } else {
            this.m_failConnectionStat.summary.acceptorOffline++;
        }
        if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
            this.m_failConnectionStat.summary.symNAT.client++;
        }

        if (!isBothSymNAT && !acceptorOffline) {
            if (!isBreak) {
                // console.log(`connect failed, from:${connectFromPeerid(record)},to:${connectToPeerid(record)}`);
            }
        }

        // udp 收发比
        if (!isBothSymNAT && !acceptorOffline) {
            let clientUdpRecvSendRate = fromPeer.udp.send.pkgs? fromPeer.udp.recv.pkgs / fromPeer.udp.send.pkgs : 0;
            let clientUdpRecvSendRateGrade = Stat._grade(clientUdpRecvSendRate, 0.1, true);
            Stat._gradeScopeCountInc(clientUdpRecvSendRateGrade, this.m_failConnectionStat.summary.sourceUdpRecvSendRate, 'source udp-recv/send conflict');

            let acceptorUdpRecvSendRate = toPeer.udp.send.pkgs? toPeer.udp.recv.pkgs / toPeer.udp.send.pkgs : 0;
            let acceptorUdpRecvSendRateGrade = Stat._grade(acceptorUdpRecvSendRate, 0.1, true);
            Stat._gradeScopeCountInc(acceptorUdpRecvSendRateGrade, this.m_failConnectionStat.summary.acceptorUdpRecvSendRate, 'acceptor udp-recv/send conflict');

            let miniUdpRecvSendRateGrade = Stat._grade(Math.min(clientUdpRecvSendRate, acceptorUdpRecvSendRate), 0.1, true);
            Stat._gradeScopeCountInc(miniUdpRecvSendRateGrade, this.m_failConnectionStat.summary.miniUdpRecvSendRate, 'mini udp-recv/send conflict');
        }
        
        // dht timeout
        if (record.content.detail.dht && record.content.detail.dht.start && !record.content.detail.dht.finish1) {
            Stat._gradeScopeCountInc(clientOnlineGrade, this.m_failConnectionStat.dhtTimeout.clientOnline, 'scope conflict connect-fail-dhtTimeout-client-online');
            if (!acceptorOffline) {
                Stat._gradeScopeCountInc(acceptorOnlineGrade, this.m_failConnectionStat.dhtTimeout.acceptorOnline, 'scope conflict connect-fail-dhtTimeout-acceptor-online');
                Stat._gradeScopeCountInc(acceptorLastReportGrade, this.m_failConnectionStat.dhtTimeout.acceptorLastReportTime, 'scope conflict connect-fail-dhtTimeout-acceptor-lastreport');
                if (toPeer.natType === NAT_TYPE.symmetricNAT) {
                    this.m_failConnectionStat.dhtTimeout.symNAT.acceptor++;
                    if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                        this.m_failConnectionStat.dhtTimeout.symNAT.both++;
                    }
                }
            } else {
                this.m_failConnectionStat.dhtTimeout.acceptorOffline++;
            }
            if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                this.m_failConnectionStat.dhtTimeout.symNAT.client++;
            }
        }

        // dht fail
        if (record.content.detail.dht && record.content.detail.dht.start && record.content.detail.dht.finish1 && (!record.content.detail.dht.eplist || record.content.detail.dht.eplist.length === 0)) {
            Stat._gradeScopeCountInc(clientOnlineGrade, this.m_failConnectionStat.dhtFail.clientOnline, 'scope conflict connect-fail-dhtFail-client-online');
            if (!acceptorOffline) {
                Stat._gradeScopeCountInc(acceptorOnlineGrade, this.m_failConnectionStat.dhtFail.acceptorOnline, 'scope conflict connect-fail-dhtFail-acceptor-online');
                Stat._gradeScopeCountInc(acceptorLastReportGrade, this.m_failConnectionStat.dhtFail.acceptorLastReportTime, 'scope conflict connect-fail-dhtFail-acceptor-lastreport');
                if (toPeer.natType === NAT_TYPE.symmetricNAT) {
                    this.m_failConnectionStat.dhtFail.symNAT.acceptor++;
                    if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                        this.m_failConnectionStat.dhtFail.symNAT.both++;
                    }
                }
            } else {
                this.m_failConnectionStat.dhtFail.acceptorOffline++;
            }
            if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                this.m_failConnectionStat.dhtFail.symNAT.client++;
            }
        }

        // find sn fail
        if (record.content.detail.sn && record.content.detail.sn.start && (!record.content.detail.sn.snList || record.content.detail.sn.snList.length === 0)){
            Stat._gradeScopeCountInc(clientOnlineGrade, this.m_failConnectionStat.findSNFail.clientOnline, 'scope conflict connect-fail-findSNFail-client-online');
            let snStat = {
                count: 0,
                natType: NAT_TYPE.unknown,
                onlineTime: Infinity,
                lastReportTime: 0,
            };

            this.m_allSNs.forEach(snInfo => {
                let snPeerInfo = this.m_allPeers.get(snInfo.peerid);
                if (!this._isPeerOnline(snInfo, connectInfo.startTime) || !snPeerInfo || !this._isPeerOnline(snPeerInfo, record.serverTime)) {
                    return;
                }
                snStat.count++;
                snStat.natType = snInfo.natType;
                if (snInfo.onlineTime < snStat.onlineTime) {
                    snStat.onlineTime = snInfo.onlineTime;
                }
                if (snInfo.lastReportTime > snStat.lastReportTime) {
                    snStat.lastReportTime = snInfo.lastReportTime;
                }
            });

            snStat.count = Math.min(snStat.count, connectInfo.snCount);
            if (snStat.count > 0) {
                let snOnlineGrade = Stat._grade(record.serverTime - snStat.onlineTime, 1000);
                let snLastReportGrade = Stat._grade(record.lastReportTime - snStat.lastReportTime, 1000);
                Stat._gradeScopeCountInc(snOnlineGrade, this.m_failConnectionStat.findSNFail.acceptorOnline, 'scope conflict connect-fail-findSNFail-acceptor-online');
                Stat._gradeScopeCountInc(snLastReportGrade, this.m_failConnectionStat.findSNFail.acceptorLastReportTime, 'scope conflict connect-fail-findSNFail-acceptor-lastreport');
                if (snStat.natType === NAT_TYPE.symmetricNAT) {
                    this.m_failConnectionStat.findSNFail.symNAT.acceptor++;
                    if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                        this.m_failConnectionStat.findSNFail.symNAT.both++;
                    }
                }
            } else {
                this.m_failConnectionStat.findSNFail.acceptorOffline++;
            }
            if (fromPeer.natType === NAT_TYPE.symmetricNAT) {
                this.m_failConnectionStat.findSNFail.symNAT.client++;
            }
        }
    }

    _onConnectClose(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectToPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }

        connectInfo.findSN = record.content.detail.sn ? record.content.detail.sn.finishsn - record.content.detail.sn.start : 0;
        connectInfo.snResp = record.content.detail.sn ? record.content.detail.sn.respEP1 - record.content.detail.sn.finishsn : 0;
        if (record.content.detail.sn && (record.content.detail.sn.getEP || record.content.detail.sn.getEP === 0)) {
            connectInfo.getEP = record.content.detail.sn.getEP - record.content.detail.sn.finishsn;
        }
        if (record.content.detail.syn && record.content.detail.sn) {
            connectInfo.syn = record.content.detail.syn - record.content.detail.sn.getEP;
        }
        if (record.content.detail.ep && net.isIPv6(EndPoint.toAddress(record.content.detail.ep).address)) {
            connectInfo.isIPv6 = true;
        }

        {
            let natTypeStatus = this.m_natTypeConnections.get(connectInfo.natTypeKey);
            if (!natTypeStatus) {
                natTypeStatus = new Map();
                this.m_natTypeConnections.set(connectInfo.natTypeKey, natTypeStatus);
            }
            let resultTypeCount = natTypeStatus.get(connectInfo.resultType) || 0;
            natTypeStatus.set(connectInfo.resultType, resultTypeCount+1);

            natTypeStatus = this.m_detectNatTypeConnections.get(connectInfo.detectNatTypeKey);
            if (!natTypeStatus) {
                natTypeStatus = new Map();
                this.m_detectNatTypeConnections.set(connectInfo.detectNatTypeKey, natTypeStatus);
            }
            resultTypeCount = natTypeStatus.get(connectInfo.resultType) || 0;
            natTypeStatus.set(connectInfo.resultType, resultTypeCount+1);
        }

        let fromPeer = this.m_allPeers.get(connectInfo.from);
        let toPeer = this.m_allPeers.get(connectInfo.to);
        let connectLog = 'CON-LOG\t';
        connectLog += `from:${connectInfo.from}\t${fromPeer.natType}\tto:${connectInfo.to}\t${toPeer? toPeer.natType: -1}\t`;
        connectLog += `status:\t${connectInfo.resultType}\t`;
        connectLog += `fromRTT:\t${connectInfo.fromRTT}\t`;
        connectLog += `toRTT:\t${connectInfo.toRTT}\t`;
        connectLog += `findSN:\t${connectInfo.findSN}\t`;
        connectLog += `snResp:\t${connectInfo.snResp}\t`;
        connectLog += `getEP:\t${connectInfo.getEP}\t`;
        connectLog += `syn:\t${connectInfo.syn}\t`;
        connectLog += `synConsum:\t${connectInfo.synConsum}\t`;
        connectLog += `begin:\t${(new Date(connectInfo.startClientTime)).toString()}\t`;
        connectLog += `from-online:\t${(new Date(fromPeer.lastOnlineTimeClient)).toString()}\t`;
        connectLog += `IPv6:\t${connectInfo.isIPv6}\t${record.content.detail.ep}\t`;
        connectLog += `epcount:\t${record.content.detail.sn ? record.content.detail.sn.eplist.length : 0}\t`;
        connectLog += `eptime:\t${record.content.detail.sn ? record.content.detail.sn.epTime : 0}\t`;
        if (toPeer) {
            connectLog += `to-online:\t${(new Date(toPeer.lastOnlineTimeClient)).toString()}\t`;
        }
        
        console.log(connectLog);
        
        let peerInfo = this.m_allPeers.get(record.peerid);
        let stat = peerInfo.break;
        let totalStat = this.m_breakPayload;
        if (connectInfo.status === 'succ') {
            stat = peerInfo.succ;
            if (record.time > connectInfo.succTime) {
                totalStat = this.m_succPayload;
            }
        }
        let detail = record.content.detail;
        if (detail && detail.flow && connectInfo.succTime && record.time > connectInfo.succTime) {
            stat.udp.send.pkgs += detail.flow.udp.send.pkgs;
            stat.udp.send.bytes += detail.flow.udp.send.bytes;
            stat.udp.recv.pkgs += detail.flow.udp.recv.pkgs;
            stat.udp.recv.bytes += detail.flow.udp.recv.bytes;
            stat.tcp.send.pkgs += detail.flow.tcp.send.pkgs;
            stat.tcp.send.bytes += detail.flow.tcp.send.bytes;
            stat.tcp.recv.pkgs += detail.flow.tcp.recv.pkgs;
            stat.tcp.recv.bytes += detail.flow.tcp.recv.bytes;

            let timeDelta = (record.time - connectInfo.succTime) / 1000;
            totalStat.totalBytes += record.content.bytes;
            totalStat.totalDuration += timeDelta;
            stat.totalDuration += timeDelta;
            stat.payload += record.content.bytes;
            let speed = record.content.bytes / timeDelta;
            let grade = Stat._grade(speed, 1024, false);
            Stat._gradeScopeCountInc(grade, totalStat.speed, 'succ payloadSpeed conflict');
            totalStat.speed[grade.grade].flow = totalStat.speed[grade.grade].flow || {
                udp: {
                    send: {
                        bytes: 0,
                        pkgs: 0,
                    },
                    recv: {
                        bytes: 0,
                        pkgs: 0,
                    },
                },
                payload: 0,
                duration: 0,
            }

            let flow = totalStat.speed[grade.grade].flow;
            flow.udp.send.bytes += detail.flow.udp.send.bytes;
            flow.udp.send.pkgs += detail.flow.udp.send.pkgs;
            flow.udp.recv.bytes += detail.flow.udp.recv.bytes;
            flow.udp.recv.pkgs += detail.flow.udp.recv.pkgs;
            if (timeDelta > 0) {
                flow.payload += record.content.bytes;
                flow.duration += timeDelta;
            }
            /*
            let recvSendRate = (detail.flow.udp.recv.pkgs / detail.flow.udp.send.pkgs);
            if (connectInfo.status === 'succ' && recvSendRate < 0.1) {
                console.log(`connection low recvSendRate: ${recvSendRate}, from:${connectFromPeerid(record)}@${record.content.fromVPort}, to:${connectToPeerid(record)}@${record.content.vport}`);
            }
            */
        }

        connectInfo.status = 'close';
        connectInfo.statusChangeClientTime = record.time;
        this.m_totalConnectTimes++;
        //this.m_connections.delete(connectID);
    }

    _onConnectSuccAccept(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectFromPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }

        connectInfo.acceptStatus = 'succ';
    }

    _onConnectErrorAccept(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectFromPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }
        connectInfo.acceptStatus = 'fail';
    }

    _onConnectCloseAccept(record) {
        if (HIWIFI_ONLY && !Stat.isHiwifi(connectFromPeerid(record))) {
            return;
        }

        let connectID = Stat.makeConnectID(record);
        let connectInfo = this.m_connections.get(connectID);
        if (!connectInfo) {
            return;
        }

        let peerInfo = this.m_allPeers.get(record.peerid);
        let stat = peerInfo.break;
        if (connectInfo.acceptStatus === 'succ') {
            stat = peerInfo.succ;
        }
        let detail = record.content.detail;
        if (detail && detail.flow) {
            stat.udp.send.pkgs += detail.flow.udp.send.pkgs;
            stat.udp.send.bytes += detail.flow.udp.send.bytes;
            stat.udp.recv.pkgs += detail.flow.udp.recv.pkgs;
            stat.udp.recv.bytes += detail.flow.udp.recv.bytes;
            stat.tcp.send.pkgs += detail.flow.tcp.send.pkgs;
            stat.tcp.send.bytes += detail.flow.tcp.send.bytes;
            stat.tcp.recv.pkgs += detail.flow.tcp.recv.pkgs;
            stat.tcp.recv.bytes += detail.flow.tcp.recv.bytes;
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
                    let snInfo = this.m_allSNs.get(record.peerid);

                    if (Stat.isHiwifi(record.peerid)) {
                        hiwifiPeerSet.add(record.peerid);
                    }

                    if (record.type === 'sn-online' || (record.type === 'queryCmd' && record.content.isSN)) {
                        if (!snInfo) {
                            snInfo = {
                                peerid: record.peerid,
                                natType: NAT_TYPE.unknown,
                                detectNatType: NAT_TYPE.unknown,
                                inService: true,
                                lastConfirmSN: record.serverTime,
                                onlineTime: record.serverTime,
                                offlineTime: record.serverTime,
                                lastReportTime: record.serverTime,
                                onlineTimes: [{on: record.serverTime, off: record.serverTime}],
                                hitStat: {
                                    hits: 0,
                                    miss: 0,
                                },
                            };
                            this.m_allSNs.set(record.peerid, snInfo);
                        }
                        if (record.content.snHit) {
                            snInfo.hitStat.hits += record.content.snHit.hits;
                            snInfo.hitStat.miss += record.content.snHit.miss;
                        }
                    }

                    if (snInfo) {
                        lastReportTime = snInfo.lastReportTime;
                        snInfo.lastReportTime = record.serverTime;
                        snInfo.offlineTime = record.serverTime;

                        if (record.type === 'queryCmd') {
                            if (!record.content.isSN) {
                                if (snInfo.inService) {
                                    snInfo.inService = false;
                                    let lastOnline = snInfo.onlineTimes[snInfo.onlineTimes.length - 1];
                                    lastOnline.off = snInfo.lastConfirmSN;
                                }
                            } else {
                                if (!snInfo.inService) {
                                    snInfo.inService = true;
                                    snInfo.onlineTimes.push({on: record.serverTime, off: record.serverTime});
                                } else {
                                    let lastOnline = snInfo.onlineTimes[snInfo.onlineTimes.length - 1];
                                    if (record.serverTime >= lastOnline.off) {
                                        lastOnline.off = record.serverTime;
                                    }
                                }
                                snInfo.lastConfirmSN = record.serverTime;
                            }
                        } else if (snInfo.inService) {
                            let lastOnline = snInfo.onlineTimes[snInfo.onlineTimes.length - 1];
                            if (record.serverTime > lastOnline.off) {
                                lastOnline.off = record.serverTime;
                            }
                        }
                    }
    
                    if (peerInfo) {
                        lastReportTime = peerInfo.lastReportTime;
                        peerInfo.lastReportTime = record.serverTime;
                        peerInfo.offlineTime = record.serverTime;
                    } else {
                        lastReportTime = record.serverTime;
                        peerInfo = {
                            peerid: record.peerid,
                            natType: NAT_TYPE.unknown,
                            detectNatType: NAT_TYPE.unknown,
                            onlineTime: record.serverTime,
                            offlineTime: record.serverTime,
                            lastOnlineTime: record.serverTime,
                            lastReportTime: record.serverTime,
                            onlineTimes: [{on: record.serverTime, off: record.serverTime}],
                            succTimes: 0,
                            failTimes: 0,
                            snNoRespTimes: 0,
                            sumRTT: 0,
                            maxRTT: 0,
                            minRTT: 1000000000,
                            iRTT: -1, // 即时RTT
                            RTTCount: 0,
                            upnp: {
                                enabled: false,
                                gateway: '',
                            },
                            udp: {
                                send: {
                                    pkgs: 0,
                                    bytes: 0,
                                },
                                recv: {
                                    pkgs: 0,
                                    bytes: 0,
                                }
                            },
                            dht: {
                                udp: {
                                    send: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    recv: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    req: 0,
                                    resp: 0,
                                }
                            },
                            succ: {
                                udp: {
                                    send: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    recv: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                },
                                tcp: {
                                    send: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    recv: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                },
                                payload: 0,
                                totalDuration: 0,
                            },
                            break: {
                                udp: {
                                    send: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    recv: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                },
                                tcp: {
                                    send: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                    recv: {
                                        pkgs: 0,
                                        bytes: 0,
                                    },
                                },
                                payload: 0,
                                totalDuration: 0,
                            },
                        };
                        this.m_allPeers.set(record.peerid, peerInfo);
                    }

                    if (record.type === 'queryCmd' && record.content.online) {
                        peerInfo.onlineTimes.push({on: record.serverTime, off: record.serverTime});
                    } else {
                        if (record.serverTime >= lastReportTime) {
                            let lastOnline = peerInfo.onlineTimes[peerInfo.onlineTimes.length - 1];
                            lastOnline.off = record.serverTime;
                        }
                    }

                    if (record.maxPeerCount > this.m_maxOnlinePeerCount) {
                        this.m_maxOnlinePeerCount = record.maxPeerCount;
                    }
                    if (record.maxSNCount > this.m_maxSNCount) {
                        this.m_maxSNCount = record.maxSNCount;
                    }

                    if (record.type === 'queryCmd') {
                        peerInfo.natType = record.content.natType;
                        if (record.content.flow.udp.send) {
                            peerInfo.udp.send.pkgs += record.content.flow.udp.send.pkgs;
                            peerInfo.udp.send.bytes += record.content.flow.udp.send.bytes;
                            peerInfo.udp.recv.pkgs += record.content.flow.udp.recv.pkgs;
                            peerInfo.udp.recv.bytes += record.content.flow.udp.recv.bytes;

                            this.m_totalFlows.udp.send.pkgs += record.content.flow.udp.send.pkgs;
                            this.m_totalFlows.udp.send.bytes += record.content.flow.udp.send.bytes;
                            this.m_totalFlows.udp.recv.pkgs += record.content.flow.udp.recv.pkgs;
                            this.m_totalFlows.udp.recv.bytes += record.content.flow.udp.recv.bytes;
                        }
                        if (record.content.dhtFlow) {
                            peerInfo.dht.udp.send.pkgs += record.content.dhtFlow.udp.send.pkgs;
                            peerInfo.dht.udp.send.bytes += record.content.dhtFlow.udp.send.bytes;
                            peerInfo.dht.udp.recv.pkgs += record.content.dhtFlow.udp.recv.pkgs;
                            peerInfo.dht.udp.recv.bytes += record.content.dhtFlow.udp.recv.bytes;
                            peerInfo.dht.udp.req += record.content.dhtFlow.udp.req;
                            peerInfo.dht.udp.resp += record.content.dhtFlow.udp.resp;

                            if (record.content.dhtFlow.pkgs) {
                                Object.entries(record.content.dhtFlow.pkgs.send).forEach(([cmdType, count]) => {
                                    this.m_dhtPkgsStat.send[cmdType] = count + (this.m_dhtPkgsStat.send[cmdType] || 0);
                                });
                                Object.entries(record.content.dhtFlow.pkgs.recv).forEach(([cmdType, count]) => {
                                    this.m_dhtPkgsStat.recv[cmdType] = count + (this.m_dhtPkgsStat.recv[cmdType] || 0);
                                });
                            }
                        }
                        if (snInfo) {
                            snInfo.natType = record.content.natType;
                        }
                        if (record.content.RTT) {
                            peerInfo.sumRTT += record.content.RTT;
                            if (record.content.RTT > peerInfo.maxRTT) {
                                peerInfo.maxRTT = record.content.RTT;
                            }
                            if (record.content.RTT < peerInfo.minRTT) {
                                peerInfo.minRTT = record.content.RTT;
                            }
                            peerInfo.RTTCount++;
                        }
                        if (record.content.upnp) {
                            if (record.content.upnp.enabled) {
                                peerInfo.upnp.enabled = record.content.upnp.enabled;
                                peerInfo.upnp.gateway = record.content.upnp.gateway;
                            }
                        }
                    }

                    if (record.type === 'connect-suc') {
                        // 侦测nattype
                        let detail = record.content.detail;
                        let queryedRemoteEPList = new Set([...detail.sn.eplist, ...detail.dht.eplist]);
                        if (detail.ep && !EndPoint.isNAT(detail.ep) && !queryedRemoteEPList.has(detail.ep)) {
                            let toPeer = this.m_allPeers.get(connectToPeerid(record));
                            if (toPeer) {
                                toPeer.natType = NAT_TYPE.symmetricNAT;
                            }
                            let toSNInfo = this.m_allSNs.get(connectToPeerid(record));
                            if (toSNInfo) {
                                toSNInfo.natType = NAT_TYPE.symmetricNAT;
                            }
                        }

                        if (detail.ep && net.isIPv6(EndPoint.toAddress(detail.ep).address)) {
                            this.m_ipv6Connect++;
                        }
                    }

                    if (record.type === 'natType') {
                        let natDetail = record.content;
                        if (natDetail.status === 'success') {
                            let analysisNatType = () => {
                                if (natDetail.noResp) {
                                    return NAT_TYPE.udpForbiden;
                                }

                                if (natDetail.server1EP && natDetail.server1EP.length > 0 &&
                                    natDetail.server2EP && natDetail.server2EP.length > 0) {
                                        let ep = new Set([...natDetail.server1EP, ...natDetail.server2EP]);
                                        if (ep.size === natDetail.server1EP.length + natDetail.server2EP.length) {
                                            return NAT_TYPE.symmetricNAT;
                                        }
                                }

                                if (natDetail.portRestrict) {
                                    return NAT_TYPE.restrictedNAT;
                                }
                                if (natDetail.hostRestrict) {
                                    return NAT_TYPE.NAT;
                                }
                                return NAT_TYPE.internet;
                            }
                            let natType = analysisNatType();
                            if (natType > peerInfo.detectNatType || (natType === NAT_TYPE.udpForbiden && peerInfo.detectNatType === NAT_TYPE.unknown)) {
                                peerInfo.detectNatType = natType;
                            }
                            if (snInfo) {
                                snInfo.detectNatType = peerInfo.detectNatType;
                            }
                        }
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
        fs.writeFileSync(fd, `最大同时在线SN数: ${this.m_maxSNCount}\r\n`);
        fs.writeFileSync(fd, `上线SN总数: ${this.m_allSNs.size}\r\n`);
        
        fs.writeFileSync(fd, `\r\n`);
        
        // peer概况
        let connectPeerCount = 0;
        let natTypeClassify = [0,0,0,0,0,0]; // 按nattype分类
        let detectNatTypeClassify = [0,0,0,0,0,0]; // 侦测到的nattype
        let udpRecvSendRateClassify = []; // 按udp收发比例分类
        let succUDPRecvSendRateClassify = [];
        let breakUDPRecvSendRateClassify = [];
        let qaRateClassify = [];
        let RTTClassify = [];
        let minRTTClassify = [];
        let maxRTTClassify = [];
        let peerOnlineTimes = [];
        let upnpCount = 0;
        let synUPNPCount = 0;
        this.m_allPeers.forEach((peerinfo, peerid) => {
            if (peerinfo.succTimes + peerinfo.failTimes === 0) {
                return;
            }
            natTypeClassify[peerinfo.natType]++;
            detectNatTypeClassify[peerinfo.detectNatType]++;
            connectPeerCount++;
            let udpRecvSendRate = peerinfo.dht.udp.send.pkgs? peerinfo.dht.udp.recv.pkgs / peerinfo.dht.udp.send.pkgs : 0;
            let udpRecvSendRateGrade = Stat._grade(udpRecvSendRate, 0.05, true);
            Stat._gradeScopeCountInc(udpRecvSendRateGrade, udpRecvSendRateClassify, 'peer-classify udp-recv/send conflict');

            let avgRTT = peerinfo.RTTCount? peerinfo.sumRTT / peerinfo.RTTCount : 0;
            if (avgRTT) {
                Stat._gradeSimple(avgRTT, 10, RTTClassify, 'avgRTT conflict');
                Stat._gradeSimple(peerinfo.minRTT, 10, minRTTClassify, 'minRTT conflict');
                Stat._gradeSimple(peerinfo.maxRTT, 10, maxRTTClassify, 'maxRTT conflict');
            }
            
            let peerLog = `PEERLOG\tpeer:${peerid}`;
            peerLog += `\tisSN:\t${this.m_allSNs.has(peerid)}\tnatType:\t${peerinfo.natType}\t${peerinfo.detectNatType}\tRTT:\t${avgRTT}`;
            peerLog += `\ttotalRecvSendRate:\t${udpRecvSendRate}\trecv:\t${peerinfo.dht.udp.recv.pkgs}\tsend:\t${peerinfo.dht.udp.send.pkgs}`;
            if (peerinfo.succ.udp.send.pkgs) {
                let succUDPRecvSendRate = peerinfo.succ.udp.recv.pkgs / peerinfo.succ.udp.send.pkgs;
                let succUDPRecvSendRateGrade = Stat._grade(succUDPRecvSendRate, 0.05, true);
                Stat._gradeScopeCountInc(succUDPRecvSendRateGrade, succUDPRecvSendRateClassify, 'peer-classify succUDP-recv/send conflict');
                peerLog += `\tsuccRecvSendRate:\t${succUDPRecvSendRate}\trecv:\t${peerinfo.succ.udp.recv.pkgs}\tsend:\t${peerinfo.succ.udp.send.pkgs}`;
            } else {
                peerLog += `\tsuccRecvSendRate:\t${-1}\trecv:\t${peerinfo.succ.udp.recv.pkgs}\tsend:\t${peerinfo.succ.udp.send.pkgs}`;
            }
            
            let connectTimes = (peerinfo.succTimes + peerinfo.failTimes);
            let succRate = connectTimes? peerinfo.succTimes / connectTimes : -1;
            peerLog += `\tsuccRate:\t${succRate}\tsucc times:\t${peerinfo.succTimes}\tfail times:\t${peerinfo.failTimes}`;
            if (peerinfo.succ.totalDuration) {
                peerLog += `\tsuccSpeed:\t${peerinfo.succ.payload / peerinfo.succ.totalDuration}`;
            } else {
                peerLog += `\tsuccSpeed:\t${-1}`;
            }
            if (peerinfo.break.totalDuration) {
                peerLog += `\tbreakSpeed:\t${peerinfo.break.payload / peerinfo.break.totalDuration}`;
            } else {
                peerLog += `\tbreakSpeed:\t${-1}`;
            }
            peerLog += `\tsnNoRespTimes:\t${peerinfo.snNoRespTimes}\ttotalConnections:\t${connectTimes}\tnoRespRate:\t${connectTimes? peerinfo.snNoRespTimes/connectTimes : -1}`;
            if (peerinfo.break.udp.send.pkgs) {
                let breakUDPRecvSendRate = peerinfo.break.udp.send.pkgs? peerinfo.break.udp.recv.pkgs / peerinfo.break.udp.send.pkgs : 0;
                let breakUDPRecvSendRateGrade = Stat._grade(breakUDPRecvSendRate, 0.05, true);
                Stat._gradeScopeCountInc(breakUDPRecvSendRateGrade, breakUDPRecvSendRateClassify, 'peer-classify breakUDP-recv/send conflict');
            }
            if (peerinfo.dht.udp.resp) {
                let qaRate = peerinfo.dht.udp.req / peerinfo.dht.udp.resp;
                Stat._gradeSimple(qaRate, 0.05, qaRateClassify, 'qaRate conflict', true);
                peerLog += `\tQA:\t${qaRate}\tQ:\t${peerinfo.dht.udp.req}\tA:\t${peerinfo.dht.udp.resp}`;
            } else {
                peerLog += `\tQA:\t${-1}\tQ:\t${peerinfo.dht.udp.req}\tA:\t${0}`;
            }
            peerLog += `\tstartTimes:\t${peerinfo.onlineTimes.length}`;
            peerLog += `\tupnp:\t${peerinfo.upnp.enabled}`;
            peerLog += `\tgateway:\t${peerinfo.upnp.gateway}`;
            console.log(peerLog);
            Stat._gradeSimple(peerinfo.onlineTimes.length, 1, peerOnlineTimes, 'peer-online-times', true);
            if (peerinfo.upnp.enabled) {
                upnpCount++;
                if (peerinfo.detectNatType === NAT_TYPE.symmetricNAT) {
                    synUPNPCount++;
                }
            }
        });
        fs.writeFileSync(fd, `参与连接的PEER总数: ${connectPeerCount}\r\n`);
        natTypeClassify.forEach((count, natType) => fs.writeFileSync(fd, `${NAT_TYPE.toString(natType)}: ${count}\r\n`));
        fs.writeFileSync(fd, '\r\n');
        fs.writeFileSync(fd, `侦测PEER网络环境:\r\n`);
        detectNatTypeClassify.forEach((count, natType) => fs.writeFileSync(fd, `${NAT_TYPE.toString(natType)}: ${count}\r\n`));
        fs.writeFileSync(fd, '\r\n');
        fs.writeFileSync(fd, `upnp启动数：${upnpCount}\r\n`);
        fs.writeFileSync(fd, `对称NAT upnp启动数：${synUPNPCount}\r\n`);

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按UDP收发包比例分类: \r\n`);
        udpRecvSendRateClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按成功连接UDP收发包比例分类: \r\n`);
        succUDPRecvSendRateClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按break连接UDP收发包比例分类: \r\n`);
        breakUDPRecvSendRateClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按QA比例分类: \r\n`);
        qaRateClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按平均RTT比例分类: \r\n`);
        RTTClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按最小RTT比例分类: \r\n`);
        minRTTClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, `按最大RTT比例分类: \r\n`);
        maxRTTClassify.forEach(grade => {if (grade.scope) {fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);}});

        fs.writeFileSync(fd, `\r\n`);
        fs.writeFileSync(fd, 'DHT发现peer速度分析:\r\n\t');
        let maxGradeCount = -1;
        let maxGradeIndex = -1;
        for (let i = 0; i < this.m_foundPeerStat.length; i++) {
            if (this.m_foundPeerStat[i].peerCount.length > maxGradeCount) {
                maxGradeCount = this.m_foundPeerStat[i].peerCount.length;
                maxGradeIndex = i;
            }
        }
        if (maxGradeIndex >= 0) {
            this.m_foundPeerStat[maxGradeIndex].peerCount.forEach(countStatGrade => {if (true || countStatGrade.scope) {fs.writeFileSync(fd, `\t${countStatGrade.scope}`);}});
        }
        this.m_foundPeerStat.forEach(timeStateGrade => {
            if (timeStateGrade.scope) {
                fs.writeFileSync(fd, `\r\n\t${timeStateGrade.scope}(ms)`);
                timeStateGrade.peerCount.forEach(countStatGrade => fs.writeFileSync(fd, `\t${countStatGrade.peers.size}`));
            }
        });

        fs.writeFileSync(fd, '\r\n连接分析\r\n');
        fs.writeFileSync(fd, `\t总连接次数： ${this.m_totalConnectTimes}\r\n`);
        let succCount = 0;
        this.m_succConnectionStat.forEach(succGrade => succCount += succGrade.count);
        fs.writeFileSync(fd, `\t连接成功次数： ${succCount}, 成功率: ${succCount / this.m_totalConnectTimes * 100}%\r\n`);
        fs.writeFileSync(fd, `\t自连接成功次数： ${this.m_selfSuccConnect}\r\n`);
        fs.writeFileSync(fd, `\tIPV6连接成功次数： ${this.m_ipv6Connect}\r\n`);
        fs.writeFileSync(fd, `\t连接中断次数： ${this.m_failConnectionStat.breakCount}, 中断率: ${this.m_failConnectionStat.breakCount / succCount * 100}%\r\n`);
        fs.writeFileSync(fd, `\t连接失败次数： ${this.m_failConnectionStat.totalCount}， 失败率: ${this.m_failConnectionStat.totalCount / this.m_totalConnectTimes * 100}%\r\n`);
        fs.writeFileSync(fd, `\t有效连接失败次数： ${this.m_failConnectionStat.validCount}， 失败率: ${this.m_failConnectionStat.validCount / this.m_totalConnectTimes * 100}%\r\n`);
        fs.writeFileSync(fd, `\t自连接失败次数： ${this.m_failConnectionStat.selfConnect}\r\n`);
        let reFailTimes = 0;
        this.m_failConnectionStat.reFailConnections.forEach(times => reFailTimes += (times - 1));
        fs.writeFileSync(fd, `\t重复失败次数： ${reFailTimes}\r\n`);
        if (reFailTimes > 0) {
            this.m_failConnectionStat.reFailConnections.forEach((times, connectID) => fs.writeFileSync(`\t\t${connectID}: ${times}\r\n`));
        }
        let reSuccTimes = 0;
        this.m_reSuccConnections.forEach(times => reSuccTimes += (times - 1));
        fs.writeFileSync(fd, `\t重复成功次数： ${reSuccTimes}\r\n`);
        if (reSuccTimes > 0) {
            this.m_reSuccConnections.forEach((times, connectID) => fs.writeFileSync(`\t\t${connectID}: ${times}\r\n`));
        }
        fs.writeFileSync(fd, `\tTCP连接次数： ${this.m_tcpConnectCount}\r\n`);
        
        fs.writeFileSync(fd, '\r\n\t连接成功效率:');
        this.m_succConnectionStat.forEach(succGrade => {if (succGrade) fs.writeFileSync(fd, `\r\n\t\t${succGrade.scope}(ms): ${succGrade.count}`);});

        let totalSuccPayload = {
            send: {
                udp: {
                    pkgs: 0,
                    bytes: 0,
                },
                tcp: {
                    pkgs: 0,
                    bytes: 0,
                }
            },
            recv: {
                udp: {
                    pkgs: 0,
                    bytes: 0,
                },
                tcp: {
                    pkgs: 0,
                    bytes: 0,
                }
            }
        };
        let totalBreakPayload = {
            send: {
                udp: {
                    pkgs: 0,
                    bytes: 0,
                },
                tcp: {
                    pkgs: 0,
                    bytes: 0,
                }
            },
            recv: {
                udp: {
                    pkgs: 0,
                    bytes: 0,
                },
                tcp: {
                    pkgs: 0,
                    bytes: 0,
                }
            }
        };
        this.m_allPeers.forEach(peer => {
            totalSuccPayload.send.udp.pkgs += peer.succ.udp.send.pkgs;
            totalSuccPayload.send.udp.bytes += peer.succ.udp.send.bytes;
            totalSuccPayload.send.tcp.pkgs += peer.succ.tcp.send.pkgs;
            totalSuccPayload.send.tcp.bytes += peer.succ.tcp.send.bytes;
            totalSuccPayload.recv.udp.pkgs += peer.succ.udp.recv.pkgs;
            totalSuccPayload.recv.udp.bytes += peer.succ.udp.recv.bytes;
            totalSuccPayload.recv.tcp.pkgs += peer.succ.tcp.recv.pkgs;
            totalSuccPayload.recv.tcp.bytes += peer.succ.tcp.recv.bytes;
            totalBreakPayload.send.udp.pkgs += peer.break.udp.send.pkgs;
            totalBreakPayload.send.udp.bytes += peer.break.udp.send.bytes;
            totalBreakPayload.send.tcp.pkgs += peer.break.tcp.send.pkgs;
            totalBreakPayload.send.tcp.bytes += peer.break.tcp.send.bytes;
            totalBreakPayload.recv.udp.pkgs += peer.break.udp.recv.pkgs;
            totalBreakPayload.recv.udp.bytes += peer.break.udp.recv.bytes;
            totalBreakPayload.recv.tcp.pkgs += peer.break.tcp.recv.pkgs;
            totalBreakPayload.recv.tcp.bytes += peer.break.tcp.recv.bytes;
        });
        fs.writeFileSync(fd, `\r\n\t成功负载数据传输效率: 总量(BYTE)：${this.m_succPayload.totalBytes}/(${totalSuccPayload.send.udp.bytes}|${totalSuccPayload.recv.udp.bytes}+${totalSuccPayload.send.tcp.bytes}|${totalSuccPayload.recv.tcp.bytes}), 包数量：(${totalSuccPayload.send.udp.pkgs}|${totalSuccPayload.recv.udp.pkgs}+${totalSuccPayload.send.tcp.pkgs}|${totalSuccPayload.recv.tcp.pkgs})， 总传输时间(S)：${this.m_succPayload.totalDuration}, 平均(BYTE/S)：${this.m_succPayload.totalBytes/this.m_succPayload.totalDuration}`);
        this.m_succPayload.speed.forEach(speedGrade => {if (speedGrade.scope) fs.writeFileSync(fd, `\r\n\t\t${speedGrade.scope}:\t${speedGrade.count}\t${speedGrade.flow.udp.send.pkgs}|${speedGrade.flow.udp.recv.pkgs}\t${speedGrade.flow.udp.send.bytes}|${speedGrade.flow.udp.recv.bytes}\t${speedGrade.flow.payload}/${speedGrade.flow.duration}`);});
        fs.writeFileSync(fd, `\r\n\tbreak负载数据传输效率: 总量(BYTE)：${this.m_breakPayload.totalBytes}/(${totalBreakPayload.send.udp.bytes}|${totalBreakPayload.recv.udp.bytes}+${totalBreakPayload.send.tcp.bytes}|${totalBreakPayload.recv.tcp.bytes}), 包数量：(${totalBreakPayload.send.udp.pkgs}|${totalBreakPayload.recv.udp.pkgs}+${totalBreakPayload.send.tcp.pkgs}|${totalBreakPayload.recv.tcp.pkgs})， 总传输时间(S)：${this.m_breakPayload.totalDuration}, 平均(BYTE/S)：${this.m_breakPayload.totalBytes/this.m_breakPayload.totalDuration}`);
        this.m_breakPayload.speed.forEach(speedGrade => {if (speedGrade.scope) fs.writeFileSync(fd, `\r\n\t\t${speedGrade.scope}:\t${speedGrade.count}\t${speedGrade.flow.udp.send.pkgs}|${speedGrade.flow.udp.recv.pkgs}\t${speedGrade.flow.udp.send.bytes}|${speedGrade.flow.udp.recv.bytes}\t${speedGrade.flow.payload}/${speedGrade.flow.duration}`);});
        fs.writeFileSync(fd, `\r\n\t所有包总流量: \r\n\t\t发送总量(BYTE)：${this.m_totalFlows.udp.send.bytes}, 数据包(个)：${this.m_totalFlows.udp.send.pkgs}\r\n\t\t接收总量(BYTE)：${this.m_totalFlows.udp.recv.bytes}, 数据包(个)：${this.m_totalFlows.udp.recv.pkgs}`);

        fs.writeFileSync(fd, '\r\n\t连接失败原因分析:\r\n');
        fs.writeFileSync(fd, `\t\tremotePeer下线: ${this.m_failConnectionStat.summary.acceptorOffline}\r\n`);
        fs.writeFileSync(fd, `\t\t对称NAT统计: \r\n`);
        fs.writeFileSync(fd, `\t\t\tsrcPeer:\t${this.m_failConnectionStat.summary.symNAT.client}\tremotePeer:\t${this.m_failConnectionStat.summary.symNAT.acceptor}\tBOTH:\t${this.m_failConnectionStat.summary.symNAT.both}\r\n`);
        fs.writeFileSync(fd, '\t\t错误码:\r\n');
        this.m_failConnectionStat.errorCode.forEach((count, errorCode) => fs.writeFileSync(fd, `\t\t\tE${errorCode}:\t${count.count}\r\n`));
        fs.writeFileSync(fd, '\t\tpeer状态:\r\n');
        fs.writeFileSync(fd, '\t\t\tremotePeer-udp收发比: \r\n\t\t\t');
        this.m_failConnectionStat.summary.acceptorUdpRecvSendRate.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tsrcPeer-udp收发比: \r\n\t\t\t');
        this.m_failConnectionStat.summary.sourceUdpRecvSendRate.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\t较小Peer-udp收发比: \r\n\t\t\t');
        this.m_failConnectionStat.summary.miniUdpRecvSendRate.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tsrcPeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.summary.clientOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.summary.acceptorOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer最后一次上报时间差: \r\n\t\t\t');
        this.m_failConnectionStat.summary.acceptorLastReportTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});

        fs.writeFileSync(fd, '\r\n\tDHT查询超时原因分析:\r\n');
        fs.writeFileSync(fd, `\t\tremotePeer下线: ${this.m_failConnectionStat.dhtTimeout.acceptorOffline}\r\n`);
        fs.writeFileSync(fd, `\t\t对称NAT统计: \r\n`);
        fs.writeFileSync(fd, `\t\t\tsrcPeer:\t${this.m_failConnectionStat.dhtTimeout.symNAT.client}\tremotePeer:\t${this.m_failConnectionStat.dhtTimeout.symNAT.acceptor}\tBOTH:\t${this.m_failConnectionStat.dhtTimeout.symNAT.both}\r\n`);
        fs.writeFileSync(fd, '\t\tpeer状态:\r\n');
        fs.writeFileSync(fd, '\t\t\tsrcPeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.dhtTimeout.clientOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.dhtTimeout.acceptorOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer最后一次上报时间差: \r\n\t\t\t');
        this.m_failConnectionStat.dhtTimeout.acceptorLastReportTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});

        fs.writeFileSync(fd, '\r\n\tDHT失败(有返回但没结果)原因分析:\r\n');
        fs.writeFileSync(fd, `\t\tremotePeer下线: ${this.m_failConnectionStat.dhtFail.acceptorOffline}\r\n`);
        fs.writeFileSync(fd, `\t\t对称NAT统计: \r\n`);
        fs.writeFileSync(fd, `\t\t\tsrcPeer:\t${this.m_failConnectionStat.dhtFail.symNAT.client}\tremotePeer:\t${this.m_failConnectionStat.dhtFail.symNAT.acceptor}\tBOTH:\t${this.m_failConnectionStat.dhtFail.symNAT.both}\r\n`);
        fs.writeFileSync(fd, '\t\tpeer状态:\r\n');
        fs.writeFileSync(fd, '\t\t\tsrcPeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.dhtFail.clientOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.dhtFail.acceptorOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tremotePeer最后一次上报时间差: \r\n\t\t\t');
        this.m_failConnectionStat.dhtFail.acceptorLastReportTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});

        fs.writeFileSync(fd, '\r\n\t查找SN失败原因分析:\r\n');
        fs.writeFileSync(fd, `\t\tSN全部下线: ${this.m_failConnectionStat.findSNFail.acceptorOffline}\r\n`);
        fs.writeFileSync(fd, `\t\t对称NAT统计: \r\n`);
        fs.writeFileSync(fd, `\t\t\tsrcPeer:\t${this.m_failConnectionStat.findSNFail.symNAT.client}\tSN:\t${this.m_failConnectionStat.findSNFail.symNAT.acceptor}\tBOTH:\t${this.m_failConnectionStat.findSNFail.symNAT.both}\r\n`);
        fs.writeFileSync(fd, '\t\tpeer状态:\r\n');
        fs.writeFileSync(fd, '\t\t\tsrcPeer在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.findSNFail.clientOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tSN在线时长: \r\n\t\t\t');
        this.m_failConnectionStat.findSNFail.acceptorOnline.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t\t\tSN最后一次上报时间差: \r\n\t\t\t');
        this.m_failConnectionStat.findSNFail.acceptorLastReportTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});

        fs.writeFileSync(fd, '\r\n\tcall对方超时(查到SN但SN没响应call):\r\n\t');
        this.m_failConnectionStat.callTimeout.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}ms:\t${grade.count}`);});
        fs.writeFileSync(fd, `\r\n\tcall失败(SN响应了call但eplist为空)次数:${this.m_failConnectionStat.callFail}\r\n`);
        fs.writeFileSync(fd, '\r\n\t查得在线SN数量:\r\n\t');
        this.m_failConnectionStat.onlineSNCount.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t命中对方SN数量:\r\n\t');
        this.m_failConnectionStat.hitRemoteSNCount.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t本地上线SN数量:\r\n\t');
        this.m_failConnectionStat.localOnlineSN.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);});
        fs.writeFileSync(fd, '\r\n\t对端上线SN数量:\r\n\t');
        this.m_failConnectionStat.remoteOnlineSN.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`);});

        let totalSNHit = {
            hits: 0,
            miss: 0,
        };
        let snHitGrade = [];
        let snNoRespTimesGrade = [];
        let totalNoRespTimes = 0;
        let snOnlineTimesGrade = [];
        this.m_allSNs.forEach(snInfo => {
            totalSNHit.hits += snInfo.hitStat.hits;
            totalSNHit.miss += snInfo.hitStat.miss;
            if (snInfo.hitStat.hits + snInfo.hitStat.miss > 0) {
                Stat._gradeSimple(snInfo.hitStat.hits / (snInfo.hitStat.hits + snInfo.hitStat.miss), 0.05, snHitGrade, 'sn-hit', true);
            }
            if (snInfo.noRespTimes) {
                totalNoRespTimes += snInfo.noRespTimes;
                Stat._gradeSimple(snInfo.noRespTimes, 100, snNoRespTimesGrade, 'no-resp-sn', true);
            }
            let peerInfo = this.m_allPeers.get(snInfo.peerid);
            console.log(`noRespSN:\t${snInfo.peerid}\ttimes:\t${snInfo.noRespTimes}\tqa\t${peerInfo.dht.udp.req/peerInfo.dht.udp.resp}\thit:\t${snInfo.hitStat.hits/(snInfo.hitStat.hits+snInfo.hitStat.miss)}\trecv-send:\t${peerInfo.dht.udp.recv.pkgs/peerInfo.dht.udp.send.pkgs}`);

            Stat._gradeSimple(snInfo.onlineTimes.length, 1, snOnlineTimesGrade, 'sn-online-times', true);
        });
        fs.writeFileSync(fd, `\r\nSN命中率:${totalSNHit.hits*100 / (totalSNHit.hits + totalSNHit.miss)}%\r\n`);
        snHitGrade.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `\t${grade.scope}:\t${grade.count}`)});

        fs.writeFileSync(fd, `\r\nSN无响应次数：${totalNoRespTimes}\r\n`);
        snNoRespTimesGrade.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}:\t${grade.count}\r\n`)});
        
        fs.writeFileSync(fd, `\r\nDHT发包统计：\r\n`);
        fs.writeFileSync(fd, `${JSON.stringify(Object.entries(this.m_dhtPkgsStat.send))}`);
        fs.writeFileSync(fd, `\r\nDHT收包统计：\r\n`);
        fs.writeFileSync(fd, `${JSON.stringify(Object.entries(this.m_dhtPkgsStat.recv))}`);

        fs.writeFileSync(fd, '\r\n失败连接时间消耗分布:\r\n');
        fs.writeFileSync(fd, '\r\n搜索SN消耗的时长:\r\n');
        this.m_failConnectionStat.findSNTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\nSN第一次响应call的时长:\r\n');
        this.m_failConnectionStat.firstSNRespTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\nSN第一次返回对方EPlist的时长:\r\n');
        this.m_failConnectionStat.firstGotEPTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\n对方pingSN时间:\r\n');
        this.m_failConnectionStat.epUpdateTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});

        fs.writeFileSync(fd, '\r\n成功连接时间消耗分布:\r\n');
        fs.writeFileSync(fd, '\r\n搜索SN消耗的时长:\r\n');
        this.m_findSNTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\nSN第一次响应call的时长:\r\n');
        this.m_firstSNRespTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\nSN第一次返回对方EPlist的时长:\r\n');
        this.m_firstGotEPTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\n对方响应SYN的时长:\r\n');
        this.m_firstSynTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});
        fs.writeFileSync(fd, '\r\n对方pingSN时间:\r\n');
        this.m_epUpdateTime.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}(ms):\t${grade.count}\r\n`)});

        fs.writeFileSync(fd, '\r\nSN上线次数:\r\n');
        snOnlineTimesGrade.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}:\t${grade.count}\r\n`)});

        fs.writeFileSync(fd, '\r\n所有PEER上线次数:\r\n');
        peerOnlineTimes.forEach(grade => {if (grade.scope) fs.writeFileSync(fd, `${grade.scope}:\t${grade.count}\t`)});

        fs.writeFileSync(fd, '\r\n各种网络环境下的连接状态：\r\n');
        this.m_natTypeConnections.forEach((resultTypeMap, natTypeKey) => {
            fs.writeFileSync(fd, `${natTypeKey}:\t`);
            resultTypeMap.forEach((count, resultType) => fs.writeFileSync(fd, `\t${resultType}\t${count}\t`));
            fs.writeFileSync(fd, `\r\n`);
        });
        fs.writeFileSync(fd, '\r\n各种测定网络环境下的连接状态：\r\n');
        this.m_detectNatTypeConnections.forEach((resultTypeMap, natTypeKey) => {
            fs.writeFileSync(fd, `${natTypeKey}:\t`);
            resultTypeMap.forEach((count, resultType) => fs.writeFileSync(fd, `\t${resultType}\t${count}\t`));
            fs.writeFileSync(fd, `\r\n`);
        });

        fs.writeFileSync(fd, '\r\n崩溃统计:');
        fs.writeFileSync(fd, `\r\n\t总次数：${this.m_crashStat.totalCount}`);

        fs.writeFileSync(fd, '\r\n\r\n统计程序本身BUG:');
        this.m_failConnectionStat.unknownStatError.forEach(statBug => fs.writeFileSync(fd, `\r\n\t${statBug}`));
        fs.writeFileSync(fd, '\r\n');

        // this.m_allOfflineSNConnections.forEach(connectID => {
        //     console.log(`allOfflineSNConnections:${connectID}`);
        // });
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