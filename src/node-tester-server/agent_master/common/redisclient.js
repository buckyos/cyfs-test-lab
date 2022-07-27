const redis = require('redis');
const Config = require('./config');
const { blog, ErrorCode } = require('../common/base.js');
const { promisify } = require('util');


const _redis = {
    client: null,

    getAsync: null,

    async init() {
        var { port, host, password } = Config.redis;

        blog.debug('init redis: ', Config.redis);

        let client = redis.createClient(port, host, {
            retry_strategy: function(options) {
                if (options.total_retry_time > 1000 * 60 * 60) {
                    return new Error('Retry time exhausted');
                }
                if (options.attempt > 10) {
                    return undefined;
                }

                return Math.min(options.attempt * 100, 3000);
            },
            detect_buffers: true
        });
        this.client = client;

        // create promise get method.  e.g await getAsync('key')
        this.getAsync = promisify(client.get).bind(client);

        if (password) {
            let [err] = await await new Promise(resolve => {
                client.auth(password, err => {
                    resolve([err]);
                });
            });

            if (err) {
                blog.error('bredis.init.auth failed: ', err);
                return [err];
            } else {
                blog.info('Redis passed auth.');
            }
        }

        return [ErrorCode.RESULT_OK];
    },

    *makeScanAsyncIterator(redisCMD, ...scanArgs) {
        let client = this.client;
        let cursor = '0';
        function formatArgs(args) {
            return args.map(x => {
                if (x === 'cursor') {
                    return cursor;
                } else {
                    return x;
                }
            });
        }
        function next() {
            return new Promise(resolve => {
                client[redisCMD](...(formatArgs(scanArgs)), (err, reply) => {
                    if (err) {
                        cursor = '0';
                        resolve([err, reply]);
                    } else {
                        cursor = reply[0];
                        let keys = reply[1];
                        resolve([err, keys]);
                    }
                });
            });
        }
        yield next();
        while (cursor !== '0') {
            yield next();
        }
    }
};

module.exports = _redis;
