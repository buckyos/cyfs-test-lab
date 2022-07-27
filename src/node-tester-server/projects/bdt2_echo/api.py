# coding=utf-8
"""
restful接口
"""
import logging
import requests

import flask
import flask_cors
from flask import request, json

from bdt2_echo import bdt2Echo

app = flask.Flask(__name__)
flask_cors.CORS(app)

"""
body: {"type": "xxxx", "peerid": "xxx", "version": "clientVersion", "time": clientTime, "content": {...}}
"""

@app.route('/<path:methodPath>', methods=['POST'])
def onRequest(methodPath):
    print(methodPath)
    resp = bdt2Echo.onRequest(methodPath, request.json)
    return json.dumps(resp)

# 注册到测试环境
def registSelf():
    registUrl = "http://bdttest.tinyappcloud.com:11000/plugin-regist"
    body = {
        "name": "bdt2_echo",
        "url": "http://127.0.0.1:11002",
        "logOn": False
    }
    headers = {'content-type': 'application/json'}
    response = requests.post(registUrl, data = json.dumps(body), headers = headers, verify=False)
    print(response)

registSelf()

if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=11002, use_reloader=False)
