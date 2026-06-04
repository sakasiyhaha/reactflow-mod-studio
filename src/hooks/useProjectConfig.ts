// src/hooks/useProjectConfig.ts
// 项目配置管理 Hook
// 扩展：支持动态注册的配置项
// 重构：将 hardcoded 的 outputPath/rollbackPath 迁移至动态配置对象中
// 保留向后兼容的 API（outputPath, setOutputPath, rollbackPath, setRollbackPath）

import { useState, useCallback, useEffect } from 'react';
import { getRegisteredConfigFields, getDefaultConfigValues, validateConfigValue } from '../registry/projectConfigRegistry';
import { DEBUG } from '../../config/debug';

const STORAGE_KEY = 'mc_project_config';

// 完整配置 = 动态扩展字段（无硬编码字段，全部由注册中心提供）
type FullConfig = Record<string, any>;

/**
 * 加载存储的配置（合并动态字段默认值）
 */
function loadConfig(): FullConfig {
  const dynamicDefaults = getDefaultConfigValues();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 合并：动态字段取存储值或默认值
      const result: FullConfig = {};
      for (const key of Object.keys(dynamicDefaults)) {
        result[key] = parsed[key] ?? dynamicDefaults[key];
      }
      return result;
    }
  } catch (e) {
    console.warn('加载项目配置失败，使用默认配置');
  }
  // 返回默认值
  return { ...dynamicDefaults };
}

/**
 * 保存配置到 localStorage
 */
function saveConfigToStorage(config: FullConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('保存项目配置失败');
  }
}

export function useProjectConfig() {
  const [config, setConfig] = useState<FullConfig>(loadConfig);

  // 配置变化时自动保存到 localStorage
  useEffect(() => {
    saveConfigToStorage(config);
    if (DEBUG) console.log('[useProjectConfig] 配置已保存', config);
  }, [config]);

  // 通用设置方法
  const setConfigValue = useCallback(<K extends keyof FullConfig>(key: K, value: FullConfig[K]) => {
    if (!validateConfigValue(key as string, value)) {
      console.warn(`[useProjectConfig] 配置项 "${String(key)}" 校验失败，值:`, value);
      return;
    }
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // 为了向后兼容，保留 outputPath 和 rollbackPath 的 getter/setter
  // 它们只是从 config 对象中读取和写入
  const outputPath = config.outputPath ?? '';
  const rollbackPath = config.rollbackPath ?? '';

  const setOutputPath = useCallback((path: string) => {
    setConfigValue('outputPath', path);
  }, [setConfigValue]);

  const setRollbackPath = useCallback((path: string) => {
    setConfigValue('rollbackPath', path);
  }, [setConfigValue]);

  const resetConfig = useCallback(() => {
    const dynamicDefaults = getDefaultConfigValues();
    setConfig({ ...dynamicDefaults });
  }, []);

  // 获取所有已注册的配置项元数据
  const registeredFields = getRegisteredConfigFields();

  return {
    // 基础字段（兼容旧代码）
    outputPath,
    rollbackPath,
    setOutputPath,
    setRollbackPath,
    // 动态字段访问器（通用）
    config,           // 整个配置对象，供动态渲染使用
    setConfigValue,   // 通用设置方法
    resetConfig,
    registeredFields, // 元数据列表，供 UI 渲染
  };
}