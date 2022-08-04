# coding=utf-8
"""
restful接口
"""
import logging
import hashlib

import flask
import flask_cors
from flask import request, json

import time

import session

import peer_mgr
from peer_mgr import peerMgr

import account
account = account.account

import git_release
from heartbeat import heartbeat
import config

import upload
from upload import uploader

from crash import crash as crashDump

from project_mgr import prjMgr

app = flask.Flask(__name__)
flask_cors.CORS(app)

HTTP_FILE_SERVER = 'http://192.168.100.254/';
# HTTP_FILE_SERVER = 'http://106.75.175.123/';

def getClientIP(request):
    ip = '127.0.0.1'
    if 'HTTP_X_FORWARDED_FOR' in request.environ:
        ip = request.environ['HTTP_X_FORWARDED_FOR']
    return ip

def getSessionID(request):
    content = request.json["content"]
    if "platform" in content and content["platform"] == "hiwifi":
        # 有peerid就用peerid里取mac
        if "peerid" in request.json and len(request.json["peerid"]) >= 17:
            return request.json["peerid"][0:17]
        elif "mac" in content:
            # 没有peerid就必须在content里带mac
            return content["mac"]
    return content["sessionID"]

"""
body: {"type": "xxxx", "peerid": "xxx", "version": "clientVersion", "time": clientTime, "content": {...}}
"""

@app.route('/update', methods=['POST'])
def update():
    """
    查询版本更新
    content: {"sessionID": encodedSessionID}
    resp: {
        "versionInfo": {
            "newPackage": {"version": "a.b", "host": "download host", "port": DOWNLOAD_PORT, "path": "/download path", "type": "update/install"},
            "projectsList": [
                {
                    "name": "test case name",
                    "packageInfo": {"version": "c.d", "host": "case download host", "port": CASE_DOWNLOAD_PORT, "path": "/case download path"},
                    "params": CASE_STARTUP_PARAMS
                }
            ]
        }
        "profit": {
            "totalProfit": 总收益
            "balance": 可提现
            "todayProfit": 预计今日收益
            "gctAddress": GCT地址
        }
    }
    """

    ip = getClientIP(request)
    request.json["ip"] = ip

    # peer 访问/update  也记录记录心跳
    peerid = request.json["peerid"]
    now = time.time()
    heartbeat.recordHeartbeat(peerid, now)
    sessionID = getSessionID(request)
    deviceID = sessionID

    if "deviceID" in request.json["content"]:
        deviceID = request.json["content"]["deviceID"]

    clientInfo = {
        "version": request.json["version"],
        "peerid": request.json["peerid"],
        "sessionID": getSessionID(request),
        "deviceID": deviceID,
        "ip": ip,
        "time": request.json["time"]
    }

    print("update", clientInfo, time.asctime(time.localtime()))

    clientInfo["platform"] = "win"
    if "platform" in request.json["content"]:
        clientInfo["platform"] = request.json["content"]["platform"]
    updateInfo = peerMgr.update(clientInfo, False)
    return json.dumps(updateInfo)

@app.route('/login', methods=['POST'])
def login():
    """
    登录后台面板
    set-cookie {session: xxx}
    """
    data = request.get_json()
    return session.session.login(data)

@app.route('/check-auth', methods=['POST'])
def checkAuth():
    """
    检查cookie的登录态是否有效
    """
    s = request.cookies.get('session')

    if session.session.check(s):
        return json.dumps({"errcode": 0})
    else:
        return session.session.delete()

@app.route('/get-peer-heartbeat', methods=['GET'])
def getPeerHeartbeat():
    """
    全部peer节点的信息
    """
    data = heartbeat.getPeers()
    return json.dumps({"errcode": 0, "data": data})

@app.route('/get-peer-profic', methods=['GET'])
def getPeerProfic():
    """
    所有在收益队列中的peer
    """
    data = heartbeat.getPeersOnProfic()
    return json.dumps({"errcode": 0, "data": data})

@app.route('/get-peer-waiting', methods=['GET'])
def getPeerWaiting():
    """
    所有在等待进入收益队列的peer
    """
    data = heartbeat.getPeersWaiting()
    return json.dumps({"errcode": 0, "data": data})

# @app.route('/get-offtime', methods=['GET'])
# def getOffTime():
#     time = OFF_TIME
#     return json.dumps({"errcode": 0, "data": time})

