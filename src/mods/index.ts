// src/mods/index.ts
// Mod 注册中心 - 统一初始化所有内置 Mod 和用户自定义 Mod
// 返回一个清理函数，在组件卸载时移除所有 Mod 的监听和副作用

import type { EditorBus } from '../bus/types';
import { modHistory } from './mod-history';
import { modBatchConnect } from './mod-batch-connect';
import { modAlignment } from './mod-alignment';
import { modClipboard } from './mod-clipboard';
import { modReconnect } from './mod-reconnect';
import { DEBUG } from '../../config/debug';
import type { EditorMod } from '../bus/types';

/**
 * 初始化所有内置 Mod 以及用户自定义 Mod
 * @param bus       编辑器事件总线实例
 * @param extraMods 用户自定义的 Mod 数组（来自 custom-mods/index.ts）
 * @returns         一个清理函数，调用后会注销所有 Mod
 */
export function initMods(bus: EditorBus, extraMods: EditorMod[] = []): () => void {
  // 将所有内置 Mod 和用户自定义 Mod 合并
  const mods: EditorMod[] = [
    modHistory,         // 历史记录（撤销/重做）
    modBatchConnect,    // 批量连线
    modAlignment,       // 对齐与分布
    modClipboard,       // 剪贴板（Ctrl+C/V/X/A）
    modReconnect,       // 重连管理
    ...extraMods,       // 用户自定义 Mod
  ];

  const cleanups: (() => void)[] = [];

  // 逐个初始化 Mod
  mods.forEach(mod => {
    if (DEBUG) console.log(`[initMods] 初始化 Mod: ${mod.id}`);
    const cleanup = mod.init(bus);   // 调用 Mod 的初始化函数，可能返回清理函数
    if (cleanup) {
      cleanups.push(cleanup);
    }
  });

  // 返回总清理函数：调用所有 Mod 的清理函数
  return () => {
    cleanups.forEach(cleanup => cleanup());
    if (DEBUG) console.log('[initMods] 已卸载所有 Mod');
  };
}