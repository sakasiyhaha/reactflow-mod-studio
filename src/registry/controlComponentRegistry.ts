// src/registry/controlComponentRegistry.ts
// 内联控件组件注册中心
// 允许 Mod 动态注册新的控件类型（滑块、颜色选择器等）

import type { ComponentType } from 'react';

/**
 * 控件组件的 Props 接口
 */
export interface ControlComponentProps {
  value: any;                                    // 当前值
  onChange: (newValue: any) => void;             // 值变更回调
  label?: string;                                // 可选标签
  [key: string]: any;                            // 其他配置项（如 min, max, step 等）
}

/**
 * 控件定义
 */
export interface ControlDefinition {
  type: string;                                   // 控件类型标识（如 'color-picker'）
  component: ComponentType<ControlComponentProps>; // 渲染组件
}

// 控件类型映射表
const controlMap = new Map<string, ComponentType<ControlComponentProps>>();

/**
 * 注册控件类型
 * @param type 控件类型标识
 * @param component React 组件
 */
export function registerControlType(
  type: string,
  component: ComponentType<ControlComponentProps>
): void {
  if (controlMap.has(type)) {
    console.warn(`[controlRegistry] 控件类型 "${type}" 已被覆盖`);
  }
  controlMap.set(type, component);
  console.log(`[controlRegistry] ✅ 注册控件: ${type}`, { componentName: component.name });
}

/**
 * 获取控件组件
 * @param type 控件类型标识
 * @returns 组件或 undefined
 */
export function getControlComponent(
  type: string
): ComponentType<ControlComponentProps> | undefined {
  const comp = controlMap.get(type);
  if (!comp && type) console.warn(`[controlRegistry] ⚠️ 未找到控件类型: ${type}`);
  return comp;
}

/**
 * 检查控件类型是否已注册
 */
export function hasControlType(type: string): boolean {
  return controlMap.has(type);
}

/**
 * 获取所有已注册的控件类型
 */
export function getRegisteredControlTypes(): string[] {
  return Array.from(controlMap.keys());
}