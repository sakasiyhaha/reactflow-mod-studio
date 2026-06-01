import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// ========== 调试日志服务器（仅开发环境，可选） ==========
// 使用方法：node log-server.js 启动独立日志服务器
// 然后编辑器的所有 console 会自动转发到服务器，即使页面卡死也能记录最后状态

const ENABLE_LOG_SERVER = true;        // 生产环境请设为 false
const WS_URL = 'ws://localhost:8765';
const BATCH_INTERVAL_MS = 100;         // 批量发送间隔（毫秒）
const MAX_BATCH_SIZE = 50;             // 每批最多发送条数

let ws: WebSocket | null = null;
let logQueue: string[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
} | null = null;

// 批量发送队列中的日志
function flushLogQueue() {
    if (!ws || ws.readyState !== WebSocket.OPEN || logQueue.length === 0) return;
    const batch = logQueue.splice(0, MAX_BATCH_SIZE);
    const payload = batch.join('\n');
    ws.send(payload);
    if (logQueue.length > 0) {
        // 如果还有剩余，继续调度下一次发送
        scheduleBatch();
    }
}

function scheduleBatch() {
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(flushLogQueue, BATCH_INTERVAL_MS);
}

function sendLog(level: string, args: unknown[]) {
    if (!ENABLE_LOG_SERVER) return;
    // 格式化参数，避免序列化循环引用对象
    const formatted = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
    const timestamp = Date.now();
    const message = JSON.stringify({ timestamp, level, msg: formatted });
    logQueue.push(message);
    scheduleBatch();
}

function setupLogServer() {
    if (!ENABLE_LOG_SERVER) return;

    // 保存原始 console 方法
    originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
    };

    // 劫持 console
    console.log = (...args) => {
        sendLog('log', args);
        originalConsole!.log.apply(console, args);
    };
    console.error = (...args) => {
        sendLog('error', args);
        originalConsole!.error.apply(console, args);
    };
    console.warn = (...args) => {
        sendLog('warn', args);
        originalConsole!.warn.apply(console, args);
    };

    // 连接 WebSocket
    function connect() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        try {
            ws = new WebSocket(WS_URL);
            ws.onopen = () => {
                originalConsole?.log('[LogServer] 已连接');
                // 连接成功后立即发送积压的日志
                flushLogQueue();
            };
            ws.onerror = (err) => {
                originalConsole?.error('[LogServer] 连接错误', err);
            };
            ws.onclose = () => {
                originalConsole?.warn('[LogServer] 连接关闭，5 秒后重连');
                ws = null;
                reconnectTimer = setTimeout(connect, 5000);
            };
        } catch (e) {
            originalConsole?.warn('[LogServer] 无法连接', e);
            reconnectTimer = setTimeout(connect, 5000);
        }
    }

    connect();
}

// 仅开发环境启用，且可通过 URL 参数禁用（如 ?no-log）
const shouldEnable = ENABLE_LOG_SERVER && import.meta.env.DEV && !window.location.search.includes('no-log');
if (shouldEnable) {
    setupLogServer();
}

// 正常渲染
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);