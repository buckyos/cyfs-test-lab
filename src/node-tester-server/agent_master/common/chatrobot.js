const {blog} = require('./base.js');
const {request} = require('./network.js');
const Config = require('./config.js');

class ChatRobot {
    static async sendMsg(title, text) {
        ChatRobot.addMessage(Config.SystemRobotAPI, {
            'msgtype': 'markdown',
            'markdown': {
                title,
                text
            },
            'at': {
                'isAtAll': false
            }
        });
    }
}

ChatRobot._queue = [];

ChatRobot.clearQueue = async function() {
    if (ChatRobot._isQueueLocked || ChatRobot._queue.length === 0) return;
    ChatRobot._isQueueLocked = true;
    
    let queue = ChatRobot._queue;
    while(queue.length) {
        let dingMsg = queue.shift();
        let [url, msg] = dingMsg;
        let [err, resp] = await request('POST', url, msg);
        if (err || resp.errcode !== 0) {
            blog.error(`POST ${url} with data ${JSON.stringify(msg)} failed: ${JSON.stringify(Object.assign({err}, resp))}`);
        }
    }

    ChatRobot._isQueueLocked = false;
};

ChatRobot.addMessage = function (url, msg) {
    ChatRobot._queue.push([url, msg]);
    ChatRobot.clearQueue().catch(err => {
        blog.error(err.stack);
        ChatRobot._isQueueLocked = false;
    });
};


module.exports = ChatRobot;


async function test() {
    const Test = await require('../common/test.js');
    Test.init();
}

if (require.main === module) {
    test();
    ChatRobot.sendMsg('每日活跃设备', '在线 xx 台，总积分 xxx');
}


