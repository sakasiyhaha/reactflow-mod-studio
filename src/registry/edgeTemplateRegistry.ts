// src/registry/edgeTemplateRegistry.ts
// 边类型注册中心 – 管理自定义边组件
// 支持通过 Mod 动态注册新的边类型（动画边、带标签边等）
// 默认注册 gradient 边类型并设置为默认边组件

import type { EdgeProps } from '@xyflow/react';
import type { ComponentType } from 'react';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';
import GradientEdge from '../components/GradientEdge';

// 使用 ExtensionManager 管理边类型组件
const edgeTypeManager = new ExtensionManager();

// 默认边组件（React Flow 内置，一般不需要显式设置）
let defaultEdgeComponent: ComponentType<EdgeProps> | undefined;

/**
 * 注册自定义边类型
 * @param type 边类型标识（如 'animated', 'label-edge'）
 * @param component 对应的 React 组件
 * @returns 取消注册函数
 */
export function registerEdgeType(type: string, component: ComponentType<EdgeProps>): () => void {
  if (edgeTypeManager.getExtension(type)) {
    console.warn(`[edgeRegistry] 边类型 "${type}" 已被覆盖`);
  }
  const ext: ExtensionPoint<ComponentType<EdgeProps>> = {
    id: type,
    priority: 100,
    dependencies: [],
    activate: () => component,
    deactivate: () => {},
  };
  const unregister = edgeTypeManager.register(ext);
  console.log(`[edgeRegistry] 已注册边类型: ${type}`);
  return unregister;
}

/**
 * 设置默认边组件（可选，通常 React Flow 自带 DefaultEdge）
 * @param component 默认边组件
 */
export function setDefaultEdgeComponent(component: ComponentType<EdgeProps>): void {
  defaultEdgeComponent = component;
}

/**
 * 获取所有边类型的映射（供 FlowCanvas 使用）
 */
export function getEdgeTypeMap(): Record<string, ComponentType<EdgeProps>> {
  const exts = edgeTypeManager.resolveOrder();
  const map: Record<string, ComponentType<EdgeProps>> = {};
  for (const ext of exts) {
    map[ext.id] = ext.activate();
  }
  return map;
}

/**
 * 获取默认边组件
 */
export function getDefaultEdgeComponent(): ComponentType<EdgeProps> | undefined {
  return defaultEdgeComponent;
}

/**
 * 清空所有注册的边类型（用于测试）
 */
export function clearEdgeRegistry(): void {
  edgeTypeManager.clear();
  defaultEdgeComponent = undefined;
}

// ========== 注册默认的 gradient 边类型 ==========
registerEdgeType('gradient', GradientEdge);
// 将 gradient 设置为默认边组件（当边未指定 type 或 type 不匹配时使用）
setDefaultEdgeComponent(GradientEdge);