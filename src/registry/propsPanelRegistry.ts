// src/registry/propsPanelRegistry.ts
// 属性面板扩展槽注册中心
// 允许 Mod 在属性面板顶部或底部添加自定义组件

import type { ComponentType } from 'react';
import type { CustomNode } from '../utils/types';
import type { EditorBus } from '../bus/types';

/**
 * 属性面板扩展槽位置
 */
export type PropsPanelSlot = 'top' | 'bottom';

/**
 * 扩展组件 Props
 */
export interface PropsPanelExtensionProps {
  selectedNode: CustomNode | null;   // 当前选中的节点（可能为 null）
  bus: EditorBus;                    // 事件总线实例
}

/**
 * 扩展项定义
 */
export interface PropsPanelExtension {
  id: string;                                                    // 唯一标识
  slot: PropsPanelSlot;                                          // 位置（顶部或底部）
  component: ComponentType<PropsPanelExtensionProps>;            // 渲染组件
  order?: number;                                                // 显示顺序（越小越靠上）
  condition?: (selectedNode: CustomNode | null) => boolean;      // 是否显示该扩展
}

// 存储所有注册的扩展
let extensions: PropsPanelExtension[] = [];

/**
 * 注册属性面板扩展
 * @param extension 扩展项定义
 */
export function registerPropsPanelExtension(extension: PropsPanelExtension): void {
  if (extensions.some(e => e.id === extension.id)) {
    console.warn(`[propsPanelRegistry] 扩展 "${extension.id}" 已存在，将被覆盖`);
  }
  extensions = [...extensions.filter(e => e.id !== extension.id), extension];
  extensions.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[propsPanelRegistry] 已注册属性面板扩展: ${extension.id} (slot: ${extension.slot})`);
}

/**
 * 获取指定位置的扩展组件列表（已过滤 condition）
 */
export function getPropsPanelExtensions(slot: PropsPanelSlot, selectedNode: CustomNode | null): PropsPanelExtension[] {
  return extensions.filter(ext => ext.slot === slot && (!ext.condition || ext.condition(selectedNode)));
}