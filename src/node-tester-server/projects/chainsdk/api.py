# coding=utf-8
"""
restful接口
"""
import logging
import requests

import flask
import flask_cors
from flask import request, json

from blockchain import chainsdk

app = flask.Flask(__name__)
flask_cors.CORS(app)

"""
body: {"type": "xxxx", "peerid": "xxx", "version": "clientVersion", "time": clientTime, "content": {...}}
"""

@app.route('/<path:methodPath>', methods=['POST'])
def onRequest(methodPath):
    resp = chainsdk.onRequest(methodPath, request.json)
    return json.dumps(resp)

# 注册到测试环境
def registSelf():
    registUrl = "http://bdttest.tinyappcloud.com:11000/plugin-regist"
    body = {
        "name": "chainsdk",
        "url": "http://127.0.0.1:11001",
        "logOn": False
    }
    headers = {'content-type': 'application/json'}
    response = requests.post(registUrl, data = json.dumps(body), headers = headers, verify=False)
    print(response)

registSelf()

if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=11001, use_reloader=False)
