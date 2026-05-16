// src/mods/mod-project-config.ts
// 项目配置 Mod —— 将项目设置面板的显示/隐藏逻辑从 App.tsx 中解耦
// 监听 PROJECT_CONFIG_TOGGLE_PANEL 事件来切换面板，监听 PROJECT_CONFIG_CHANGED 来响应配置变更
// 这个 Mod 本身不持有 UI 状态，只负责事件 → 副作用的映射
// 实际的 UI 状态（面板是否打开）仍在 App.tsx 中通过 useState 管理，
// 但触发它的机制完全通过总线事件驱动，App.tsx 不再需要知道"谁"触发了面板切换

import type { EditorMod, EditorBus } from '../bus/types';
import { DEBUG } from '../../config/debug';

// 模块私有变量：存储当前配置（与 useProjectConfig Hook 共享同一个 localStorage 键）
let currentConfig = {
    outputPath: '',
    rollbackPath: '',
};

export const modProjectConfig: EditorMod = {
    id: 'project-config',
    init(bus: EditorBus) {
        if (DEBUG) console.log('[mod-project-config] 初始化');

        // 从 localStorage 加载初始配置
        try {
            const raw = localStorage.getItem('mc_project_config');
            if (raw) {
                currentConfig = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[mod-project-config] 加载配置失败，使用默认值');
        }

        // 订阅总线事件
        const unsub = bus.subscribe(({ event }) => {
            switch (event.type) {
                case 'PROJECT_CONFIG_CHANGED': {
                    // 配置已通过 Hook 更新，这里做持久化
                    const newConfig = { ...currentConfig, ...event.config };
                    currentConfig = newConfig;
                    try {
                        localStorage.setItem('mc_project_config', JSON.stringify(newConfig));
                        if (DEBUG) console.log('[mod-project-config] 配置已保存:', newConfig);
                    } catch (e) {
                        console.warn('[mod-project-config] 保存配置失败:', e);
                    }
                    break;
                }
                // PROJECT_CONFIG_TOGGLE_PANEL 事件由 App.tsx 直接监听并处理 UI 状态
                // 这里不需要处理，因为面板的显示/隐藏是纯 UI 状态，不属于工作流数据
            }
        });

        // 返回清理函数
        return () => {
            unsub();
            if (DEBUG) console.log('[mod-project-config] 已卸载');
        };
    },
};

/**
 * 获取当前已保存的项目配置
 * 供 useProjectConfig Hook 在初始化时读取
 */
export function getStoredConfig() {
    return { ...currentConfig };
}