// src/registry/propsPanelRegistry.ts
import type { ComponentType } from 'react';
import type { CustomNode } from '../utils/types';
import type { EditorBus } from '../bus/types';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export type PropsPanelSlot = 'top' | 'bottom';

export interface PropsPanelExtensionProps {
  selectedNode: CustomNode | null;
  bus: EditorBus;
}

export interface PropsPanelExtension {
  id: string;
  slot: PropsPanelSlot;
  component: ComponentType<PropsPanelExtensionProps>;
  order?: number;
  condition?: (selectedNode: CustomNode | null) => boolean;
}

export interface PropsPanelComponent {
  id: string;
  order: number;
  component: ComponentType<PropsPanelExtensionProps>;
}

// 分别管理扩展槽和面板组件
const extensionManager = new ExtensionManager();
const panelManager = new ExtensionManager();

// 适配函数
function extensionToPoint(ext: PropsPanelExtension): ExtensionPoint<PropsPanelExtension> {
  return {
    id: ext.id,
    priority: ext.order ?? 100,
    dependencies: [],
    activate: () => ext,
    deactivate: () => {},
  };
}

function panelToPoint(panel: PropsPanelComponent): ExtensionPoint<PropsPanelComponent> {
  return {
    id: panel.id,
    priority: panel.order,
    dependencies: [],
    activate: () => panel,
    deactivate: () => {},
  };
}

// 注册扩展槽
export function registerPropsPanelExtension(extension: PropsPanelExtension): () => void {
  if (extensionManager.getExtension(extension.id)) {
    console.warn(`[propsPanelRegistry] 扩展 "${extension.id}" 已存在，将被覆盖`);
  }
  const unregister = extensionManager.register(extensionToPoint(extension));
  console.log(`[propsPanelRegistry] 已注册扩展: ${extension.id}`);
  return unregister;
}

// 获取扩展槽（按 slot 和 condition 过滤）
export function getPropsPanelExtensions(slot: PropsPanelSlot, selectedNode: CustomNode | null): PropsPanelExtension[] {
  const exts = extensionManager.resolveOrder();
  return exts
    .map(ext => ext.activate() as PropsPanelExtension)
    .filter(ext => ext.slot === slot && (!ext.condition || ext.condition(selectedNode)));
}

// 注册面板组件
export function registerPropsPanelComponent(component: PropsPanelComponent): () => void {
  if (panelManager.getExtension(component.id)) {
    console.warn(`[propsPanelRegistry] 面板组件 "${component.id}" 已存在，将被覆盖`);
  }
  const unregister = panelManager.register(panelToPoint(component));
  console.log(`[propsPanelRegistry] 已注册面板组件: ${component.id}`);
  return unregister;
}

// 获取所有面板组件（按 order 排序）
export function getPropsPanelComponents(): PropsPanelComponent[] {
  const exts = panelManager.resolveOrder();
  return exts.map(ext => ext.activate() as PropsPanelComponent);
}

// 清空所有注册项（用于测试）
export function clearPropsPanelRegistry(): void {
  extensionManager.clear();
  panelManager.clear();
}