@app.route('/get-rc', methods=['GET'])
def getConfigValue():
    data = config.getConfig()
    print(data)
    return json.dumps({"errcode": 0, "data": data})

@app.route('/save-rc', methods=['PUT'])
def saveConfigValue():
    data = request.get_json()
    is_ok = config.saveConfig(data)
    return json.dumps({"errcode": 0, "msg": "修改成功"})

@app.route('/git-release', methods=['POST'])
def gitRelease():
    """
    git 发布时触发 git webhook 并发送post请求到该接口, 该接口处理以下几步逻辑:
    1 更新服务器上的 node_tester项目代码,
    2 更新blockchain相关的代码,
    3 更改配置文件上的版本信息,
    4 并将提供给用户下载的部分打成一个zip包
    5 重启nodejs(通过pm2) 和python process
    """
    return git_release.git.release(request.headers, request.get_json())

@app.route('/sendVerifyCode', methods=['POST'])
def sendVerifyCode():
    """
    发送验证码
    content: {
        "phoneNo": 137...
        "deviceID": 'xxx'
    }
    resp: {
        "result": -1(fail)/0(succ),
        "errorMsg": "eee"
    }
    """
    logging.debug(request.json)

    content = request.json["content"]
    if not "deviceID" in content:
        return json.dumps({"result": -1, "errorMsg": "请到活动页安装更新版本."})

    phoneNo = content['phoneNo']
    deviceID = content["deviceID"]

    result, errorMsg = account.sendVerifyCode(phoneNo, deviceID)
    return json.dumps({"result": result, "errorMsg": errorMsg})

@app.route('/checkVerifyCode', methods=['POST'])
def checkVerifyCode():
    """
    校验验证码
    content: {
        "phoneNo": 137...
        "deviceID": 'xxx'
        "verifyCode": code
    }
    resp: {
        "result": -1(fail)/0(succ),
        "errorMsg": "eee",
        "sessionID": "session id"
    }
    """
    logging.debug(request.json)

    content = request.json["content"];
    if not "deviceID" in content:
        return json.dumps({"result": -1, "errorMsg": "请到活动页安装更新版本."})

    phoneNo = content['phoneNo']
    deviceID = content["deviceID"]
    verifyCode = content["verifyCode"]

    result, sessionID, errorMsg = account.checkVerifyCode(phoneNo, verifyCode, deviceID)
    return json.dumps({"result": result, "sessionID": sessionID, "errorMsg": errorMsg})

@app.route('/sendBindVerifyCode', methods=['POST'])
def sendBindVerifyCode():
    """
    发送绑定验证码
    content: {
        "phoneNo": 137...
        "deviceID": 'xxx'
        "sessionID": 'yyyyy'
    }
    resp: {
        "result": -1(fail)/0(succ),
        "errorMsg": "eee"
    }
    """
    logging.debug(request.json)

    content = request.json["content"]
    if not "deviceID" in content:
        return json.dumps({"result": -1, "errorMsg": "请到活动页安装更新版本."})

    phoneNo = content['phoneNo']
    deviceID = content["deviceID"]

    result, errorMsg = account.sendBindVerifyCode(phoneNo, deviceID, content['sessionID'])
    return json.dumps({"result": result, "errorMsg": errorMsg})

@app.route('/checkBindVerifyCode', methods=['POST'])
def checkBindVerifyCode():
    """
    校验验证码
    content: {
        "phoneNo": 137...
        "deviceID": 'xxx'
        "sessionID": 'yyyyy'
        "verifyCode": code
    }
    resp: {
        "result": -1(fail)/0(succ),
        "sessionID": "session id"
    }
    """
    logging.debug(request.json)

    content = request.json["content"];
    if not "deviceID" in content:
        return json.dumps({"result": -1, "errorMsg": "请到活动页安装更新版本."})

    phoneNo = content['phoneNo']
    deviceID = content["deviceID"]
    verifyCode = content["verifyCode"]
    sessionID = content['sessionID']

    result, qrcode, bindingkey, errorMsg = account.checkBindVerifyCode(phoneNo, verifyCode, deviceID, sessionID)
    return json.dumps({"result": result, "qrcode": qrcode, "bindingkey": bindingkey, "errorMsg": errorMsg})

