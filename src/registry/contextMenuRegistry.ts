// src/registry/contextMenuRegistry.ts
// 右键菜单项注册中心
// 允许 Mod 动态添加自定义菜单项

import type { EditorBus } from '../bus/types';
import type { EditorState } from '../bus/types';

/**
 * 菜单项定义
 */
export interface MenuItem {
  id: string;                                          // 唯一标识
  label: string;                                       // 显示文字
  icon?: string;                                       // 可选图标（emoji）
  /**
   * 条件判断，决定是否显示该菜单项
   * @param state 编辑器状态
   * @param nodeId 当前右键的节点 ID（画布菜单时为 null）
   * @returns true 显示，false 隐藏
   */
  condition?: (state: EditorState, nodeId: string | null) => boolean;
  /**
   * 点击执行的动作
   * @param bus 事件总线
   * @param nodeId 当前右键的节点 ID（画布菜单时为 null）
   */
  action: (bus: EditorBus, nodeId: string | null) => void;
  order?: number;                                      // 显示顺序（越小越靠前）
}

// 节点右键菜单项
let nodeMenuItems: MenuItem[] = [];
// 画布右键菜单项
let paneMenuItems: MenuItem[] = [];

/**
 * 注册节点右键菜单项
 */
export function registerNodeMenuItem(item: MenuItem): void {
  if (nodeMenuItems.some(i => i.id === item.id)) {
    console.warn(`[contextMenuRegistry] 节点菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  nodeMenuItems = [...nodeMenuItems.filter(i => i.id !== item.id), item];
  nodeMenuItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[contextMenuRegistry] 已注册节点菜单项: ${item.id} (${item.label})`);
}

/**
 * 注册画布右键菜单项
 */
export function registerPaneMenuItem(item: MenuItem): void {
  if (paneMenuItems.some(i => i.id === item.id)) {
    console.warn(`[contextMenuRegistry] 画布菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  paneMenuItems = [...paneMenuItems.filter(i => i.id !== item.id), item];
  paneMenuItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[contextMenuRegistry] 已注册画布菜单项: ${item.id} (${item.label})`);
}

/**
 * 获取节点右键菜单项（已过滤）
 */
export function getNodeMenuItems(state: EditorState, nodeId: string | null): MenuItem[] {
  return nodeMenuItems.filter(item => !item.condition || item.condition(state, nodeId));
}

/**
 * 获取画布右键菜单项（已过滤）
 */
export function getPaneMenuItems(state: EditorState): MenuItem[] {
  return paneMenuItems.filter(item => !item.condition || item.condition(state, null));
}