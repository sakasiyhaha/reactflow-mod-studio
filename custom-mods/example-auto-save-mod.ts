// custom-mods/example-auto-save-mod.ts
// 自动保存 Mod - 优化版（响应撤销/重做立即保存）
// 功能：监听节点/边的增删改事件，自动将工作流保存到 localStorage
// 逻辑：
//   - WORKFLOW_LOADED 事件 → 立即保存（撤销/重做/加载文件后立刻持久化）
//   - 其他变更事件 → 防抖 500ms 保存（避免高频写入）
//   - 页面关闭前强制保存

import type { EditorMod, EditorBus } from '../src/bus/types';

const SAVE_DELAY_MS = 500;      // 防抖延迟
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;            // 防止并发保存

/** 实际保存逻辑（异步但不阻塞） */
async function performSave(bus: EditorBus) {
    if (isSaving) return;
    isSaving = true;
    try {
        const state = bus.getState();
        const data = {
            nodes: state.nodes,
            edges: state.edges,
            version: 1,
            timestamp: Date.now(),
        };
        localStorage.setItem('auto-saved-workflow', JSON.stringify(data));
        console.log('[auto-save] ✅ 已保存', new Date().toLocaleTimeString());
    } catch (e) {
        console.warn('[auto-save] 保存失败:', e);
    } finally {
        isSaving = false;
    }
}

/** 防抖保存（取消之前的定时器，重新计时） */
function debouncedSave(bus: EditorBus) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        performSave(bus);
        saveTimer = null;
    }, SAVE_DELAY_MS);
}

/** 立即保存（清除防抖定时器，直接保存） */
function immediateSave(bus: EditorBus) {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    performSave(bus);
}

export const exampleAutoSaveMod: EditorMod = {
    id: 'example-auto-save',
    init(bus: EditorBus) {
        // 需要触发自动保存的事件类型
        const AUTO_SAVE_EVENTS = new Set([
            'NODE_ADDED', 'NODES_ADDED', 'NODE_DELETED',
            'NODE_DATA_CHANGED', 'NODE_POSITIONS_CHANGED',
            'EDGE_ADDED', 'EDGE_DELETED', 'EDGE_RECONNECTED',
            'WORKFLOW_LOADED',   // 撤销/重做/加载工作流时触发
        ]);

        const unsubscribe = bus.subscribe(({ event }) => {
            if (!AUTO_SAVE_EVENTS.has(event.type)) return;

            if (event.type === 'WORKFLOW_LOADED') {
                // 撤销/重做/加载 → 立即保存，确保历史状态被持久化
                immediateSave(bus);
                console.log('[auto-save] 🔄 检测到 WORKFLOW_LOADED，立即保存');
            } else {
                // 普通变更 → 防抖保存
                debouncedSave(bus);
            }
        });

        // 页面关闭前强制保存
        const handleBeforeUnload = () => {
            if (saveTimer) {
                clearTimeout(saveTimer);
                performSave(bus);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribe();
            if (saveTimer) clearTimeout(saveTimer);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            console.log('[auto-save] 自动保存 Mod 已卸载');
        };
    },
};