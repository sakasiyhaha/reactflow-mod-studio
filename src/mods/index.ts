// src/mods/index.ts
// Mod 注册中心 - 统一初始化所有内置 Mod 和用户自定义 Mod
// 支持：
//   1. 添加（Add）：用户自定义 Mod 直接追加到列表末尾
//   2. 覆盖（Override）：用户自定义 Mod 若 id 与某个内置 Mod 相同，则替换内置版本
//   3. 防御降级（Fallback）：自定义 Mod 初始化失败时，自动回退到内置版本
//
// 返回一个清理函数，在组件卸载时移除所有 Mod 的监听和副作用

import type { EditorBus, EditorMod } from '../bus/types';
import { modHistory } from './mod-history';
import { modBatchConnect } from './mod-batch-connect';
import { modAlignment } from './mod-alignment';
import { modClipboard } from './mod-clipboard';
import { modReconnect } from './mod-reconnect';
import { modProjectConfig } from './mod-project-config';
import { modNodeLifecycle } from './mod-node-lifecycle';
import { modConnectionMenu } from './mod-connection-menu';
import { modCanvasContextMenu } from './mod-canvas-context-menu';
import { DEBUG } from '../../config/debug';
import { modFloatingSearch } from './mod-floating-search';
import { modWorkflowIO } from './mod-workflow-io';
import { modErrorHandler } from './mod-error-handler';
import { modDefaultControls } from './mod-default-controls';
import { modDefaultSidebarButtons } from './mod-default-sidebar-buttons';
import { modDefaultUI } from './mod-default-ui';

export function initMods(bus: EditorBus, extraMods: EditorMod[] = []): () => void {
  // ==================== 1. 定义内置 Mod 列表 ====================
  const builtInMods: EditorMod[] = [
    modHistory,          // id: 'history'
    modBatchConnect,     // id: 'batch-connect'
    modAlignment,        // id: 'alignment'
    modClipboard,        // id: 'clipboard'
    modReconnect,        // id: 'reconnect'
    modProjectConfig,    // id: 'project-config'
    modNodeLifecycle,    // id: 'node-lifecycle'
    modConnectionMenu,   // id: 'connection-menu'
    modCanvasContextMenu,// id: 'canvas-context-menu'  
    modFloatingSearch,
    modWorkflowIO,
    modErrorHandler,
    modDefaultControls,
    modDefaultSidebarButtons,
    modDefaultUI,
  ];

  // 构建内置 Mod 的 fallback 映射
  const fallbackMap = new Map<string, EditorMod>();
  for (const mod of builtInMods) {
    fallbackMap.set(mod.id, mod);
  }

  // ==================== 2. 构建自定义 Mod 的覆盖映射 ====================
  const customModMap = new Map<string, EditorMod>();
  for (const mod of extraMods) {
    if (!mod.id) {
      console.warn(`[initMods] 自定义 Mod 缺少 id 属性，将被忽略:`, mod);
      continue;
    }
    if (customModMap.has(mod.id)) {
      console.warn(`[initMods] 自定义 Mod id 重复: ${mod.id}，后面的将覆盖前面的`);
    }
    customModMap.set(mod.id, mod);
  }

  // ==================== 3. 合并 Mod 列表（覆盖 + 添加） ====================
  const finalMods: EditorMod[] = [];
  const usedCustomIds = new Set<string>();

  for (const builtIn of builtInMods) {
    const customVersion = customModMap.get(builtIn.id);
    if (customVersion) {
      finalMods.push(customVersion);
      usedCustomIds.add(builtIn.id);
      if (DEBUG) console.log(`[initMods] 准备覆盖内置 Mod: ${builtIn.id} -> 使用自定义版本`);
    } else {
      finalMods.push(builtIn);
      if (DEBUG) console.log(`[initMods] 保留内置 Mod: ${builtIn.id}`);
    }
  }

  for (const [id, mod] of customModMap.entries()) {
    if (!usedCustomIds.has(id)) {
      finalMods.push(mod);
      if (DEBUG) console.log(`[initMods] 添加新增 Mod: ${id}`);
    }
  }

  // ==================== 4. 初始化所有 Mod（带防御降级） ====================
  const cleanups: (() => void)[] = [];
  const failedModIds: string[] = [];
  const degradedModIds: string[] = [];

  for (const mod of finalMods) {
    const isCustom = customModMap.has(mod.id);
    const fallback = fallbackMap.get(mod.id);

    try {
      if (DEBUG) console.log(`[initMods] 初始化 Mod: ${mod.id}${isCustom ? ' (自定义)' : ''}`);
      const cleanup = mod.init(bus);
      if (cleanup) {
        cleanups.push(cleanup);
      }
    } catch (err) {
      console.error(
        `%c[initMods] ❌ Mod "${mod.id}" 初始化失败:`,
        'color: #ff4444; font-weight: bold',
        err
      );

      if (isCustom && fallback) {
        console.warn(
          `%c[initMods] ⚠️ 正在回退到内置 Mod: ${mod.id}`,
          'color: #ffaa00'
        );
        try {
          const cleanupFallback = fallback.init(bus);
          if (cleanupFallback) {
            cleanups.push(cleanupFallback);
          }
          degradedModIds.push(mod.id);
        } catch (fallbackErr) {
          console.error(
            `%c[initMods] ❌ 内置 Mod "${mod.id}" 降级也失败！`,
            'color: #ff4444; font-weight: bold',
            fallbackErr
          );
          failedModIds.push(mod.id);
        }
      } else {
        failedModIds.push(mod.id);
      }
    }
  }

  if (degradedModIds.length > 0) {
    console.warn(
      `%c[initMods] ⚠️ 以下 Mod 已降级为内置版本: ${degradedModIds.join(', ')}`,
      'color: #ffaa00'
    );
  }
  if (failedModIds.length > 0) {
    console.error(
      `%c[initMods] ❌ 以下 Mod 完全无法初始化: ${failedModIds.join(', ')}`,
      'color: #ff4444; font-weight: bold'
    );
  }

  // ==================== 5. 返回总清理函数 ====================
  return () => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      cleanups[i]();
    }
    if (DEBUG) console.log('[initMods] 已卸载所有 Mod');
  };
}