// src/registry/bottomBarRegistry.ts
import type { ReactNode } from 'react';

export interface BottomBarItem {
  id: string;
  order: number;
  text?: string;
  updatable?: boolean;
  component?: React.ComponentType<{ text: string }>;
}

let leftItems: BottomBarItem[] = [];
let centerItems: BottomBarItem[] = [];
let rightItems: BottomBarItem[] = [];

const sortByOrder = (items: BottomBarItem[]) => [...items].sort((a, b) => a.order - b.order);

function registerItem(store: BottomBarItem[], item: BottomBarItem, area: string): () => void {
  const index = store.findIndex(i => i.id === item.id);
  if (index !== -1) store[index] = item;
  else store.push(item);
  const newStore = sortByOrder(store);
  store.length = 0;
  store.push(...newStore);
  console.log(`[bottomBarRegistry] 已注册 ${area} 项: ${item.id}`);

  return () => {
    const idx = store.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      store.splice(idx, 1);
      console.log(`[bottomBarRegistry] 已卸载 ${area} 项: ${item.id}`);
    }
  };
}

export function registerBottomBarLeft(item: BottomBarItem): () => void {
  return registerItem(leftItems, item, '左侧');
}
export function registerBottomBarCenter(item: BottomBarItem): () => void {
  return registerItem(centerItems, item, '中间');
}
export function registerBottomBarRight(item: BottomBarItem): () => void {
  return registerItem(rightItems, item, '右侧');
}

export function getBottomBarLeftItems(): BottomBarItem[] {
  return [...leftItems];
}
export function getBottomBarCenterItems(): BottomBarItem[] {
  return [...centerItems];
}
export function getBottomBarRightItems(): BottomBarItem[] {
  return [...rightItems];
}