# coding=utf-8

import os
import sys
import time
import json
from account import *
import config
from project_mgr import prjMgr

from heartbeat import queue, heartbeat

SUPPORT_QQ_ADDRESS = "（官方QQ群:777179682）"

NEW_FRAMEWORK_PACKAGE = {
    "version": "1.98",
    "host": "192.168.100.254",
    "port": 80,
    "path": "/syspackage/chainsdk-2020_01_02_082919.zip",
    "type": "update",
    "MD5": "aaba522e96445a504173ba72aea52662"
}

NEW_FRAMEWORK_WHITELIST = {
    # 第一批
    "D4:EE:07:64:5F:3C-6mQcNAec": "0|3|93%",
    "D4:EE:07:64:D7:40-M5Zj88ta": "3|3|83%",
    "D4:EE:07:64:B9:E4-RhSDWSS": "3|3|79%",
    "D4:EE:07:60:CF:14-tH5kZYn": "3|3|78%",
    "D4:EE:07:64:F8:1C-YHSBFzKC": "3|3|76.5%",

    # 第二批
    "D4:EE:07:64:5F:48-cQcz7kx": "0|3|87.95%",
    "D4:EE:07:64:AF:7C-4HiDdQHD": "3|3|86.95%",
    "D4:EE:07:68:90:DC-tQ7kYECz": "2|3|86.08%",
    "D4:EE:07:64:AB:18-WsdEF25h": "2|3|84.21%",
    "D4:EE:07:64:3A:70-bwJjS7G3": "3|3|82.80%",
    "D4:EE:07:64:82:B4-HMncMJ55": "0|3|82.72%",
    "D4:EE:07:64:DA:28-4smXKCMn": "3|3|82.61%",
    "D4:EE:07:64:6C:24-Yrhx6ZhS": "3|3|82.42%",
    "D4:EE:07:64:96:94-rQQ2YJb4": "3|3|81.70%",
    "D4:EE:07:64:BB:9C-BH7t2HKz": "3|3|81.58%",

    # 服务器节点
    "13928434945-p2p_server": "p2p-server"
}

