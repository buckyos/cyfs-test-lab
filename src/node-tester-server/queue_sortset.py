import redis
import pickle
import time
import threading

import config

OFF = 'off'
ON = 'on'

# 读取 离线判定时间
OFF_TIME = 900
now = time.time()

# 用set和sort-set加速排队信息

# redis 配置
pool = redis.ConnectionPool(host='localhost', port=6379, db=0)
r = redis.Redis(connection_pool=pool)

def getRedisKeyName(peerid):
    key = "peerid:" + str(peerid)
    return key

def getPeers():
    """
    从redis获取全部peer的信息
    以此来作为心跳信息
    """
    keys = r.keys('peerid*')
    peers = []
    for key in keys:
        keyname = str(key, 'utf-8')
        peerStr = r.get(keyname)
        if peerStr:
            info = pickle.loads(peerStr)
            # 生成随机访问时间
            # info['lastTime'] = random.randint(1520000000, int(time.time()))
            # r.set(keyname, pickle.dumps(info))
            peers.append(info)
    return peers

allPeers = getPeers()

for info in allPeers:
    keyname = getRedisKeyName(info['peerid'])

    # 离线时间
    diff = now - info["lastTime"]

    # 离线peer
    if info["status"] == OFF:
        # 如果离线超过 7200 删除掉
        # print(diff, diff> 7200)
        if diff < 7200:
            # 放入“排队”集合
            r.zadd("waiting", keyname, info["waitingTime"])
        continue

    # 没到判定的离线时间,不需要处理
    if diff <= OFF_TIME:
        # 放入“收益”集合
        r.zadd("profit", keyname, info["lastTime"])
        continue

    # 放入排队集合
    r.zadd("waiting", keyname, time.time())
