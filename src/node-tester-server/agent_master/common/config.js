const fs = require('fs');
const path = require('path');
const {blog} = require('./base.js');
const GLOBAL_CONFIG_FILE = '/etc/agent_master/agent_master.config.json';
const os = require('os');

const HOME_PATH = os.homedir();

const Config = {
    isDeveloping: false,
    logLevel: 'debug',
    
    server: {
        port: 11080,
    },

    control: {
        port: 11081,
    },

    storagePath: '/etc/agent_master/database.db',

    init() {
        if (Config.isDeveloping) {
            Config.storagePath = path.join(path.dirname(path.dirname(__dirname)), 'agent_master_database.db');
        }

        let data = '{}';
        try {
            data = fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf8');
            blog.info('Read gct account config from file: ' + GLOBAL_CONFIG_FILE);
            Object.assign(this, JSON.parse(data || '{}'));
        } catch(err) {
            if (err.code === 'ENOENT') {
                blog.warn('Cannot find global config file, use default config instead: ' + GLOBAL_CONFIG_FILE);
                return;

            } else if (err.name === 'SyntaxError') {
                blog.error('Cannot invalid json content: ' + GLOBAL_CONFIG_FILE + ' : ' + data);
                throw err;

            } else {
                throw err;
            }
        }
    }
};

module.exports = Config;