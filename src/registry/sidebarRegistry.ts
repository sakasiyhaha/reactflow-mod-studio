// src/registry/sidebarRegistry.ts
import type { ComponentType } from 'react';
import type { EditorBus } from '../bus/types';

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

let registeredComponents: SidebarComponent[] = [];
let registeredButtons: SidebarButton[] = [];

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

// 保存排序到 localStorage（略，保持原有逻辑）

export function registerSidebarComponent(component: SidebarComponent): () => void {
  const index = registeredComponents.findIndex(c => c.id === component.id);
  if (index !== -1) registeredComponents[index] = component;
  else registeredComponents.push(component);
  registeredComponents = sortByOrder(registeredComponents);
  saveOrderToLocalStorage();
  console.log(`[sidebarRegistry] 已注册组件: ${component.id}`);

  // 返回 unregister 函数
  return () => {
    const idx = registeredComponents.findIndex(c => c.id === component.id);
    if (idx !== -1) {
      registeredComponents.splice(idx, 1);
      console.log(`[sidebarRegistry] 已卸载组件: ${component.id}`);
    }
  };
}

export function registerSidebarButton(button: SidebarButton): () => void {
  const index = registeredButtons.findIndex(b => b.id === button.id);
  if (index !== -1) registeredButtons[index] = button;
  else registeredButtons.push(button);
  registeredButtons = sortByOrder(registeredButtons);
  console.log(`[sidebarRegistry] 已注册按钮: ${button.id}`);

  return () => {
    const idx = registeredButtons.findIndex(b => b.id === button.id);
    if (idx !== -1) {
      registeredButtons.splice(idx, 1);
      console.log(`[sidebarRegistry] 已卸载按钮: ${button.id}`);
    }
  };
}

export function getSidebarComponents(): SidebarComponent[] {
  return [...registeredComponents];
}

export function getSidebarButtons(): SidebarButton[] {
  return [...registeredButtons];
}

export function clearSidebarRegistry(): void {
  registeredComponents = [];
  registeredButtons = [];
}

export function updateComponentOrder(id: string, newOrder: number): void {
  const component = registeredComponents.find(c => c.id === id);
  if (component) {
    component.order = newOrder;
    registeredComponents = sortByOrder(registeredComponents);
    saveOrderToLocalStorage();
    console.log(`[sidebarRegistry] 组件 ${id} 顺序更新为 ${newOrder}`);
  }
}

const STORAGE_KEY = 'sidebar_components_order';

function saveOrderToLocalStorage(): void {
  const orderMap = registeredComponents.map(c => ({ id: c.id, order: c.order }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));
}

export function loadOrderFromLocalStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const orderMap = JSON.parse(raw) as { id: string; order: number }[];
      for (const { id, order } of orderMap) {
        const comp = registeredComponents.find(c => c.id === id);
        if (comp) comp.order = order;
      }
      registeredComponents = sortByOrder(registeredComponents);
      console.log('[sidebarRegistry] 已加载组件顺序');
    } catch (e) {
      console.warn('[sidebarRegistry] 加载顺序失败', e);
    }
  }
}