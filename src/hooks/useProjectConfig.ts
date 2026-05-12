// src/hooks/useProjectConfig.ts
// 项目配置 Hook —— 管理输出目录和回滚备份目录的 localStorage 持久化

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'mc_project_config';  // localStorage 键名

interface ProjectConfig {
  outputPath: string;      // 输出目录路径
  rollbackPath: string;    // 回滚备份目录路径
}

const defaultConfig: ProjectConfig = {
  outputPath: '',
  rollbackPath: '',
};

/** 从 localStorage 加载配置 */
function loadConfig(): ProjectConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProjectConfig;
  } catch (e) {
    console.warn('加载项目配置失败，使用默认配置');
  }
  return { ...defaultConfig };
}

/** 保存配置到 localStorage */
function saveConfigToStorage(config: ProjectConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('保存项目配置失败');
  }
}

export function useProjectConfig() {
  const [config, setConfig] = useState<ProjectConfig>(loadConfig);

  // 配置变化时自动保存到 localStorage
  useEffect(() => {
    saveConfigToStorage(config);
  }, [config]);

  const setOutputPath = useCallback((path: string) => {
    setConfig(prev => ({ ...prev, outputPath: path }));
  }, []);

  const setRollbackPath = useCallback((path: string) => {
    setConfig(prev => ({ ...prev, rollbackPath: path }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({ ...defaultConfig });
  }, []);

  return {
    outputPath: config.outputPath,
    rollbackPath: config.rollbackPath,
    setOutputPath,
    setRollbackPath,
    resetConfig,
  };
}