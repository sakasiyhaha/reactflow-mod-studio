// src/registry/contextMenuRegistry.ts
import type { EditorBus } from '../bus/types';
import type { EditorState } from '../bus/types';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  condition?: (state: EditorState, nodeId: string | null) => boolean;
  action: (bus: EditorBus, nodeId: string | null) => void;
  order?: number;
}

let nodeMenuItems: MenuItem[] = [];
let paneMenuItems: MenuItem[] = [];

export function registerNodeMenuItem(item: MenuItem): () => void {
  if (nodeMenuItems.some(i => i.id === item.id)) {
    console.warn(`[contextMenuRegistry] 节点菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  nodeMenuItems = [...nodeMenuItems.filter(i => i.id !== item.id), item];
  nodeMenuItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[contextMenuRegistry] 已注册节点菜单项: ${item.id}`);

  return () => {
    nodeMenuItems = nodeMenuItems.filter(i => i.id !== item.id);
    console.log(`[contextMenuRegistry] 已卸载节点菜单项: ${item.id}`);
  };
}

export function registerPaneMenuItem(item: MenuItem): () => void {
  if (paneMenuItems.some(i => i.id === item.id)) {
    console.warn(`[contextMenuRegistry] 画布菜单项 "${item.id}" 已存在，将被覆盖`);
  }
  paneMenuItems = [...paneMenuItems.filter(i => i.id !== item.id), item];
  paneMenuItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[contextMenuRegistry] 已注册画布菜单项: ${item.id}`);

  return () => {
    paneMenuItems = paneMenuItems.filter(i => i.id !== item.id);
    console.log(`[contextMenuRegistry] 已卸载画布菜单项: ${item.id}`);
  };
}

export function getNodeMenuItems(state: EditorState, nodeId: string | null): MenuItem[] {
  return nodeMenuItems.filter(item => !item.condition || item.condition(state, nodeId));
}

export function getPaneMenuItems(state: EditorState): MenuItem[] {
  return paneMenuItems.filter(item => !item.condition || item.condition(state, null));
}