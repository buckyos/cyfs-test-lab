# coding=utf-8

import os
import sys
import time
import json
import random
import redis
import pickle

from heartbeat import heartbeat
from peer_mgr import peerMgr

class BDTEcho:
    config = {}

    def __init__(self):
        self._logDate = ""
        self._logFile = None
        self._rootFolder = os.path.dirname(os.path.abspath(__file__))
        self._configPath = self._rootFolder + "/config.json"

        logFolder = self._rootFolder + "/report_log/"
        if not os.path.exists(logFolder):
            os.mkdir(logFolder)
            
        self._onlinePeers = {}
        self._snPeerids = {}
        self._maxPeerCount = 0
        self._maxSNCount = 0

    def peerPulse(self, peerid, body):
        now = time.time()
        lastUpdateTime = now
        peerinfo = self._onlinePeers.get(peerid, None)
        if peerinfo == None:
            peerinfo = {
                "peerid": peerid,
                "flow": {
                    "udp": {
                        "send": {
                            "pkgs": 0,
                            "bytes": 0,
                        },
                        "recv": {
                            "pkgs": 0,
                            "bytes": 0,
                        }
                    }
                },
                "online": now,
                "lastConnect": 0,
            }
            self._onlinePeers[peerid] = peerinfo
        else:
            lastUpdateTime = peerinfo["updateTime"]

        peerinfo["updateTime"] = now
        peerinfo["version"] = body["version"];
        body["serverTime"] = now
        body["localTime"] = time.asctime(time.localtime(now))

        # remove timeout peers
        timeoutPeerids = []
        for peerid, peerinfo in self._onlinePeers.items():
            if now - peerinfo["updateTime"] > 1000:
                timeoutPeerids.append(peerid)

        for peerid in timeoutPeerids:
            self._onlinePeers.pop(peerid)
            if peerid in self._snPeerids:
                self._snPeerids.pop(peerid)

        self._writeLog(body)

    def __calcUdpRate(self, peerInfo):
        udpStat = peerInfo["flow"]["udp"]
        if udpStat["send"]["pkgs"] == 0:
            return 0
        return udpStat["recv"]["pkgs"] / udpStat["send"]["pkgs"]

    def queryCmd(self, body):
        now = time.time()
        cmds = []
        peerid = body["peerid"]

        if "projectsList" not in peerMgr.config:
            return cmds

        version = peerMgr.config["projectsList"][0]["packageInfo"]["version"]
        if body["version"] != version:
            return cmds

        srcPeerinfo = self._onlinePeers.get(body["peerid"], None)
        if not srcPeerinfo:
            return cmds
        
        udpStatDelta = body["content"]["flow"]["udp"]
        udpStatTotal = srcPeerinfo["flow"]["udp"]
        udpStatTotal["recv"]["pkgs"] += udpStatDelta["recv"]["pkgs"]
        udpStatTotal["recv"]["bytes"] += udpStatDelta["recv"]["bytes"]
        udpStatTotal["send"]["pkgs"] += udpStatDelta["send"]["pkgs"]
        udpStatTotal["send"]["bytes"] += udpStatDelta["send"]["bytes"]
        srcUdpRate = self.__calcUdpRate(srcPeerinfo)
        #if srcUdpRate < 0.2:
        #    return cmds

        if ("online" in body["content"]):
            srcPeerinfo["online"] = now
            #print("online:peerid:%s, ip:%s, time:%d" % (peerid, body["ip"], now))

        # 不对SN下达测试指令
        if (body["content"]["isSN"]):
            #print("SN:peerid:%s, ip:%s, time:%d" % (peerid, body["ip"], now))
            self._snPeerids[peerid] = 1
            peerMgr.uniquePeer(body["ip"], peerid)
            #return cmds;
        elif peerid in self._snPeerids:
            self._snPeerids.pop(peerid)

        onlinePeerCount = len(self._onlinePeers)
        #if (onlinePeerCount == 0 or len(self._snPeerids) / onlinePeerCount <= 0.02):
        #    cmds.append({"type": "startSN"})
    
        if onlinePeerCount > 0:
            alivePeerids = []
            for peerid, peerinfo in self._onlinePeers.items():
                #if (now - peerinfo["updateTime"] < 120 and peerinfo["version"] == version and self.__calcUdpRate(peerinfo) > 0.2):
                #print("findpeer:%s,now:%d" % (peerinfo, now))
                #if (now - peerinfo["updateTime"] < 1000 and peerinfo["version"] == version and peerid not in self._snPeerids) and (now - peerinfo["online"] >= 600) and (now - peerinfo["lastConnect"] > 120):
                if (now - peerinfo["updateTime"] < 1000 and peerinfo["version"] == version) and (now - peerinfo["online"] >= 600) and (now - peerinfo["lastConnect"] > 120):
                    alivePeerids.append(peerid)

            if (len(alivePeerids) > 0):
                selectPeerid = alivePeerids[random.randint(0, len(alivePeerids) - 1)]
                cmds.append({"type": "connect", "params": {"remotePeerid": selectPeerid}})
                srcPeerinfo["lastConnect"] = now
                destPeerinfo = self._onlinePeers.get(selectPeerid, None)
                if destPeerinfo:
                    destPeerinfo["lastConnect"] = now

        return cmds

    def onCrash(self, body):
        peerid = body["peerid"]
        if peerid in self._onlinePeers:
            self._onlinePeers.pop(peerid)
        if peerid in self._snPeerids:
            self._snPeerids.pop(peerid)

    def SNOnline(self, body):
        peerid = body["peerid"]
        self._snPeerids[peerid] = 1

    def connectBegin(self, body):
        pass

    def acceptorListen(self, body):
        pass

    def connectSucc(self, body):
        pass

    def connectEchoError(self, body):
        pass

    def connectClose(self, body):
        pass

    def connectError(self, body):
        pass

    def connectSuccAccept(self, body):
        pass

    def connectAccept(self, body):
        pass

    def connectErrorAccept(self, body):
        pass

    def connectCloseAccept(self, body):
        pass

    def acceptorClose(self, body):
        pass

    def acceptorError(self, body):
        pass

    def natType(self, body):
        pass

    def _writeLog(self, body):
        logDate = time.strftime("%Y-%m-%d", time.localtime())
        if self._logDate != logDate:
            if self._logFile:
                self._logFile.close()
                
            self._logDate = logDate
            self._maxPeerCount = 0
            self._logPath = self._rootFolder + "/report_log/" + logDate + ".log"
            self._logFile = open(self._logPath, "a")

        if self._maxPeerCount < len(self._onlinePeers):
            self._maxPeerCount = len(self._onlinePeers)
        if self._maxSNCount < len(self._snPeerids):
            self._maxSNCount = len(self._snPeerids)

        body["peercount"] = len(self._onlinePeers)
        body["maxPeerCount"] = self._maxPeerCount
        body["snCount"] = len(self._snPeerids);
        body["maxSNCount"] = self._maxSNCount;
        logTxt = json.dumps(body) + "\n\r"
        self._logFile.write(logTxt);

bdtEcho = BDTEcho()
