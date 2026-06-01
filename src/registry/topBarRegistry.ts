// src/registry/topBarRegistry.ts
import type { ReactNode } from 'react';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export interface TopBarItem {
  id: string;
  order: number;
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  component?: React.ComponentType;
  shortcut?: string;
  children?: TopBarItem[];
}

// 三个独立存储区域
const leftManager = new ExtensionManager();
const centerManager = new ExtensionManager();
const rightManager = new ExtensionManager();

// 辅助函数：将 TopBarItem 转换为 ExtensionPoint
function itemToPoint(item: TopBarItem): ExtensionPoint<TopBarItem> {
  // 注意：children 子菜单项不参与独立的扩展点管理，它们随父项一起存储
  return {
    id: item.id,
    priority: item.order,
    dependencies: [],
    activate: () => item,
    deactivate: () => {},
  };
}

// 注册 API（返回 unregister 函数）
export function registerTopBarLeft(item: TopBarItem): () => void {
  if (leftManager.getExtension(item.id)) {
    console.warn(`[topBarRegistry] 左侧项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = leftManager.register(itemToPoint(item));
  console.log(`[topBarRegistry] 已注册左侧项: ${item.id}`);
  return unregister;
}

export function registerTopBarCenter(item: TopBarItem): () => void {
  if (centerManager.getExtension(item.id)) {
    console.warn(`[topBarRegistry] 中间项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = centerManager.register(itemToPoint(item));
  console.log(`[topBarRegistry] 已注册中间项: ${item.id}`);
  return unregister;
}

export function registerTopBarRight(item: TopBarItem): () => void {
  if (rightManager.getExtension(item.id)) {
    console.warn(`[topBarRegistry] 右侧项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = rightManager.register(itemToPoint(item));
  console.log(`[topBarRegistry] 已注册右侧项: ${item.id}`);
  return unregister;
}

// 获取 API（按 order 排序）
export function getTopBarLeftItems(): TopBarItem[] {
  return leftManager.resolveOrder().map(ext => ext.activate() as TopBarItem);
}

export function getTopBarCenterItems(): TopBarItem[] {
  return centerManager.resolveOrder().map(ext => ext.activate() as TopBarItem);
}

export function getTopBarRightItems(): TopBarItem[] {
  return rightManager.resolveOrder().map(ext => ext.activate() as TopBarItem);
}

// 清空所有注册项（用于测试）
export function clearTopBarRegistry(): void {
  leftManager.clear();
  centerManager.clear();
  rightManager.clear();
}