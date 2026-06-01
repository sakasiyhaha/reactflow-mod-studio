// src/registry/sidebarRegistry.ts
import type { ComponentType } from 'react';
import type { EditorBus } from '../bus/types';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export interface SidebarComponent {
  id: string;
  order: number;
  component: ComponentType;
}

export interface SidebarButton {
  id: string;
  label: string;
  icon?: string;
  onClick: (bus: EditorBus) => void | Promise<void>;
  order?: number;
}

// 内部扩展管理器（用于组件和按钮）
const componentManager = new ExtensionManager();
const buttonManager = new ExtensionManager();

// ========== 排序持久化相关 ==========
const STORAGE_KEY = 'sidebar_components_order';

function saveOrderToLocalStorage(): void {
  const components = getSidebarComponents();
  const orderMap = components.map(c => ({ id: c.id, order: c.order }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));
}

export function loadOrderFromLocalStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const orderMap = JSON.parse(raw) as { id: string; order: number }[];
    for (const { id, order } of orderMap) {
      componentManager.updatePriority(id, order);
    }
  } catch (e) {
    console.warn('[sidebarRegistry] 加载顺序失败', e);
  }
}

// ========== 组件注册 API ==========
export function registerSidebarComponent(component: SidebarComponent): () => void {
  if (componentManager.getExtension(component.id)) {
    console.warn(`[sidebarRegistry] 组件 "${component.id}" 已存在，将被覆盖`);
  }
  const ext: ExtensionPoint = {
    id: component.id,
    priority: component.order,
    dependencies: [],
    activate: () => component,
    deactivate: () => {},
  };
  const unregister = componentManager.register(ext);
  saveOrderToLocalStorage();
  console.log(`[sidebarRegistry] 已注册组件: ${component.id}`);
  return unregister;
}

export function getSidebarComponents(): SidebarComponent[] {
  const exts = componentManager.resolveOrder();
  return exts.map(ext => ext.activate() as SidebarComponent);
}

// ========== 按钮注册 API ==========
export function registerSidebarButton(button: SidebarButton): () => void {
  if (buttonManager.getExtension(button.id)) {
    console.warn(`[sidebarRegistry] 按钮 "${button.id}" 已存在，将被覆盖`);
  }
  const ext: ExtensionPoint = {
    id: button.id,
    priority: button.order ?? 100,
    dependencies: [],
    activate: () => button,
    deactivate: () => {},
  };
  const unregister = buttonManager.register(ext);
  console.log(`[sidebarRegistry] 已注册按钮: ${button.id}`);
  return unregister;
}

export function getSidebarButtons(): SidebarButton[] {
  const exts = buttonManager.resolveOrder();
  return exts.map(ext => ext.activate() as SidebarButton);
}

// ========== 辅助函数 ==========
export function clearSidebarRegistry(): void {
  componentManager.clear();
  buttonManager.clear();
  localStorage.removeItem(STORAGE_KEY);
}

export function updateComponentOrder(id: string, newOrder: number): void {
  if (componentManager.updatePriority(id, newOrder)) {
    saveOrderToLocalStorage();
    console.log(`[sidebarRegistry] 组件 ${id} 顺序更新为 ${newOrder}`);
  }
}