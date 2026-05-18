// src/registry/sidebarRegistry.ts
// 侧边栏按钮注册中心
// 允许 Mod 动态添加自定义按钮

import type { EditorBus } from '../bus/types';

/**
 * 侧边栏按钮定义
 */
export interface SidebarButton {
  id: string;                    // 唯一标识
  label: string;                 // 按钮文字
  icon?: string;                 // 可选图标（emoji 或图片）
  onClick: (bus: EditorBus) => void | Promise<void>; // 点击回调
  order?: number;                // 显示顺序（越小越靠前，默认 100）
}

// 存储所有注册的按钮
let registeredButtons: SidebarButton[] = [];

/**
 * 注册侧边栏按钮
 * @param button 按钮定义
 */
export function registerSidebarButton(button: SidebarButton): void {
  if (registeredButtons.some(b => b.id === button.id)) {
    console.warn(`[sidebarRegistry] 按钮 "${button.id}" 已存在，将被覆盖`);
  }
  registeredButtons = [...registeredButtons.filter(b => b.id !== button.id), button];
  registeredButtons.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[sidebarRegistry] 已注册侧边栏按钮: ${button.id} (${button.label})`);
}

/**
 * 获取所有已注册的按钮
 */
export function getSidebarButtons(): SidebarButton[] {
  return [...registeredButtons];
}

/**
 * 移除按钮（通常不需要，但提供清理能力）
 */
export function unregisterSidebarButton(id: string): void {
  registeredButtons = registeredButtons.filter(b => b.id !== id);
  console.log(`[sidebarRegistry] 已移除侧边栏按钮: ${id}`);
}