import redis
import pickle
import time
import threading

# import random

import config


# redis 配置
pool = redis.ConnectionPool(host='localhost', port=6379, db=0)
r = redis.Redis(connection_pool=pool)


OFF = 'off'
ON = 'on'

# 定时任务间隔时间
TIMER = 20



def getRedisKeyName(peerid):
    key = "peerid:" + str(peerid)
    return key


class Queue:
    """
    需要限制同时在线获取GCT 的人数
    """
    def __init__(self):
        return
    def admitProfic(self, peerid):
        """
        是否允许访问队列
        由peer 客户端发起请求, 并进行校验
        直接返回当前“收益”状态
        """
        return self.isOnProfic(peerid)

    def isOnProfic(self, peerid):
        """
        检查某个peer是否正在收益队列中
        """
        keyName = getRedisKeyName(peerid)
        lastUpdateTime = r.zscore("profit", keyName)
        if lastUpdateTime:
            return True
        return False

    def setOnProfic(self, peerid):
        """
        设置 peer 为收益状态,
        设置进入收益时间(如果没有)
        """
        keyname = getRedisKeyName(peerid)
        peerStr = r.get(keyname)
        if not peerStr:
            self.recordHeartbeat(peerid, time.time())
            peerStr = r.get(keyname)
            
        peer = pickle.loads(peerStr)

        peer['on_profic'] = 1

        # 进入收益队列的时间
        now = int(time.time())
        if peer['on_profic_time'] == 0:
            peer['on_profic_time'] = now
            r.zadd("profit-duration", keyname, now)
        # print(peer)

        # 重置收益集合中该peer分数为最后一次设定时间
        r.zadd("profit", keyname, now)
        r.setex(keyname, pickle.dumps(peer), 7200)
        return

    def getWaitingIndex(self, peerid):
        """
        从全部中 筛选出不在收益队列中的
        然后 再根据waitTime来排序
        最后返回传入 peer的序号
        """
        keyname = getRedisKeyName(peerid)
        index = r.zrank("waiting", keyname)
        if index == None:
            return -1
        return index


class Heartbeat:
    def __init__(self):
        return

    def getPeers(self):
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
                # r.setex(keyname, pickle.dumps(info), 7200)
                peers.append(info)
        return peers

    def getPeersWaiting(self):
        """
        在线且 没在收益队列中
        """
        peerKeynames = r.zrange("waiting", 0, -1)
        if len(peerKeynames) == 0:
            return []
        waiting_peers = r.mget(peerKeynames)
        validPeers = []
        for peer in waiting_peers:
            if peer:
                validPeers.append(pickle.loads(peer))

        #sorted_peers = sorted(waiting_peers, key=lambda val:val['waitingTime'])
        #for index, peer in enumerate(sorted_peers):
        #    sorted_peers[index]['index'] = index
        #return sorted_peers
        return validPeers

    def getPeersOnProfic(self):
        """
        在收益队列中的peer (同时也是在线的)
        """
        peerKeynames = r.zrange("profit", 0, -1)
        if len(peerKeynames) == 0:
            return []
        on_profic_peers = r.mget(peerKeynames)
        validPeers = []
        print("getPeersOnProfic")
        for peer in on_profic_peers:
            if peer:
                validPeers.append(pickle.loads(peer))
        #peers = heartbeat.getPeers()
        #on_profic_peers = []
        #for peer in peers:
        #    if peer['on_profic'] == 1 and peer['status'] == ON:
        #        on_profic_peers.append(peer)
        return validPeers


    def recordHeartbeat(self, peerid, now):
        """
        记录peerid 心跳
        通过peer 最近的一次请求, 写入redis

        """
        # redis keyname
        keyname = getRedisKeyName(peerid)
        peerinfoStr = r.get(keyname)
        if peerinfoStr:
            peer = pickle.loads(peerinfoStr)
            peer["times"] = peer["times"] + 1

            # 兼容线上的数据
            if not 'on_profic' in peer:
                peer['on_profic'] = 0
            if not 'on_profic_time' in peer:
                peer['on_profic_time'] = 0
            if not 'on_profic_last' in peer:
                peer['on_profic_last'] = 0
            if not 'waitingTime' in peer:
                peer['waitingTime'] = now


        else:
            peer = {
                'times': 1,
                # peer 是否能够请求获得收益的接口
                'on_profic': 0,
                'on_profic_time': 0,
                'on_profic_last': 0,
                'peerid': peerid,
                'waitingTime': now,
            }


        # 更新最后访问时间
        peer['lastTime'] = now
        peer['status'] = ON

        # 记录peer 的排队时间(首次访问服务器)
        # peer['waitingTime'] = now
        # peer['waitingTime'] = random.randint(1520000000, int(time.time()))

        # 写入redis 更新peer状态
        r.setex(keyname, pickle.dumps(peer), 7200)

        #更新收益和排队集合分数
        if peer['on_profic'] == 1:
            r.zadd("profit", keyname, now)
        else:
            r.zadd("waiting", keyname, peer['waitingTime'])

