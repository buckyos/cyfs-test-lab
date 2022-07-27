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

def macWithoutSeparator(mac):
    return mac[0:2] + mac[3:5] + mac[6:8] + mac[9:11] + mac[12:14] + mac[15:17]

class Account:
    rootFolder = ""
    loginHost = "https://obt.chainsdk.io/"
    sessions = {}
    decodeSessionIDCache = {}

    def __init__(self):
        Account.rootFolder = os.path.dirname(os.path.abspath(__file__))
 
    def sendVerifyCode(self, phoneNo, deviceID):
        params = {
            "phone": int(phoneNo),
            "type": 'login',
            "deviceid": deviceID,
            "devicetype": "PC"
        }

        status, headers, body = self.requestHttps("sendSMS", params)

        if not body:
            return -1, ""

        body = json.loads(body.decode());
        print(body)
        if body:
            if body["errcode"] == 0:
                return 0, ""
            else:
                msg = body["msg"]
                if (body["errcode"] == '160040'):
                    msg = "今日发送短信次数已达上限"
                return -1, str(body["errcode"]) + ":" + str(msg)

        return -1, ""

    def checkVerifyCode(self, phoneNo, verifyCode, deviceID):
        params = {
            "phone": int(phoneNo),
            "type": 'login',
            "deviceid": deviceID,
            "devicetype": "PC",
            "code": verifyCode
        }

        status, headers, body = self.requestHttps("checkSMS", params)

        if not body:
            return -1, "", ""

        body = json.loads(body.decode())
        print(body)
        if body:
            if body["errcode"] == 0:
                sessionID = body["token"]
                return 0, self.__encodeSessionID(sessionID), ""
            else:
                return -1, "", str(body["errcode"]) + ":" + str(body["msg"])

        return -1, "", ""
 
    def sendBindVerifyCode(self, phoneNo, deviceID, sessionID):
        params = {
            "phone": int(phoneNo),
            "type": 'bind',
            "deviceid": deviceID,
            "devicetype": "PC",
            "token": self.__decodeSessionID(sessionID)
        }

        status, headers, body = self.requestHttps("sendSMS", params)

        if not body:
            return -1, ""

        body = json.loads(body.decode());
        print(body)
        if body:
            if body["errcode"] == 0:
                return 0, ""
            else:
                msg = body["msg"]
                if (body["errcode"] == '160040'):
                    msg = "今日发送短信次数已达上限"
                return -1, str(body["errcode"]) + ":" + str(msg)

        return -1, ""

    def checkBindVerifyCode(self, phoneNo, verifyCode, deviceID, sessionID):
        params = {
            "phone": int(phoneNo),
            "type": 'bind',
            "deviceid": deviceID,
            "devicetype": "PC",
            "code": verifyCode,
            "token": self.__decodeSessionID(sessionID)
        }

        status, headers, body = self.requestHttps("checkSMS", params)

        if not body:
            return -1, "", ""

        body = json.loads(body.decode())
        print(body)
        if body:
            if body["errcode"] == 0:
                qrcode = body["qrcode"]
                bindingkey = ""
                if "bindingkey" in body:
                    bindingkey = body["bindingkey"]
                return 0, qrcode, bindingkey, ""
            else:
                return -1, "", "", str(body["errcode"]) + ":" + str(body["msg"])

        return -1, "", "", ""

    def ping(self, sessionID, deviceID):
        sessionInfo = self.__getSessionInfo(sessionID)
        now = time.time()
        if (now - sessionInfo["lastPingTime"] < 1200):
            return -1
        sessionInfo["lastPingTime"] = now

        params = {
            "deviceid": deviceID
        }

        # xx:xx:xx:xx:xx:xx MAC
        if len(sessionID) == 17 and sessionID.count(":") == 5:
            params["mac"] = sessionID
            params["deviceid"] = macWithoutSeparator(sessionID)
            params["devicetype"] = "Router"
        else:
            params["token"] = self.__decodeSessionID(sessionID)
            params["devicetype"] = "PC"

        status, headers, body = self.requestHttps("ping", params)

        if not body:
            return -1

        bodyStr = body.decode()
        print("ping", sessionID, bodyStr)
        body = json.loads(bodyStr)
        if body and body["errcode"] == 0:
            return 0
        return -1

    def queryProfit(self, sessionID, deviceID):
        params = {
            "deviceid": deviceID
        }

        # xx:xx:xx:xx:xx:xx MAC
        if len(sessionID) == 17 and sessionID.count(":") == 5:
            params["mac"] = sessionID
            params["deviceid"] = macWithoutSeparator(sessionID)
            params["devicetype"] = "Router"
        else:
            params["token"] = self.__decodeSessionID(sessionID)
            params["devicetype"] = "PC"

        status, headers, body = self.requestHttps("address", params)

        if not body:
            return -1, None, None, None, None

        body = json.loads(body.decode())
        print(body)
        if body and body["errcode"] == 0:
            totalProfit = 0
            balance = 0
            todayProfit = 0
            gctAddress = body["address"]
            return 0, totalProfit, balance, todayProfit, gctAddress

        return -1, None, None, None, None

    def checkBindingKey(self, bindingKey):
        params = {
            "bindingkey": bindingKey
        }

        body = json.loads('{"errcode": 0, "status": 0}')
        print(body)
        if body and body["errcode"] == 0:
            return 0, body["status"], ""

        return -1, 0, body["msg"]


    def checkBindingKeyOBT(self, bindingKey):
        params = {
            "bindingkey": bindingKey
        }

        status, headers, body = self.requestHttps("checkBindingKey", params)

        if not body:
            return -1, None, None, None, None

        body = json.loads(body.decode())
        print(body)
        if body and body["errcode"] == 0:
            return 0, body["status"], ""

        return -1, 0, body["msg"]

    def requestHttps(self, methodName, params):
        try:    
            body = params
            
            response = requests.post(Account.loginHost + methodName, data = body, verify=False)
            print(methodName, body, response.content, time.asctime(time.localtime()))
            response.close()
            return response.status_code, response.headers, response.content
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return e, None, None

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