// src/mods/mod-error-handler.ts
// 错误处理 Mod（纯 TS）
// 提供 dispatchError 工具函数，并可选订阅错误事件用于日志记录
// Toast UI 渲染由 App.tsx 负责，保持 Mod 无 JSX

import type { EditorMod, EditorBus } from '../bus/types';
import { DEBUG } from '../../config/debug';

// 辅助函数：主动派发错误事件（供其他 Mod 或业务代码调用）
export function dispatchError(
  bus: EditorBus,
  message: string,
  type: 'info' | 'warning' | 'error' = 'error',
  details?: any
) {
  bus.dispatch({
    type: 'ERROR_OCCURRED',
    error: { message, type, details },
  });
}

export const modErrorHandler: EditorMod = {
  id: 'error-handler',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-error-handler] 初始化');

    // 可选：订阅错误事件，将错误输出到控制台（但不处理 UI）
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'ERROR_OCCURRED') {
        const { message, type, details } = event.error;
        if (type === 'error') {
          console.error(`[Error] ${message}`, details);
        } else if (type === 'warning') {
          console.warn(`[Warning] ${message}`, details);
        } else {
          console.log(`[Info] ${message}`, details);
        }
      }
    });

    // 清理函数
    return () => {
      unsub();
      if (DEBUG) console.log('[mod-error-handler] 已卸载');
    };
  },
};