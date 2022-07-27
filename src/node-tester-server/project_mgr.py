# coding=utf-8

import os
import sys
import time
import json
import requests

g_rootFolder = os.path.dirname(os.path.abspath(__file__))

class Config:
    
    def __init__(self):
        pass
        
    def load(self, force):
        f = None
        try:
            f = open(g_rootFolder + "/config.json", "rb")
            if f:
                buf = f.read()
                f.close()
                f = None
                if buf:
                    return json.loads(buf.decode())
        except:
            if f:
                f.close()

    def save(self, cfg):
        f = None
        try:
            f = open(g_rootFolder + "/config.json", "w")
            if f:
                buf = json.dumps(cfg, indent=4)
                if buf:
                    f.write(buf);
                    f.close()
                    f = None
                    return True
        except:
            if f:
                f.close()

configure = Config()

class Project:
    
    def __init__(self, config):
        """
        {
            "name": "pulgin name",
            "deadline": time
            "registTime": time
            "url": "request url", # 设定此参数，测试系统将转发客户端请求到该地址
            "packageInfo": {} # 包信息，包括（包名，版本号，更新地址，MD5等）
            "params": {} # 包启动命令行参数
            "whitelist": {} # 白名单
            "blacklist": {} # 黑名单
        }
        """
        self.name = config["name"]
        if "registTime" in config:
            self.registTime = config["registTime"]
        else:
            self.registTime = 0

        if "deadline" in config:
            self.deadline = config["deadline"]
        else:
            self.deadline = 0xFFFFFFFF

        if "url" in config:
            self.url = config["url"]
        else:
            self.url = None

        if "packageInfo" in config:
            self.packageInfo = config["packageInfo"]
        else:
            self.packageInfo = None

        if "params" in config:
            self.params = config["params"]
        else:
            self.params = None

        if "whitelist" in config:
            self.whitelist = {}
            for id in config["whitelist"]:
                self.whitelist[id] = 1
        else:
            self.whitelist = None

        if "blacklist" in config:
            self.blacklist = {}
            for id in config["blacklist"]:
                self.blacklist[id] = 1
        else:
            self.blacklist = None

        if "logOn" in config:
            self.logOn = config["logOn"]
        else:
            self.logOn = False

        if self.logOn:
            self._logDate = ""
            self._logFile = None
            self._onlinePeers = {}
            self._maxPeerCount = 0

    def getName(self):
        return self.name

    def getConfigForPeer(self, body):
        now = time.time()
        peerid = body["peerid"]

        if now > self.deadline:
            return None
        elif self.packageInfo:
            accountID = peerid.partition("-")[0]

            if self.logOn:
                self.peerPulse(peerid, body)

            if self.blacklist and (self.blacklist.get(peerid, None) or self.blacklist.get(accountID, None)):
                return None
            if not self.whitelist or (self.whitelist.get(peerid, None) or self.whitelist.get(accountID, None)):
                return {
                    "name": self.name,
                    "packageInfo": self.packageInfo,
                    "params": self.params or ""
                }
                
        elif self.url:
            resp = self.request("getConfig", body)
            if resp:
                try:
                    return json.loads(resp.decode())
                except:
                    pass

            return None


    def request(self, methodPath, body):
        try:    
            peerid = body["peerid"]

            if self.logOn:
                self.peerPulse(peerid, body)

            methodUrl = "%s/%s" % (self.url, methodPath)
            headers = {'content-type': 'application/json'}
            response = requests.post(methodUrl, data = json.dumps(body), headers = headers, verify=False)
            return response.content
        except Exception as e:
            import traceback
            print(traceback.format_exc())

    def getConfig(self):
        config = {}
        config["name"] = self.name
        config["registTime"] = self.registTime

        if self.deadline:
            config["deadline"] = self.deadline
        else:
            config["deadline"] = 0xFFFFFFFF

        if self.url:
            config["url"] = self.url

        if self.packageInfo:
            config["packageInfo"] = self.packageInfo

        if self.params:
            config["params"] = self.params

        if self.whitelist:
            config["whitelist"] = self.whitelist

        if self.blacklist:
            config["blacklist"] = self.blacklist

        config["logOn"] = self.logOn

        return config

    def save(self):
        # 保存到配置文件
        cfg = configure.load(True)
        if not cfg:
            return False

        isNew = True
        prjList = cfg["projectsList"]
        for index in range(len(prjList)):
            prj = prjList[index]
            if prj["name"] == self.getName():
                prjList[index] = self.getConfig()
                isNew = False
        
        if isNew:
            prjList.append(self.getConfig())

        return configure.save(cfg)

    def peerPulse(self, peerid, body):
        now = time.time()
        peerinfo = self._onlinePeers.get(peerid, None)
        if peerinfo == None:
            peerinfo = {
                "peerid": peerid,
                "online": now,
            }
            self._onlinePeers[peerid] = peerinfo
        else:
            pass

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
        body.pop("serverTime")
        body.pop("localTime")

    def _writeLog(self, body):
        logDate = time.strftime("%Y-%m-%d", time.localtime())
        if self._logDate != logDate:
            if self._logFile:
                self._logFile.close()
                
            self._logDate = logDate
            self._maxPeerCount = 0
            dirPath = g_rootFolder + "/" + self.name + "_log/"
            self._logPath = dirPath + logDate + ".log"
            try:
                self._logFile = open(self._logPath, "a")
            except:
                os.makedirs(dirPath)
                self._logFile = open(self._logPath, "a")

        if self._maxPeerCount < len(self._onlinePeers):
            self._maxPeerCount = len(self._onlinePeers)

        body["peercount"] = len(self._onlinePeers)
        body["maxPeerCount"] = self._maxPeerCount
        logTxt = json.dumps(body) + "\n\r"
        body.pop("peercount")
        body.pop("maxPeerCount")
        self._logFile.write(logTxt)
        self._logFile.flush()

class ProjectMgr:
    projectsList = {}

    def __init__(self):
        cfg = configure.load(True)
        prjList = cfg["projectsList"]
        for prjCfg in prjList:
            prj = Project(prjCfg)
            self.projectsList[prj.getName()] = prj

    def registProject(self, config):
        if not "url" in config and not "packageInfo" in config:
            return {"result": "url or packageInfo must exists"}

        config["registTime"] = time.time()
        prj = Project(config)
        if prj.save():
            self.projectsList[prj.getName()] = prj
            print("rigistProject:%s, url:%s" % (prj.getName(), prj.url))
            return {"result": "ok"}
        else:
            return {"result": "save the project failed"}

    def getProject(self, prjName):
        return self.projectsList.get(prjName, None);

    def getPrjConfigs(self, peerInfo):
        result = []

        """
        body: {"type": "xxxx", "peerid": "xxx", "version": "clientVersion", "time": clientTime, "content": {...}}
        """

        body = {
            "type": "getConfig",
            "peerid": peerInfo["peerid"],
            "version": peerInfo["version"],
            "time": peerInfo["time"],
            "content": {
                "platform": peerInfo["platform"],
            }
        }

        for prjName, prj in self.projectsList.items():
            resp = prj.getConfigForPeer(body)
            if resp:
                result.append(resp)
                
        return result

    def loadConfig(self, force):
        return configure.load(force)

prjMgr = ProjectMgr()
