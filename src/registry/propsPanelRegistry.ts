// src/registry/propsPanelRegistry.ts
import type { ComponentType } from 'react';
import type { CustomNode } from '../utils/types';
import type { EditorBus } from '../bus/types';

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

let extensions: PropsPanelExtension[] = [];
let panelComponents: PropsPanelComponent[] = [];

const sortByOrder = <T extends { order?: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

export function registerPropsPanelExtension(extension: PropsPanelExtension): () => void {
  const index = extensions.findIndex(e => e.id === extension.id);
  if (index !== -1) extensions[index] = extension;
  else extensions.push(extension);
  extensions = sortByOrder(extensions);
  console.log(`[propsPanelRegistry] 已注册扩展: ${extension.id}`);

  return () => {
    const idx = extensions.findIndex(e => e.id === extension.id);
    if (idx !== -1) {
      extensions.splice(idx, 1);
      console.log(`[propsPanelRegistry] 已卸载扩展: ${extension.id}`);
    }
  };
}

export function getPropsPanelExtensions(slot: PropsPanelSlot, selectedNode: CustomNode | null): PropsPanelExtension[] {
  return extensions.filter(ext => ext.slot === slot && (!ext.condition || ext.condition(selectedNode)));
}

export function registerPropsPanelComponent(component: PropsPanelComponent): () => void {
  const index = panelComponents.findIndex(c => c.id === component.id);
  if (index !== -1) panelComponents[index] = component;
  else panelComponents.push(component);
  panelComponents = sortByOrder(panelComponents);
  console.log(`[propsPanelRegistry] 已注册面板组件: ${component.id}`);

  return () => {
    const idx = panelComponents.findIndex(c => c.id === component.id);
    if (idx !== -1) {
      panelComponents.splice(idx, 1);
      console.log(`[propsPanelRegistry] 已卸载面板组件: ${component.id}`);
    }
  };
}

export function getPropsPanelComponents(): PropsPanelComponent[] {
  return [...panelComponents];
}

export function clearPropsPanelRegistry(): void {
  extensions = [];
  panelComponents = [];
}