# =================================================================
# sortSet1: timeout测试参考集合
# sortSet2: 另外一个收益集合，sortSet1中淘汰后，要从sortSet2中相应清除
def outPeersToWaiting(outtime, now, sortSet1, sortSet2):
    # 从收益集合找到超时peer加入排队集合
    profitPeers = r.zrange(sortSet1, 0, 100, desc=False, withscores=True)
    waitingPeerKeys = []
    lastOfflineIndex = -1
    for i in range(0, len(profitPeers)):
        if now - profitPeers[i][1] > outtime:
            # 排队
            lastOfflineIndex = i
            waitingPeerKeys.append(profitPeers[i][0])
        else:
            lastOfflineIndex = i - 1
            break

    if lastOfflineIndex < 0:
        return

    waitingPeers = r.mget(waitingPeerKeys)
    updateWaitingPeerKeys = []
    i = 0
    for peerInfoStr in waitingPeers:
        if peerInfoStr:
            peerInfo = pickle.loads(peerInfoStr)
            last = now - peerInfo['on_profic_time']
            peerInfo['on_profic'] = 0
            peerInfo['waitingTime'] = now
            peerInfo['on_profic_last'] = last
            r.setex(waitingPeerKeys[i], pickle.dumps(peerInfo), 7200)
            updateWaitingPeerKeys.append((waitingPeerKeys[i], now))
        i = i + 1

    for keyScore in updateWaitingPeerKeys:
        r.zadd("waiting", keyScore[0], keyScore[1])

    if lastOfflineIndex >= 0:
        r.zremrangebyrank(sortSet1, 0, lastOfflineIndex)
    
    for key in waitingPeerKeys:
        r.zrem(sortSet2, key)

def outOfflinePeersToWaiting(config, now):
    # 从收益集合找到超时peer加入排队集合
    OFF_TIME = config['peer_off_time']
    outPeersToWaiting(OFF_TIME, now, "profit", "profit-duration")

# 淘汰持久挂机节点，给排队节点制造机会，并且覆盖更多节点，更接近真实环境，避免过多稳定服务器在线
def outHangupPeersToWaiting(config, now):
    # 从收益集合找到过度挂机peer加入排队集合
    HANGUP_TIME = 24*3600
    outPeersToWaiting(HANGUP_TIME, now, "profit-duration", "profit")

def addWaitingPeersToProfit(config, now):
    # 从排队集合找到靠前的在线peer，加入收益集合
    OFF_TIME = config['peer_off_time']
    ON_PROFIC_LIMIT = config['on_profic_limit']

    leftCount = ON_PROFIC_LIMIT - r.zcard("profit")
    if leftCount <= 0:
        return leftCount

    profitPeerKeys = r.zrange("waiting", 0, min(r.zcard("waiting"), 500))
    if len(profitPeerKeys) == 0:
        return leftCount

    profitPeers = r.mget(profitPeerKeys)
    updateProfitPeerKeys = []
    removePeerKeys = []
    i = 0
    for peerInfoStr in profitPeers:
        if peerInfoStr:
            peerInfo = pickle.loads(peerInfoStr)
            diff = now - peerInfo["lastTime"]
            if diff < OFF_TIME:
                peerInfo['on_profic'] = 1
                peerInfo['on_profic_time'] = now
                r.setex(profitPeerKeys[i], pickle.dumps(peerInfo), 7200)
                removePeerKeys.append(profitPeerKeys[i])
                updateProfitPeerKeys.append((profitPeerKeys[i], peerInfo["lastTime"], peerInfo["on_profic_time"]))
                if (len(updateProfitPeerKeys) >= leftCount):
                    break
            elif diff >= 7200:
                r.delete(profitPeerKeys[i])
                r.zrem("waiting", profitPeerKeys[i])
        else:
            removePeerKeys.append(profitPeerKeys[i])
        i = i + 1

    for keyScore in updateProfitPeerKeys:
        r.zadd("profit", keyScore[0], keyScore[1])
        r.zadd("profit-duration", keyScore[0], keyScore[2])
        leftCount = leftCount - 1

    for key in removePeerKeys:
        r.zrem("waiting", key)
    return leftCount

nextTimerInterval = TIMER

def task():
    '''
    定时任务 检查peer 心跳
    '''

    # 读取 离线判定时间
    rc_value = config.getConfig()
    # keys = r.keys('peerid*')
    now = time.time()

    outOfflinePeersToWaiting(rc_value, now)
    outHangupPeersToWaiting(rc_value, now)
    leftCount = addWaitingPeersToProfit(rc_value, now)
    print("queue: leftCount = ", leftCount)
    if leftCount > 0:
        nextTimerInterval = 10
    else:
        nextTimerInterval = TIMER

    # 需要继续调起任务
    start()

def start():
    t = threading.Timer(nextTimerInterval, task)
    t.start()
start()

heartbeat = Heartbeat()
queue = Queue()




