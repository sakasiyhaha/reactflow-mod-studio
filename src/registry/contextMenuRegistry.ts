// src/registry/contextMenuRegistry.ts
import type { EditorBus } from '../bus/types';
import type { EditorState } from '../bus/types';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  condition?: (state: EditorState, nodeId: string | null) => boolean;
  action: (bus: EditorBus, nodeId: string | null) => void;
  order?: number;
}

// 分别管理节点菜单和画布菜单
const nodeMenuManager = new ExtensionManager();
const paneMenuManager = new ExtensionManager();

// 适配函数：将 MenuItem 转换为 ExtensionPoint
function menuItemToPoint(item: MenuItem): ExtensionPoint<MenuItem> {
  return {
    id: item.id,
    priority: item.order ?? 100,
    dependencies: [],
    activate: () => item,
    deactivate: () => {},
  };
}

// 注册节点菜单项
export function registerNodeMenuItem(item: MenuItem): () => void {
  if (nodeMenuManager.getExtension(item.id)) {
    console.warn(`[contextMenuRegistry] 节点菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = nodeMenuManager.register(menuItemToPoint(item));
  console.log(`[contextMenuRegistry] 已注册节点菜单项: ${item.id}`);
  return unregister;
}

// 注册画布菜单项
export function registerPaneMenuItem(item: MenuItem): () => void {
  if (paneMenuManager.getExtension(item.id)) {
    console.warn(`[contextMenuRegistry] 画布菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = paneMenuManager.register(menuItemToPoint(item));
  console.log(`[contextMenuRegistry] 已注册画布菜单项: ${item.id}`);
  return unregister;
}

// 获取节点菜单项（已过滤）
export function getNodeMenuItems(state: EditorState, nodeId: string | null): MenuItem[] {
  const exts = nodeMenuManager.resolveOrder();
  return exts
    .map(ext => ext.activate() as MenuItem)
    .filter(item => !item.condition || item.condition(state, nodeId));
}

// 获取画布菜单项（已过滤）
export function getPaneMenuItems(state: EditorState): MenuItem[] {
  const exts = paneMenuManager.resolveOrder();
  return exts
    .map(ext => ext.activate() as MenuItem)
    .filter(item => !item.condition || item.condition(state, null));
}

// 清空所有菜单项（用于测试）
export function clearContextMenuRegistry(): void {
  nodeMenuManager.clear();
  paneMenuManager.clear();
}