@app.route('/updateGTCAddress', methods=['POST'])
def updateGTCAddress():
    """
    发送验证码
    content: {
        "sessionID": encodedSessionID
        "address": GTCAddress
    }
    resp: -1(fail)/0(succ)
    """
    logging.debug(request.json)
    print(request.json)

    return json.dumps({"result": -1, "errorMsg": "请到活动页安装更新版本."})

    #content = request.json["content"];
 
    #result, errorMsg = account.updateGTCAddress(getSessionID(request), content["address"])
    #if result == 0:
    #    peerMgr.updatePeerForSessionID(getSessionID(request))
    #return json.dumps({"result": result, "errorMsg": errorMsg})

@app.route('/checkBindingKey', methods=['POST'])
def checkBindingKey():
    """
    发送验证码
    content: {
        "bindingKey": 'xxxx'
    }
    resp: -1(fail)/0(succ)
    """
    logging.debug(request.json)
    print(request.json)

    content = request.json["content"];

    result, status, errorMsg = account.checkBindingKey(content["bindingKey"])
    return json.dumps({"result": result, "status": status, "errorMsg": errorMsg})

@app.route('/crash', methods=['POST'])
def crash():
    print(request.json)
    return json.dumps({"result": 0});


"""
    下面是 “bdt-echo 测试用例”
    bdt 日志上报接口, 以peer 连接类型(状态) 来划分
"""
from bdt_echo import*

@app.route('/queryCmd', methods=['POST'])
def BDTEcho_queryCmd():
    """
    content: {}
    resp: [COMMAND]
    COMMAND: {
        "type": "cmdType",
        "params": "cmd params"
    }

    type = "startSN":
    params = ""

    type = "connect":
    params = {"remotePeerID": "peerid"}
    """

    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)

    cmd = bdtEcho.queryCmd(request.json)
    return json.dumps(cmd)

@app.route('/natType', methods=['POST'])
def BDTEcho_natType():
    """
    content: {}
    resp: [COMMAND]
    COMMAND: {
        "type": "natType",
        "params": "cmd params"
    }
    """

    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)

    resp = bdtEcho.natType(request.json)
    return json.dumps(resp)

@app.route('/bdtEcho.crash', methods=['POST'])
def BDTEcho_crash():
    """
    content: {"stack": "crashed stack"}
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.onCrash(request.json)
    return json.dumps(resp)

@app.route('/sn-online', methods=['POST'])
def BDTEcho_sn_online():
    """
    content: {"peerid": "SN peerid"}
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.SNOnline(request.json)
    return json.dumps(resp)

@app.route('/connect-begin', methods=['POST'])
def BDTEcho_connect_begin():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectBegin(request.json)
    return json.dumps(resp)

