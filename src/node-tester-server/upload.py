# coding=utf-8

import os
import time

class Uploader:
    config = {}

    def __init__(self):
        self._rootFolder = "/opt/http_downloader/"

    def realPath(self, savePath):
        realPath = os.path.splitext(savePath)
        # root/savePath-data.ext
        if len(realPath) == 1 or len(realPath[1]) == 0:
            dirNames = os.path.split(savePath)
            n = len(dirNames)
            for i in range(n):
                if len(dirNames[n - i - 1]) > 0:
                    if i > 0:
                        ext = os.path.splitext(dirNames[n - i - 1])
                        realPath = [];
                        realPath.append(os.path.join(savePath, ext[0]))
                        realPath.append(ext[1])

        subPath = realPath[0] + "-" + time.strftime("%Y_%m_%d_%H%M%S", time.gmtime()) + realPath[1]
        realPath = os.path.join(self._rootFolder, subPath)
        return (realPath, subPath)

    def save(self, savePath, data):
        realPath = self.realPath(savePath)
        f = None
        try:
            f = open(realPath[0], "wb")
        except:
            try:
                os.makedirs(os.path.dirname(realPath[0]))
            except:
                pass
            f = open(realPath[0], "wb")

        if f:
            f.write(data)
            f.close()
            return realPath[1]
        
        return None

uploader = Uploader()
