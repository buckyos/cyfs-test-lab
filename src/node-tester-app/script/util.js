'use strict';

const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const Http = require('http');
const Https = require('https');

const RandomGenerator = {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    CHAR_SET: 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678',

    string(length = 32) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    },

    integer(max, min = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
};

const Version = {
    compare(v1, v2) {
        let vl1 = v1.split('.');
        let vl2 = v2.split('.');

        let i = 0;
        for (; i < vl1.length; i++) {
            if (i >= vl2.length) {
                return 1;
            }

            let sub = parseInt(vl1[i]) - parseInt(vl2[i]);
            if (sub != 0) {
                return sub;
            }
        }

        if (i < vl2.length) {
            return -1;
        }
        return 0;
    }
}

const ProjectHelper = {
    async getProjectInfo(name) {
        const rootPath = path.dirname(__dirname);
        const prjPath = path.join(rootPath, 'projects', name);

        let info = {
            name,
            status: 'none',
        };

        const stat = util.promisify(fs.stat);
        const readFile = util.promisify(fs.readFile);

        try {
            const dirStat = await stat(prjPath);
            if (!dirStat.isDirectory()) {
                return info;
            }
            
            info.status = 'installing';
            const configPath = path.join(prjPath, 'config.json');

            const configStr = await readFile(configPath, {encoding: 'utf8'});
            if (!configStr) {
                return info;
            }

            const config = JSON.parse(configStr);
            if (!config) {
                return info;
            }

            info.version = config.version;
            if (!config.finish) {
                return info;
            }

            info.status = 'ready';
            return info;
        } catch (error) {
            return info;
        }
    }
}

const HttpDownloader = {
    // download({schema, host, port, path}, filePath, md5)
    download(packageAddress, filePath, fileMD5) {
        console.log(`download: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}`);
        return new Promise(async resolve => {
            if (fs.existsSync(filePath)) {
                try {
                    const readFile = util.promisify(fs.readFile);
                    let fileContent = await readFile(filePath);
                    let md5 = Crypto.createHash('md5');
                    md5.update(fileContent);
                    let md5Hash = md5.digest();
                    if (fileMD5 && md5Hash.toString('hex') === fileMD5) {
                        console.log(`download finish: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                        resolve(filePath);
                        return;
                    } else {
                        // 新建方式打开就好了，尽量少IO，省得各种不明原因出错
                        //fs.unlinkSync(filePath);
                    }
                } catch (err) {
                    //fs.unlinkSync(filePath);
                }
            }

            const schema = packageAddress.schema || 'http';
            const port = packageAddress.port || (schema === "https"? 443 : 80);
            const httpX = (schema === "https"? Https : Http)
            const request = httpX.request({host: packageAddress.host, port, path: packageAddress.path}, resp => {
                if (resp.statusCode === 200) {
                    let fd = fs.openSync(filePath, 'w');
                    resp.on('data', chunk => {
                        fs.writeSync(fd, chunk);
                    });
                    resp.once('end', () => {
                        fs.closeSync(fd);
                        console.log(`download finish: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, from network`);
                        resolve(filePath);
                    });
                    resp.once('error', () => {
                        fs.closeSync(fd);
                        // fs.unlink(filePath);
                        console.log(`download failed: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                        resolve(null);
                    });
                } else {
                    console.log(`download failed(${resp.statusCode}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                    resolve(null);
                }
            });
    
            request.once('error', (err) => {
                console.log(`download failed(${JSON.stringify(err)}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                resolve(null);
            });
            request.end();
        });
    }
}

module.exports = {
    RandomGenerator,
    Version,
    ProjectHelper,
    HttpDownloader,
}