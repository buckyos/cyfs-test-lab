# coding=utf-8

import os
import sys
import time
import json
import http.client, ssl, socket
import requests
import hashlib
import base64
from pyDes import *

class Account:
    rootFolder = ""
    loginHost = "https://api.hiwifi.com/call"
    APPID = 200020
    SECRET = "80d7e38873865cc7877469afba86bce3"
    sessions = {}
    decodeSessionIDCache = {}

    def __init__(self):
        Account.rootFolder = os.path.dirname(os.path.abspath(__file__))
 
    def sendVerifyCode(self, phoneNo, peerid):
        params = {
            "mobile": int(phoneNo),
            "action_module": "findpwd",
            "app_type": "bky_win",
            "client_type": "bky_win"
        }

        satus, headers, body = self.requestHttps("ucore.api_v1.sms.SendSmsMobileCodeByMobile", params)

        if not body:
            return -1, ""

        body = json.loads(body.decode());
        print(body)
        if body:
            if body["code"] == 0 and body["trans_code"] == 0:
                return 0, ""
            else:
                return -1, str(body["code"]) + ":" + str(body["trans_code"]) + ":" + str(body["trans_msg"])

        return -1, ""

    def checkVerifyCode(self, phoneNo, verifyCode, peerid):
        params = {
            "mobile": int(phoneNo),
            "code": int(verifyCode)
        }

        satus, headers, body = self.requestHttps("ucore.api_v1.user.GetSessionIdByMobileCode", params)

        if not body:
            return -1, "", ""

        body = json.loads(body.decode())
        print(body)
        if body:
            if body["code"] == 0 and body["trans_code"] == 0:
                transData = body["trans_data"]
                sessionID = transData["sessionid"]
                return 0, self.__encodeSessionID(sessionID), ""
            else:
                return -1, "", str(body["code"]) + ":" + str(body["trans_code"]) + ":" + str(body["trans_msg"])

        return -1, "", ""

    def updateGTCAddress(self, sessionID, address):
        params = {
            "address": address
        }

        # xx:xx:xx:xx:xx:xx MAC
        if len(sessionID) == 17 and sessionID.count(":") == 5:
            params["mac"] = sessionID
        else:
            params["sessionid"] = self.__decodeSessionID(sessionID)

        satus, headers, body = self.requestHttps("data.api_v1.bky.SetAddress", params)

        if not body:
            return -1, ""

        print(params)
        body = json.loads(body.decode());
        print(body)
        if body:
            if body["code"] == 0 and body["trans_code"] == 0:
                return 0, ""
            else:
                return -1, str(body["code"]) + ":" + str(body["trans_code"]) + ":" + str(body["trans_msg"])

        return -1, ""

    def ping(self, sessionID, peerid):
        sessionInfo = self.__getSessionInfo(sessionID)
        now = time.time()
        if (now - sessionInfo["lastPingTime"] < 1200):
            return -1
        sessionInfo["lastPingTime"] = now

        params = {
        }

        # xx:xx:xx:xx:xx:xx MAC
        if len(sessionID) == 17 and sessionID.count(":") == 5:
            params["mac"] = sessionID
        else:
            params["sessionid"] = self.__decodeSessionID(sessionID)

        satus, headers, body = self.requestHttps("data.api_v1.bky.Ping", params)

        if not body:
            return -1

        bodyStr = body.decode()
        print("ping", sessionID, bodyStr)
        body = json.loads(bodyStr)
        if body and body["code"] == 0 and body["trans_code"] == 0:
            return 0
        return -1

    def queryProfit(self, sessionID, peerid):
        params = {
        }

        # xx:xx:xx:xx:xx:xx MAC
        if len(sessionID) == 17 and sessionID.count(":") == 5:
            params["mac"] = sessionID
        else:
            params["sessionid"] = self.__decodeSessionID(sessionID)

        satus, headers, body = self.requestHttps("data.api_v1.bky.Info", params)

        if not body:
            return -1, None, None, None, None

        body = json.loads(body.decode())
        print(body)
        if body and body["code"] == 0 and body["trans_code"] == 0:
            transData = body["trans_data"]
            totalProfit = transData["num"]
            balance = transData["balance"]
            todayProfit = transData["estimated"]
            gctAddress = ""
            if "gct_address" in transData:
                gctAddress = transData["gct_address"]
            return 0, totalProfit, balance, todayProfit, gctAddress

        return -1, None, None, None, None

    def requestHttps(self, methodName, params):
        try:    
            body = {
                "method": methodName,
                "app_id": self.APPID,
                "timestamp": int(time.time()),
                "params": json.dumps(params),
                "verify": ""
            }

            verifyMD5 = hashlib.md5()
            secretStr = str(self.APPID) + Account.SECRET + methodName + body["params"] + str(body["timestamp"])
            print(secretStr)
            verifyMD5.update(secretStr.encode('utf-8'))   
            body["verify"] = verifyMD5.hexdigest()
            print(body["verify"])
                
            response = requests.post(Account.loginHost, data = body, verify=False)
            print(response, response.content)
            return response.status_code, response.headers, response.content
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return e

    def __encodeSessionID(self, sessionID):
        encryptor = des("bky-bdtx", padmode = PAD_PKCS5)
        encodedSessionID = base64.b64encode(encryptor.encrypt(sessionID))
        return str(encodedSessionID, "utf-8")

    def __decodeSessionID(self, encodedSessionID):
        sessionID = self.decodeSessionIDCache.get(encodedSessionID, None)
        if sessionID:
            return sessionID

        decryptor = des("bky-bdtx", padmode = PAD_PKCS5)
        sessionID = decryptor.decrypt(base64.b64decode(encodedSessionID.encode('utf8')))
        sessionID = str(sessionID, "utf-8")
        self.decodeSessionIDCache[encodedSessionID] = sessionID
        return sessionID

    def __getSessionInfo(self, sessionID):
        sessionInfo = self.sessions.get(sessionID, None)
        if sessionInfo == None:
            sessionInfo = {
                "lastPingTime": 0
            }
            self.sessions[sessionID] = sessionInfo
            return sessionInfo
        else:
            return sessionInfo

account = Account()

params={
    "token":"2plugin.buckyos|O5l1jy6BtwXXfECh|D4EE0760E508|1548750733|f460afd57fa94ad1cfd9421ba61e1e8fe4eac7d6"
    }
account.requestHttps("api_v1.bky.exchange", params)
