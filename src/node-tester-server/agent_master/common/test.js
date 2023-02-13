const {blog} = require('./base.js');
const redis = require('./redisclient.js');
const mysql = require('./mysqlclient.js');
const Config = require('./config.js');
const TransferDB = require('../models/TransferDB.js');

module.exports = {
    checkDevelopMode() {
        if (!Config.isDeveloping) throw 'Can not be executed in developing mode.';
    },
    
    async flushRedis() {
        this.checkDevelopMode();
        return new Promise(resolve => {
            redis.client.flushall((err, ret) => {
                blog.debug('Flush redis data in dev mode: ', {err, ret});
                resolve([err, ret]);
            });
        });
    },
    
    async truncateDBTable(table) {
        this.checkDevelopMode();
        let sql = 'DELETE FROM ??';
        return new Promise(resolve => {
            mysql.pool.query(sql, [table], (err, ret) => {
                if (err) {
                    blog.error(err);
                } else {
                    blog.debug(`Truncate db table ${table}: delete rows ${ret.affectedRows}`);
                }
                resolve([err, ret]);
            });
        });
    },
    
    async init() {
        Config.init();
        this.checkDevelopMode();

        blog.init({
            service: 'gct_account',
            level: Config.logLevel || 'info'
        });

        require('./mysqlclient.js').init();
        await require('./redisclient.js').init();

        let transferDB = new TransferDB();
        let [err] = await transferDB.initDBStorageProcedure();
        if (err) throw 'Cannot init transfer db storage procedures';

    }
};