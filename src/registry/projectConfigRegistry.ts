// src/registry/projectConfigRegistry.ts
// 项目设置面板配置项注册中心
// 允许 Mod 动态添加自定义配置字段
// 已改造为使用 ExtensionPoint 管理
// 新增：helperText 字段，用于显示配置项的帮助提示

import type { ComponentType } from 'react';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';

export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'color' | 'select';

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  defaultValue: any;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validate?: (value: any) => boolean;
  component?: ComponentType<{ value: any; onChange: (val: any) => void }>;
  order?: number;
  /** 帮助提示文本，显示在输入控件下方，用于指导用户 */
  helperText?: string;
}

// 使用 ExtensionManager 管理配置项
const configManager = new ExtensionManager();

/**
 * 注册一个配置项
 * @param field 配置项定义
 * @returns 取消注册函数
 */
export function registerProjectConfigField(field: ConfigField): () => void {
  if (configManager.getExtension(field.key)) {
    console.warn(`[configRegistry] 配置项 "${field.key}" 已存在，将被覆盖`);
  }
  const ext: ExtensionPoint<ConfigField> = {
    id: field.key,
    priority: field.order ?? 100,
    dependencies: [],
    activate: () => field,
    deactivate: () => {},
  };
  const unregister = configManager.register(ext);
  console.log(`[configRegistry] 已注册配置项: ${field.key}`);
  return unregister;
}

/**
 * 获取所有已注册的配置项（按 order 排序）
 */
export function getRegisteredConfigFields(): ConfigField[] {
  const exts = configManager.resolveOrder();
  return exts.map(ext => ext.activate() as ConfigField);
}

/**
 * 获取配置项的默认值合并对象（用于初始化 useProjectConfig）
 */
export function getDefaultConfigValues(): Record<string, any> {
  const fields = getRegisteredConfigFields();
  const defaults: Record<string, any> = {};
  for (const field of fields) {
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
  const ext = configManager.getExtension(key);
  if (!ext) return true;
  const field = ext.activate() as ConfigField;
  if (field.validate) return field.validate(value);
  return true;
}

/**
 * 清空所有配置项（用于测试）
 */
export function clearConfigRegistry(): void {
  configManager.clear();
}