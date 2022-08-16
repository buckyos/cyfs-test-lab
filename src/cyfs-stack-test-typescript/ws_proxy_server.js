const express = require('express')
const http = require('http')
const WebSocket = require('ws')
httpProxy = require('http-proxy');
util = require('util')
colors = require('colors')
var WsParser = require('simples/lib/parsers/ws'); // npm install simples

const app = express()

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const checkAlive = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            return ws.terminate()
        }

        ws.isAlive = false
        ws.ping()
    })
}, 15 * 1000)

const proxyMessage = (target, message) => {
    if (target.readyState === WebSocket.OPEN) {
        return target.send(message)
    }

    target.on('open', () => {
        target.send(message)
    })
}

wss.on('connection', ws => {
    console.log(`new connection comming`);
    // 监听代理response
    const target = new WebSocket('ws://127.0.0.1:1323')
    target.on('close', () => {
        ws.terminate()
    })

    target.on('message', message => {
        ws.send(message)
    })

    // 处理客户端消息
    ws.isAlive = true
    ws.on('pong', () => {
        ws.isAlive = true
        console.log(`pong`);
    })

    ws.on('close', () => {
        target.terminate()
    })

    ws.on('message', message => {
        console.log(`message`);
        proxyMessage(target, message)
    })
})

wss.on('close', () => {
    clearInterval(checkAlive)
})

//server.listen(process.env.PORT)
console.log('ws server listening 9015');
server.listen(9015)