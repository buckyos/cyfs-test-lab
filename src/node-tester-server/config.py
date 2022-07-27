"""
管理配置文件

初始化, 先检查配置文件是否存在
不存在则生成

"""

import os
import json


RC_INIT = r'''
{
    "peer_off_time": 60000,
    "on_profic_limit": 1024,
    "use_profic_limit": 0
}
'''

root = os.path.dirname(os.path.abspath(__file__))
rc = root + '/rc.json'

def getConfig():

    if not os.path.exists(rc):
        f = open(rc, 'w')
        f.write(RC_INIT)
        f.close

    f = open(rc, 'r')
    rc_value = json.loads(f.read() + '')
    f.close()

    return rc_value


def saveConfig(data):
    if not os.path.exists(rc):
        return False, '文件不存在'

    f = open(rc, 'w')
    f.write(json.dumps(data, indent=4))

    return True, '修改成功'




