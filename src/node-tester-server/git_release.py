import logging
import os
import subprocess
from flask import request, json
import re
import threading
import time
import json as json2
from hashlib import md5



# get the project root dir
current_dir = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(current_dir, '../'))


KEY = '0cf4d543e097254a53859afe12fc84310bb486dd12f87af433854ebe8ced7574'

def restart():
    time.sleep(3)
    print('restart')
    subprocess.call(['./restart.sh'], cwd=root)


def md5ZipFile(file_path):
    m = md5()
    f = open(file_path, "rb")
    data = f.read()
    m.update(data)

    return m.hexdigest()


class Git:
    def __init__(self):
        return


    def release(self, headers, body):
        # check the git event in header
        event = headers.get('X-Gogs-Event')
        if  event != 'release':
            return json.dumps({"result": 601, "errorMsg": "git 事件错误"})

        # check the Signature in header
        # signature = headers.get('X-Gogs-Signature')
        # if signature != KEY:
        #     return json.dumps({"result": 602, "errorMsg": "签名错误"})

        # check the release tag name in request body
        tag_name = body['release']['tag_name']
        if tag_name == '':
            return json.dumps({"result": 603, "errorMsg": "缺少git release版本信息"})

        # update the project
        # git pull the 'tag name' version
        # 发布的时候不再保留在服务器上的更改
        subprocess.call(['git','checkout', '.'], cwd=root)
        subprocess.call(['git','pull', '--force', 'origin', tag_name], cwd=root)

        # update the p2p code by git submodule
        subprocess.call(['git','submodule', 'update'], cwd=root)

        # copy the p2p code to correct dir
        #subprocess.call(['./projects/bdt_echo/copy.sh'], cwd=root)


        # update the version infomation (in the config file)

        # update the p2p code config
        p2p_templte = '{"version": "%s"}'
        f = open('../projects/bdt_echo/config.json', 'w')
        f.write(p2p_templte % (tag_name))
        f.close()

        # zip the p2p code
        # and then move the zip file to the correct dir
        subprocess.call(['./zip.sh'], cwd=root)

        # update the server config
        f = open('./config.json', 'r')
        config = f.read()
        f.close()

        config_json = json2.loads(config + '')
        config_json['projectsList'][0]['packageInfo']['version'] = tag_name

        # count a md5 value of bdt_echo.zip
        md5_value = md5ZipFile('../update/bdt_echo.zip')
        config_json['projectsList'][0]['packageInfo']['MD5'] = md5_value

        # update the server/config's  version and md5
        f = open('./config.json', 'w')
        f.write(json2.dumps(config_json, indent=4))
        f.close()


        # sync and delay 3s to restart  python(api.py) process
        t = threading.Thread(target=restart)
        t.start()

        return json.dumps({"result": 0, "errorMsg": "成功完成发布"})

git = Git()