@app.route('/acceptor-listen', methods=['POST'])
def BDTEcho_acceptor_listen():
    """
    content: {
        "peerid": "listener peerid",
        "vport": "listen on vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.acceptorListen(request.json)
    return json.dumps(resp)

@app.route('/connect-suc', methods=['POST'])
def BDTEcho_connect_suc():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport",
        "detail": {...}
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectSucc(request.json)
    return json.dumps(resp)

@app.route('/connect-echo-error', methods=['POST'])
def BDTEcho_connect_echo_error():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectEchoError(request.json)
    return json.dumps(resp)

@app.route('/connect-echo-error-V2', methods=['POST'])
def BDTEcho_connect_echo_error_V2():
    BDTEcho_connect_echo_error()
    
@app.route('/connect-close', methods=['POST'])
def BDTEcho_connect_close():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectClose(request.json)
    return json.dumps(resp)

@app.route('/connect-error', methods=['POST'])
def BDTEcho_connect_error():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport",
        "error": error-code,
        "detail": {...}
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectError(request.json)
    return json.dumps(resp)

@app.route('/connect-suc-accept', methods=['POST'])
def BDTEcho_connect_suc_accept():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectSuccAccept(request.json)
    return json.dumps(resp)

@app.route('/connect-accept', methods=['POST'])
def BDTEcho_connect_accept():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectAccept(request.json)
    return json.dumps(resp)

@app.route('/connect-error-accept', methods=['POST'])
def BDTEcho_connect_error_accept():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport",
        "error": error-code
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectErrorAccept(request.json)
    return json.dumps(resp)

@app.route('/connect-close-accept', methods=['POST'])
def BDTEcho_connect_close_accept():
    """
    content: {
        "from": "source peerid",
        "to": "remote peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.connectCloseAccept(request.json)
    return json.dumps(resp)

@app.route('/acceptor-close', methods=['POST'])
def BDTEcho_acceptor_close():
    """
    content: {
        "peerid": "listener peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)
    resp = bdtEcho.acceptorClose(request.json)
    return json.dumps(resp)

@app.route('/acceptor-error', methods=['POST'])
def BDTEcho_acceptor_error():
    """
    content: {
        "peerid": "listener peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    peerMgr.peerPulse(peerid)
    bdtEcho.peerPulse(peerid, request.json)

    resp = bdtEcho.acceptorError(request.json)
    return json.dumps(resp)

@app.route('/tcpdetect', methods=['POST'])
def BDTEcho_tcp_detect():
    """
    content: {
        "peerid": "listener peerid",
        "vport": "target vport"
        }
    resp: {}
    """
    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    bdtEcho.peerPulse(peerid, request.json)

    return json.dumps(resp)

"""
    上面是 “bdt-echo 测试用例”
"""

"""
    注册一个测试插件
"""
@app.route('/plugin-regist', methods=['POST'])
def Plugin_regist():
    """
    body: {
        "name": "pulgin name",
        "deadline": time, # 截止有效期
        "url": "request url", # 设定此参数，测试系统将转发客户端请求到该地址
        "packageInfo": {}, # 包信息，包括（包名，版本号，更新地址，MD5等）
        "params": {}, # 包启动命令行参数
        "whitelist": [], # 白名单
        "blacklist": [], # 黑名单
        "logOn": boolean # 是否记录客户端访问日志
        }
    resp: {}
    """
    ## print("plugin registed %s" % "")
    ip = getClientIP(request)
    request.json["ip"] = ip

    resp = prjMgr.registProject(request.json)
    return json.dumps(resp)

@app.route('/uploadFile/<path:savePath>', methods=['POST'])
def uploadFile(savePath):
    print('uploadFile,savePath:%s' % (savePath))

    if request.data:
        #print('uploadFile.data,savePath:%s,size:%d' % (savePath, len(request.data)))
        realPath = uploader.save(savePath, request.data)
        if realPath:
            resp = {
                "url": HTTP_FILE_SERVER + realPath,
                "md5": ''
            }
            md5 = hashlib.md5()
            md5.update(request.data)   
            resp["md5"] = md5.hexdigest()

            print('uploadFile.url:%s,md5:%s' % (resp["url"], resp["md5"]))
            return json.dumps(resp)

    elif request.files:
        #print('uploadFile.form,savePath:%s,filecount:%d' % (savePath, len(request.files)))
        f = request.files['file']
        if f:
            realPath = uploader.realPath(os.path.join(savePath, f.filename))
            #print('uploadFile.form,realPath:%s,filename:%s' % (realPath, f.filename))
            if realPath:
                try:
                    os.makedirs(os.path.dirname(realPath[0]))
                except:
                    pass

                #try:
                f.save(realPath[0])
                resp = {
                    "url": HTTP_FILE_SERVER + realPath[1],
                    "md5": ''
                }
                md5 = hashlib.md5()
                f.seek(0)
                md5.update(f.read())   
                resp["md5"] = md5.hexdigest()
                
                print('uploadFile.url:%s,md5:%s' % (resp["url"], resp["md5"]))

                return json.dumps(resp);
                #except:
                #    pass

    return json.dumps({})


#转发给测试项目
#@app.route('/chainsdk/queryCmd', methods=['POST'])
#def chainsdk_queryCmd():
#    print('/chainsdk/queryCmd')
@app.route('/<string:prjName>/<path:methodPath>', methods=['POST'])
def ProjectMethod(prjName, methodPath):
    ## print('name:%s,methodpath:%s' % (prjName, methodPath))

    peerid = request.json["peerid"]
    peerMgr.peerPulse(peerid)

    ip = getClientIP(request)
    request.json["ip"] = ip
    peerid = request.json["peerid"]

    # 先保存一份
    pa = methodPath.split('/')
    if pa[0] == 'crash':
        crashDump.save(prjName, request.json)

    prj = prjMgr.getProject(prjName)
    if prj:
        return prj.request(methodPath, request.json) or json.dumps(None)

if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=11000, use_reloader=False)
