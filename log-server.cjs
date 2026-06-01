// log-server.js
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const LOG_FILE = path.join(__dirname, 'debug-logs', `log-${Date.now()}.txt`);

// 确保日志目录存在
if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`日志服务器运行在 ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('前端已连接');
    ws.on('message', (data) => {
        const timestamp = new Date().toISOString();
        const message = data.toString();
        // 写入文件
        fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
        // 同时打印到控制台
        console.log(`[LOG] ${message}`);
    });
});