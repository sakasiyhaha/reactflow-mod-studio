// src/registry/projectConfigRegistry.ts
// 项目设置面板配置项注册中心
// 允许 Mod 动态添加自定义配置字段

import type { ComponentType } from 'react';

/**
 * 配置项的数据类型
 */
export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'color' | 'select';

/**
 * 配置项定义
 */
export interface ConfigField {
  key: string;                           // 唯一标识，存储到 localStorage 的键名
  label: string;                         // 显示标签
  type: ConfigFieldType;                 // 类型
  defaultValue: any;                     // 默认值
  placeholder?: string;                  // 输入框占位提示
  options?: Array<{ label: string; value: any }>; // 当 type 为 'select' 时使用
  validate?: (value: any) => boolean;    // 校验函数，返回 false 时显示错误（可选）
  component?: ComponentType<{ value: any; onChange: (val: any) => void }>; // 自定义渲染组件（可选）
  order?: number;                        // 显示顺序（越小越靠上）
}

// 存储所有注册的配置项
let registeredFields: ConfigField[] = [];

/**
 * 注册一个配置项
 * @param field 配置项定义
 */
export function registerProjectConfigField(field: ConfigField): void {
  if (registeredFields.some(f => f.key === field.key)) {
    console.warn(`[configRegistry] 配置项 "${field.key}" 已存在，将被覆盖`);
  }
  registeredFields = [...registeredFields.filter(f => f.key !== field.key), field];
  registeredFields.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  console.log(`[configRegistry] 已注册配置项: ${field.key}`);
}

/**
 * 获取所有已注册的配置项
 */
export function getRegisteredConfigFields(): ConfigField[] {
  return [...registeredFields];
}

/**
 * 获取配置项的默认值合并对象（用于初始化 useProjectConfig）
 */
export function getDefaultConfigValues(): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const field of registeredFields) {
    defaults[field.key] = field.defaultValue;
  }
  return defaults;
}

/**
 * 校验配置值
 * @param key 配置项 key
 * @param value 值
 * @returns 是否合法
 */
export function validateConfigValue(key: string, value: any): boolean {
  const field = registeredFields.find(f => f.key === key);
  if (!field) return true;
  if (field.validate) return field.validate(value);
  return true;
}