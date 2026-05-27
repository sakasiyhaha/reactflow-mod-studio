// src/registry/topBarRegistry.ts
import type { ReactNode } from 'react';

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

let leftItems: TopBarItem[] = [];
let centerItems: TopBarItem[] = [];
let rightItems: TopBarItem[] = [];

const sortByOrder = (items: TopBarItem[]) => [...items].sort((a, b) => a.order - b.order);

function registerItem(store: TopBarItem[], item: TopBarItem, area: string): () => void {
  const index = store.findIndex(i => i.id === item.id);
  if (index !== -1) store[index] = item;
  else store.push(item);
  const newStore = sortByOrder(store);
  // 更新原数组引用（直接修改外部变量需要小心，这里简化：修改原数组内容）
  store.length = 0;
  store.push(...newStore);
  console.log(`[topBarRegistry] 已注册 ${area} 项: ${item.id}`);

  return () => {
    const idx = store.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      store.splice(idx, 1);
      console.log(`[topBarRegistry] 已卸载 ${area} 项: ${item.id}`);
    }
  };
}

export function registerTopBarLeft(item: TopBarItem): () => void {
  return registerItem(leftItems, item, '左侧');
}

export function registerTopBarCenter(item: TopBarItem): () => void {
  return registerItem(centerItems, item, '中间');
}

export function registerTopBarRight(item: TopBarItem): () => void {
  return registerItem(rightItems, item, '右侧');
}

export function getTopBarLeftItems(): TopBarItem[] {
  return [...leftItems];
}
export function getTopBarCenterItems(): TopBarItem[] {
  return [...centerItems];
}
export function getTopBarRightItems(): TopBarItem[] {
  return [...rightItems];
}