// src/hooks/useProjectConfig.ts
// 扩展：支持动态注册的配置项

import { useState, useCallback, useEffect } from 'react';
import { getRegisteredConfigFields, getDefaultConfigValues, validateConfigValue } from '../registry/projectConfigRegistry';
import { DEBUG } from '../../config/debug';

const STORAGE_KEY = 'mc_project_config';

// 基础配置（原有固定字段，可保留，也可以全部转为动态注册）
// 为了向后兼容，我们保留 outputPath 和 rollbackPath 作为固定字段，
// 同时允许动态字段合并。
interface BaseConfig {
  outputPath: string;
  rollbackPath: string;
}

// 完整配置 = 基础 + 动态扩展
type FullConfig = BaseConfig & Record<string, any>;

const defaultBaseConfig: BaseConfig = {
  outputPath: '',
  rollbackPath: '',
};

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
      const dynamicPart: Record<string, any> = {};
      for (const key of Object.keys(dynamicDefaults)) {
        dynamicPart[key] = parsed[key] ?? dynamicDefaults[key];
      }
      return {
        outputPath: parsed.outputPath ?? defaultBaseConfig.outputPath,
        rollbackPath: parsed.rollbackPath ?? defaultBaseConfig.rollbackPath,
        ...dynamicPart,
      };
    }
  } catch (e) {
    console.warn('加载项目配置失败，使用默认配置');
  }
  // 返回默认值
  return {
    ...defaultBaseConfig,
    ...dynamicDefaults,
  };
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

  // 单独暴露原有字段的 setter（保持 API 兼容）
  const setOutputPath = useCallback((path: string) => setConfigValue('outputPath', path), [setConfigValue]);
  const setRollbackPath = useCallback((path: string) => setConfigValue('rollbackPath', path), [setConfigValue]);

  const resetConfig = useCallback(() => {
    const dynamicDefaults = getDefaultConfigValues();
    setConfig({
      outputPath: defaultBaseConfig.outputPath,
      rollbackPath: defaultBaseConfig.rollbackPath,
      ...dynamicDefaults,
    });
  }, []);

  // 获取所有已注册的配置项元数据
  const registeredFields = getRegisteredConfigFields();

  return {
    // 基础字段（兼容旧代码）
    outputPath: config.outputPath,
    rollbackPath: config.rollbackPath,
    setOutputPath,
    setRollbackPath,
    // 动态字段访问器（通用）
    config,           // 整个配置对象，供动态渲染使用
    setConfigValue,   // 通用设置方法
    resetConfig,
    registeredFields, // 元数据列表，供 UI 渲染
  };
}