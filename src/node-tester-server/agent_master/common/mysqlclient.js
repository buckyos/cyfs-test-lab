const mysql = require('mysql');
const Config = require('./config.js');
const {blog, ErrorCode} = require('./base.js');
const { promisify } = require('util');

module.exports = {
    pool: null,
    init() {
        let config = Config.mysql;
        this.pool = mysql.createPool(config).on('connection', (connection) => {
            connection.query('SET time_zone = "+00:00"');
        });
        
        blog.debug('Init db connection pool: ', config);
        this.query = promisify(this.pool.query).bind(this.pool);

        // Object.freeze(this);
        return [ErrorCode.RESULT_OK];
    }
};
