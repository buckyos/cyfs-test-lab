# coding=utf-8

import os
import sys
import time
import json
import random
import redis
import pickle

class chainSDK:
    def __init__(self):
        self._config = {}
        self._whitelist = {}
        self._configRefreshTime = 0

        self._logDate = ""
        self._logFile = None
        self._rootFolder = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        logFolder = self._rootFolder + "/chainsdk_log/"
        if not os.path.exists(logFolder):
            os.mkdir(logFolder)
            
        self._onlinePeers = {}
        self._maxPeerCount = 0

        self._lastStartupTime = 0

    def getName(self):
        return "chainsdk"

    def getConfig(self, body):
        """
        查询版本更新
        content: {}
        resp: {
            "name": "test case name",
            "packageInfo": {"version": "c.d", "host": "case download host", "port": CASE_DOWNLOAD_PORT, "path": "/case download path"},
            "params": CASE_STARTUP_PARAMS
        }
        """
        
        if not body:
            return None

        self._loadConfig()
        peerid = body["peerid"]
        whiteInfo = self._whitelist.get(peerid, None)
        if whiteInfo == None:
            accountID = peerid.partition("-")[0]
            whiteInfo = self._whitelist.get(accountID, None)
            if whiteInfo == None:
                return None

        return self._config

    def onRequest(self, methodPath, body):
        if methodPath != 'getConfig':
            self.peerPulse(body["peerid"], body)
            
        if methodPath == 'getConfig':
            return self.getConfig(body)
        elif methodPath == 'queryCmd':
            return self.queryCmd(body)
        elif methodPath == 'startup':
            return self.startup(body)
        elif methodPath == 'crash':
            return self.onCrash(body)
        
        return {}

    def peerPulse(self, peerid, body):
        now = time.time()
        lastUpdateTime = now
        peerinfo = self._onlinePeers.get(peerid, None)
        if peerinfo == None:
            peerinfo = {
                "peerid": peerid,
                "online": now,
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

        self._writeLog(body)
        self._loadConfig()

    def queryCmd(self, body):
        now = time.time()
        cmds = []
        peerid = body["peerid"]

        version = self._config["packageInfo"]["version"]
        if body["version"] != version:
            return cmds

        srcPeerinfo = self._onlinePeers.get(body["peerid"], None)
        if not srcPeerinfo:
            return cmds
        
        if ("online" in body["content"]):
            srcPeerinfo["online"] = now
            #print("online:peerid:%s, ip:%s, time:%d" % (peerid, body["ip"], now))

        onlinePeerCount = len(self._onlinePeers)
    
        ##### 下发测试指令？<TODO>

        return cmds

    def startup(self, body):
        now = time.time()
        resp = {
            "start": False
        }
        print('startup', body["version"], self._config["packageInfo"]["version"], now, self._lastStartupTime, now - self._lastStartupTime, body["peerid"])
        if body["version"] == self._config["packageInfo"]["version"] and now - self._lastStartupTime > 30:
            print('startup', body["version"], self._config["packageInfo"]["version"], now, self._lastStartupTime, now - self._lastStartupTime, body["peerid"])
            self._lastStartupTime = now
            resp["start"] = True
            return resp

        return resp

    def onCrash(self, body):
        peerid = body["peerid"]
        if peerid in self._onlinePeers:
            self._onlinePeers.pop(peerid)

    def _writeLog(self, body):
        logDate = time.strftime("%Y-%m-%d", time.localtime())
        if self._logDate != logDate:
            if self._logFile:
                self._logFile.close()
                
            self._logDate = logDate
            self._maxPeerCount = 0
            self._logPath = self._rootFolder + "/chainsdk_log/" + logDate + ".log"
            self._logFile = open(self._logPath, "a")

        if self._maxPeerCount < len(self._onlinePeers):
            self._maxPeerCount = len(self._onlinePeers)

        body["peercount"] = len(self._onlinePeers)
        body["maxPeerCount"] = self._maxPeerCount
        logTxt = json.dumps(body) + "\n\r"
        self._logFile.write(logTxt);

    def _loadConfig(self):
        now = time.time()
        if now - self._configRefreshTime > 3600:
            self._configRefreshTime = 0
            f = open(self._rootFolder + "/chainsdk/config.json", "rb")
            if f:
                buf = f.read()
                f.close()
                if buf:
                    self._config = json.loads(buf.decode())
                    self._configRefreshTime = now

            f = open(self._rootFolder + "/chainsdk/whitelist.json", "rb")
            if f:
                buf = f.read()
                f.close()
                if buf:
                    self._whitelist = json.loads(buf.decode())

chainsdk = chainSDK()
