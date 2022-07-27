# coding=utf-8

import os
import time
import json
import hashlib

class Crash:
    def __init__(self):
        pass
        
    def save(self, prjName, body):
        savePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crashs', time.strftime("%Y_%m_%d", time.gmtime()), prjName, body["version"], body["content"]["hash"])
        stack = json.dumps(body)
        md5 = hashlib.md5()
        md5.update(stack.encode('utf-8'))   
        filename = md5.hexdigest() + ".txt"
        fullpath = os.path.join(savePath, filename)

        file = None
        try:
            file = open(fullpath, "w")
        except:
            try:
                os.makedirs(savePath)
            except:
                pass
            file = open(fullpath, "w")

        if file:
            file.write(stack)
            file.close()

crash = Crash()
