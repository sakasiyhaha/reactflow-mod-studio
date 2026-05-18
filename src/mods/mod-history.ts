// src/mods/mod-history.ts
// 历史记录 Mod - 使用状态对比法正确记录操作前的状态
// 支持动态配置最大历史步数（通过 constants/editor 中的 getMaxHistory 读取 localStorage）

import type { EditorMod, EditorBus, EditorState } from '../bus/types';
import { getMaxHistory } from '../../constants/editor';
import { DEBUG } from '../../config/debug';
import { syncIdCounter } from '../utils';

// 历史栈（存储操作前的状态快照）
let past: EditorState[] = [];
let future: EditorState[] = [];
let lastState: EditorState | null = null;   // 上一次的状态（用于对比）
let isUndoRedo = false;                     // 正在执行撤销/重做，禁止记录新历史

// 深拷贝状态
function takeSnapshot(state: EditorState): EditorState {
    return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selection: [...state.selection],
        mode: state.mode,
    };
}

// 记录当前状态到 past（作为历史点）
function recordCurrentStateAsHistory(state: EditorState) {
    if (isUndoRedo) return;
    const snapshot = takeSnapshot(state);
    past.push(snapshot);
    // 动态获取最大历史深度限制
    const maxHistory = getMaxHistory();
    if (past.length > maxHistory) past.shift();
    future = [];   // 新操作清空重做栈
    if (DEBUG) console.log(`[history] 📸 记录历史点 | past:${past.length} future:0 | 节点数:${state.nodes.length}`);
}

// 判断是否应忽略快捷键的输入框
function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export const modHistory: EditorMod = {
    id: 'history',
    init(bus: EditorBus) {
        // 初始化时记录一次初始状态
        const initState = bus.getState();
        lastState = takeSnapshot(initState);
        recordCurrentStateAsHistory(initState); // 将初始状态作为第一个历史点

        // 订阅所有事件，用于状态变化检测
        const unsub = bus.subscribe(({ event, state }) => {
            if (isUndoRedo) return;

            // 需要忽略的事件（不触发历史记录）
            const IGNORED_EVENTS = new Set([
                'HISTORY_UNDO', 'HISTORY_REDO', 'SELECTION_CHANGED',
                'MODE_CHANGED', 'APPLY_NODE_CHANGES', 'PROJECT_CONFIG_TOGGLE_PANEL'
            ]);
            if (IGNORED_EVENTS.has(event.type)) return;

            // 状态对比：如果当前状态与上一次状态不同，说明发生了变更
            if (lastState) {
                const hasChanged = JSON.stringify(lastState.nodes) !== JSON.stringify(state.nodes) ||
                                   JSON.stringify(lastState.edges) !== JSON.stringify(state.edges);
                if (hasChanged) {
                    // 将上一次的状态（操作前的状态）存入历史栈
                    recordCurrentStateAsHistory(lastState);
                    if (DEBUG) console.log(`[history] 🔄 检测到状态变化，已记录历史点`);
                }
            }
            // 更新 lastState 为当前状态
            lastState = takeSnapshot(state);
        });

        // 键盘快捷键处理
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const key = e.key.toLowerCase();

            // 撤销 Ctrl+Z
            if (key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (past.length === 0) {
                    if (DEBUG) console.log('[history] ⚠️ 无法撤销：past 为空');
                    return;
                }
                isUndoRedo = true;
                // 保存当前状态到 future
                const currentState = bus.getState();
                future.push(takeSnapshot(currentState));
                // 弹出上一个历史状态
                const prevState = past.pop()!;
                if (DEBUG) console.log(`[history] ↩️ 撤销 | past:${past.length} future:${future.length} 恢复到 ${prevState.nodes.length} 个节点`);
                // 恢复状态
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: prevState.nodes, edges: prevState.edges });
                // 更新 lastState 为恢复后的状态，并重置标志
                lastState = takeSnapshot(prevState);
                setTimeout(() => { isUndoRedo = false; }, 0);
            }
            // 重做 Ctrl+Y 或 Ctrl+Shift+Z
            else if (key === 'y' || (key === 'z' && e.shiftKey)) {
                e.preventDefault();
                if (future.length === 0) {
                    if (DEBUG) console.log('[history] ⚠️ 无法重做：future 为空');
                    return;
                }
                isUndoRedo = true;
                const currentState = bus.getState();
                past.push(takeSnapshot(currentState));
                const nextState = future.pop()!;
                if (DEBUG) console.log(`[history] ↩️↩️ 重做 | past:${past.length} future:${future.length} 恢复到 ${nextState.nodes.length} 个节点`);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: nextState.nodes, edges: nextState.edges });
                lastState = takeSnapshot(nextState);
                setTimeout(() => { isUndoRedo = false; }, 0);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // 清理函数
        return () => {
            unsub();
            window.removeEventListener('keydown', handleKeyDown);
            past = [];
            future = [];
            lastState = null;
            isUndoRedo = false;
            if (DEBUG) console.log('[history] 已卸载');
        };
    },
};