class PeerMgr:
    rootFolder = ""
    config = {}
    configRefreshTime = 0
    onlinePeers = {}
    onlineIPs = {}
    onlineAccounts = {}
    #### 所有测试项目需要导出getName和getConfig接口
    #### 初始化后调用peermgr.registProject
    projectsList = {}

    def __init__(self):
        PeerMgr.rootFolder = os.path.dirname(os.path.abspath(__file__))

    def update(self, clientInfo, forceUpdate):
        now = time.time()
        peerid = clientInfo['peerid']
        curVersion = 0
        if "newPackage" in PeerMgr.config:
            curVersion = float(PeerMgr.config["newPackage"]["version"])

        # TODO 旧版用户要求升级，这里要修改版本号
        if (not "version" in clientInfo) or float(clientInfo["version"]) < 1.45:
            versionError = {}
            versionError["errorMsg"] = "您的版本过低，请到活动页面下载并升级客户端" + SUPPORT_QQ_ADDRESS
            versionError["profit"] = {
                "totalProfit": -1,
                "balance": -1,
                "todayProfit": -1,
                "gctAddress": ""
            }
            return versionError

        accountID = peerid[0:11]
        if clientInfo["platform"] == "hiwifi":
            accountID = peerid[0:17]
        accountInfo = self.onlineAccounts.get(accountID, None)
        if accountInfo:
            if now - accountInfo["lastUpdateTime"] < 300:
                accountInfo["updateTimes"] = accountInfo["updateTimes"] + 1
                if (curVersion > 0 and float(clientInfo["version"]) < curVersion and accountInfo["updateTimes"] >= 10):
                    versionError = {}
                    versionError["errorMsg"] = "您的版本异常，请卸载重装" + SUPPORT_QQ_ADDRESS
                    versionError["profit"] = {
                        "totalProfit": -1,
                        "balance": -1,
                        "todayProfit": -1,
                        "gctAddress": ""
                    }
                    return versionError
            else:
                accountInfo["lastUpdateTime"] = now
                accountInfo["updateTimes"] = 1
        else:
            accountInfo = {
                "lastUpdateTime": now,
                "updateTimes": 1,
            }
            self.onlineAccounts[accountID] = accountInfo

        ipConflict = False
        ip = clientInfo.get("ip", None)
        if ip:
            peerlist = self.onlineIPs.get(ip, None)
            if peerlist:
                if len(peerlist) >= 3:
                    for ip, ipInfo in peerlist.items():
                        if now - ipInfo["lastTime"] > 21*60:
                            peerlist.pop(ip)
                            break
                
                if len(peerlist) >= 3:
                    if peerlist.get(peerid, None) == None:
                        ipConflict = True
        #print("ipconflict:ip:%s,peerid:%s,conflict:%s,ipcount:%s,peerlist:%s"%(ip,peerid,ipConflict,len(self.onlineIPs),peerlist))

        # 关闭IP去重
        #ipConflict = False
        
        rc_value = config.getConfig()
        use_profic_limit = rc_value['use_profic_limit']

        # 根据配置决定 是否启用 限制最大收益用户数, 
        isProfic = True
        if use_profic_limit:
            # 判断是否允许进入收益队列
            # 自身peer不在收益状态, 且收益队列已经满了, 就返回'排队中'的提示
            # 按IP去重
            isProfic = (not ipConflict)# and queue.admitProfic(peerid)
            # 按排队顺序
            # isProfic = queue.admitProfic(peerid)
        # end if

        #print("ipconflict:ip:%s,peerid:%s,conflict:%s,ipcount:%s,peerlist:%s,isProfic:%s"%(ip,peerid,ipConflict,len(self.onlineIPs),peerlist, isProfic))

        # 允许进入收益队列, 设置一下peer 的状态
        if isProfic:
            queue.setOnProfic(peerid)
            if ip:
                peerlist = self.onlineIPs.get(ip, None);
                if peerlist == None:
                    peerlist = {}
                    self.onlineIPs[ip] = peerlist

                peerlist[peerid] = {"lastTime": now}

        peerInfo = self.__findOrCreatePeerInfo(clientInfo["peerid"], clientInfo["sessionID"], clientInfo["deviceID"])
        if peerInfo:
            # 不收益时不ping极路由计费
            if (isProfic and (now - peerInfo["lastPingTime"] > 1200 or forceUpdate)):
                peerInfo["lastPingTime"] = 0
                if account.ping(peerInfo["sessionID"], peerInfo["deviceID"]) == 0:
                    peerInfo["lastPingTime"] = now

            # 
            profitRefreshInterval = 0
            if not isProfic:
                profitRefreshInterval = 0
            if now - peerInfo["lastQueryProfitTime"] > profitRefreshInterval or (isProfic and forceUpdate):
                peerInfo["lastQueryProfitTime"] = 0
                result, totalProfit, balance, todayProfit, gctAddress = account.queryProfit(peerInfo["sessionID"], peerInfo["deviceID"])
                if result == 0:
                    peerInfo["lastQueryProfitTime"] = now
                    peerInfo["totalProfit"] = totalProfit
                    peerInfo["balance"] = balance
                    peerInfo["todayProfit"] = todayProfit
                    peerInfo["gctAddress"] = gctAddress

        if now - PeerMgr.configRefreshTime > 3600 or forceUpdate:
            PeerMgr.configRefreshTime = 0
            c = prjMgr.loadConfig(True)
            if c:
                PeerMgr.config = c
                PeerMgr.configRefreshTime = now

        peerConfig = {}
        peerConfig["versionInfo"] = {}

        ## 新框架灰度部署
        if NEW_FRAMEWORK_WHITELIST.get(peerid):
            peerConfig["versionInfo"]["newPackage"] = NEW_FRAMEWORK_PACKAGE
        else:
            peerConfig["versionInfo"]["newPackage"] = PeerMgr.config["newPackage"]

        peerConfig["versionInfo"]["projectsList"] = []
        if peerInfo:
            peerInfo["ip"] = clientInfo.get("ip", None)
            peerInfo["platform"] = clientInfo["platform"]
            peerInfo["version"] = clientInfo["version"]
            peerInfo["time"] = clientInfo["time"]
            if not isProfic:
                peerConfig["errorMsg"] = "排队中" + SUPPORT_QQ_ADDRESS
            else:
                # 其他测试项目
                otherPrjs = prjMgr.getPrjConfigs(peerInfo)
                peerConfig["versionInfo"]["projectsList"].extend(otherPrjs)

            peerConfig["profit"] = {
                "totalProfit": peerInfo["totalProfit"],
                "balance": peerInfo["balance"],
                "todayProfit": peerInfo["todayProfit"],
                "gctAddress": peerInfo["gctAddress"]
            }
        else:
            peerConfig["errorMsg"] = "更新收益失败，稍后自动重试" + SUPPORT_QQ_ADDRESS
            peerConfig["profit"] = {
                "totalProfit": -1,
                "balance": -1,
                "todayProfit": -1,
                "gctAddress": ""
            }
        return peerConfig

    def updatePeerForSessionID(self, sessionID):
        peers = []
        for peerid, peerinfo in self.onlinePeers.items():
            if peerinfo["sessionID"] == sessionID:
                peers.append({"peerid": peerinfo["peerid"], "sessionID": sessionID})

        for peer in peers:
            self.update(peer, True)

        return

    # 一个PEER独占IP
    def uniquePeer(self, ip, peerid):
        #self.onlineIPs[ip] = {
        #    "peerid": peerid,
        #    "lastTime": time.time(),
        #}
        pass

    def __findOrCreatePeerInfo(self, peerid, sessionID, deviceID):
        peerInfo = self.onlinePeers.get(peerid, None)
        now = time.time()
        if peerInfo == None:
            if not sessionID:
                return None

            peerInfo = {
                "peerid": peerid,
                "deviceID": deviceID,
                "sessionID": sessionID,
                "lastBeatheartTime": now,
                "lastPingTime": 0, #上次ping的时间
                "lastQueryProfitTime": 0, #上次查询收益的时间
                "totalProfit": 0,
                "balance": 0,
                "todayProfit": 0,
                "gctAddress": ""
            }
            self.onlinePeers[peerid] = peerInfo
            return peerInfo
        else:
            peerInfo["lastBeatheartTime"] = now

        if now - peerInfo["lastBeatheartTime"] > 120:
            heartbeat.recordHeartbeat(peerid, now)
        return peerInfo

    def peerPulse(self, peerid):
        peerInfo = self.onlinePeers.get(peerid, None)
        if peerInfo == None:
            return

        # 记录peerid 心跳
        now = time.time()
        if now - peerInfo["lastBeatheartTime"] > 120:
            peerInfo["lastBeatheartTime"] = time.time()
            heartbeat.recordHeartbeat(peerid, now)

peerMgr = PeerMgr()
