// src/mods/mod-floating-search.ts
// 浮动搜索 Mod
// 提供打开/关闭浮动搜索框的工具函数，并通过事件总线通信
// 支持继承：暴露 openSearch 和 closeSearch 工具函数

import type { EditorMod, EditorBus } from '../bus/types';
import { DEBUG } from '../../config/debug';

// ==================== 工具函数（可被继承复用） ====================

/**
 * 打开浮动搜索框
 * @param bus 事件总线实例
 * @param x 屏幕 X 坐标
 * @param y 屏幕 Y 坐标
 */
export function openSearch(bus: EditorBus, x: number, y: number) {
  bus.dispatch({ type: 'FLOATING_SEARCH_OPEN', payload: { x, y } });
  if (DEBUG) console.log('[floating-search] 打开搜索框', { x, y });
}

/**
 * 关闭浮动搜索框
 * @param bus 事件总线实例
 */
export function closeSearch(bus: EditorBus) {
  bus.dispatch({ type: 'FLOATING_SEARCH_CLOSE' });
  if (DEBUG) console.log('[floating-search] 关闭搜索框');
}

// ==================== Mod 定义 ====================
export const modFloatingSearch: EditorMod = {
  id: 'floating-search',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-floating-search] 初始化');
    // 此 Mod 仅作为工具函数容器，无需订阅
    // 如果需要监听全局快捷键（如 Ctrl+K）自动打开搜索，可以在这里添加键盘监听
    // 但为保持简单，留给继承者扩展
    return () => {
      if (DEBUG) console.log('[mod-floating-search] 已卸载');
    };
  },
};

// 批量获取工具函数（方便继承）
export function getFloatingSearchUtils(bus: EditorBus) {
  return {
    openSearch: (x: number, y: number) => openSearch(bus, x, y),
    closeSearch: () => closeSearch(bus),
  };
}