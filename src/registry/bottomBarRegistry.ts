// src/registry/bottomBarRegistry.ts
import type { ReactNode } from 'react';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export interface BottomBarItem {
  id: string;
  order: number;
  text?: string;
  updatable?: boolean;
  component?: React.ComponentType<{ text: string }>;
}

// 分别管理左、中、右三个区域
const leftManager = new ExtensionManager();
const centerManager = new ExtensionManager();
const rightManager = new ExtensionManager();

// 辅助函数：将 BottomBarItem 转换为 ExtensionPoint
function itemToPoint(item: BottomBarItem): ExtensionPoint<BottomBarItem> {
  return {
    id: item.id,
    priority: item.order,
    dependencies: [],
    activate: () => item,
    deactivate: () => {},
  };
}

// 注册 API（返回 unregister 函数）
export function registerBottomBarLeft(item: BottomBarItem): () => void {
  if (leftManager.getExtension(item.id)) {
    console.warn(`[bottomBarRegistry] 左侧项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = leftManager.register(itemToPoint(item));
  console.log(`[bottomBarRegistry] 已注册左侧项: ${item.id}`);
  return unregister;
}

export function registerBottomBarCenter(item: BottomBarItem): () => void {
  if (centerManager.getExtension(item.id)) {
    console.warn(`[bottomBarRegistry] 中间项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = centerManager.register(itemToPoint(item));
  console.log(`[bottomBarRegistry] 已注册中间项: ${item.id}`);
  return unregister;
}

export function registerBottomBarRight(item: BottomBarItem): () => void {
  if (rightManager.getExtension(item.id)) {
    console.warn(`[bottomBarRegistry] 右侧项 "${item.id}" 已存在，将被覆盖`);
  }
  const unregister = rightManager.register(itemToPoint(item));
  console.log(`[bottomBarRegistry] 已注册右侧项: ${item.id}`);
  return unregister;
}

// 获取 API（按 order 排序）
export function getBottomBarLeftItems(): BottomBarItem[] {
  return leftManager.resolveOrder().map(ext => ext.activate() as BottomBarItem);
}

export function getBottomBarCenterItems(): BottomBarItem[] {
  return centerManager.resolveOrder().map(ext => ext.activate() as BottomBarItem);
}

export function getBottomBarRightItems(): BottomBarItem[] {
  return rightManager.resolveOrder().map(ext => ext.activate() as BottomBarItem);
}

// 清空所有注册项（用于测试）
export function clearBottomBarRegistry(): void {
  leftManager.clear();
  centerManager.clear();
  rightManager.clear();
}