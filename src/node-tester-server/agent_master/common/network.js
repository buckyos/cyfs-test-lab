const { ErrorCode } = require('../common/error_code.js');
const { blog } = require('../common/base.js');
const http = require('http');
const https = require('https');
const parser = require('url');

async function request(method, path, data, options) {
    let url = parser.parse(path);
    options = Object.assign({}, options);
    let headers = options.headers;
    let client = (url.protocol == 'https:') ? https : http;
    let { hostname, port } = url;
    let body = JSON.stringify(data);
    let requestOptions = {
        hostname: hostname,
        port: port,
        path: path,
        method: method,
        headers: Object.assign({}, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }, headers)
    };
    return new Promise(resolve => {
        let req = client.request(requestOptions, res => {
            res.setEncoding('utf8');
            let resp = '';
            res.on('data', chunk => resp += chunk);
            res.on('end', () => {
                if (options.notJSON) return resolve([ErrorCode.RESULT_OK, resp]);
                try {
                    resolve([ErrorCode.RESULT_OK, JSON.parse(resp)]);
                } catch(SyntaxError) {
                    blog.error('Request did not get JSON: ', resp);
                    resolve([ErrorCode.RESULT_REQUEST_ERROR, resp]);
                }
            });
        });

        req.on('error', err => {
            blog.error(`${method} ${path} request failed: `, err);
            resolve([err]);
        });

        if (method == 'POST' || method === 'PUT') {
            req.write(body);
        }
        req.end();
    });
}

function getClientIPSync(ctx) {
    return ctx.get('X-Real-IP') || ctx.request.ip;
}

function isLocalRequest(ip) {
    return ip 
        && (ip === '127.0.0.1'
            || ip === 'localhost');
}

function setJSONBodySync(ctx, data) {
    ctx.set('Content-Type', 'application/json');
    ctx.body = JSON.stringify(data);
    if (data.err) {
        blog.error(`${ctx.method} ${ctx.url} response: `, data);
    } else {
        // blog.debug(`${ctx.method} ${ctx.url} response: `, data);
    }
}


function middlewareHandleError() {
    return async function(ctx, next) {
        try {
            await next();
            blog.debug(`${ctx.method} ${ctx.url} DONE`);
        } catch (err) {
            blog.error(`${ctx.method} ${ctx.url} FAIL: `, err);

            if (typeof err === 'string' || typeof err === 'number') {
                setJSONBodySync(ctx, err);

            } else {
                ctx.throw(500, 'Internal Server Error.');
            }
        }
    };
}

function middlewareCORS() {
    return async function(ctx, next) {
        if (ctx.method === 'OPTIONS') {
            ctx.body = 'ok';

        } else {
            await next();
        }
        ctx.set('Access-Control-Allow-Methods', '*');
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
        ctx.set('Access-Control-Allow-Credentials', 'true');
    };
}


module.exports = {
    request,
    isLocalRequest,
    getClientIPSync,
    setJSONBodySync,
    middlewareCORS,
    middlewareHandleError
};