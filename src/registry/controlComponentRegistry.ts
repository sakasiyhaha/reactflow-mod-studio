// src/registry/controlComponentRegistry.ts
// 内联控件组件注册中心
// 允许 Mod 动态注册新的控件类型（滑块、颜色选择器等）

import type { ComponentType } from 'react';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export interface ControlComponentProps {
  value: any;
  onChange: (newValue: any) => void;
  label?: string;
  [key: string]: any;
}

// 使用 ExtensionManager 管理控件类型
const controlManager = new ExtensionManager();

/**
 * 注册控件类型
 * @param type 控件类型标识（如 'color-picker'）
 * @param component React 组件
 * @returns 取消注册函数
 */
export function registerControlType(
  type: string,
  component: ComponentType<ControlComponentProps>
): () => void {
  if (controlManager.getExtension(type)) {
    console.warn(`[controlRegistry] 控件类型 "${type}" 已被覆盖`);
  }
  const ext: ExtensionPoint<ComponentType<ControlComponentProps>> = {
    id: type,
    priority: 100,
    dependencies: [],
    activate: () => component,
    deactivate: () => {},
  };
  const unregister = controlManager.register(ext);
  console.log(`[controlRegistry] ✅ 注册控件: ${type}`);
  return unregister;
}

/**
 * 获取控件组件
 * @param type 控件类型标识
 * @returns 组件或 undefined
 */
export function getControlComponent(
  type: string
): ComponentType<ControlComponentProps> | undefined {
  const ext = controlManager.getExtension(type);
  if (!ext) {
    if (type) console.warn(`[controlRegistry] ⚠️ 未找到控件类型: ${type}`);
    return undefined;
  }
  return ext.activate() as ComponentType<ControlComponentProps>;
}

/**
 * 检查控件类型是否已注册
 */
export function hasControlType(type: string): boolean {
  return controlManager.getExtension(type) !== undefined;
}

/**
 * 获取所有已注册的控件类型
 */
export function getRegisteredControlTypes(): string[] {
  return controlManager.resolveOrder().map(ext => ext.id);
}

/**
 * 清空所有控件类型（用于测试）
 */
export function clearControlRegistry(): void {
  controlManager.clear();
}