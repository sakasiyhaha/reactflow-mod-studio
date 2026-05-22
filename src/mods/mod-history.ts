// src/mods/mod-history.ts
// 历史记录 Mod - 使用状态对比法正确记录操作前的状态
// 支持动态配置最大历史步数，支持注册忽略事件类型

import type { EditorMod, EditorBus, EditorState } from '../bus/types';
import { getMaxHistory } from '../../constants/editor';
import { isHistoryIgnoredEventType } from '../registry/historyIgnoreRegistry';
import { DEBUG } from '../../config/debug';
import { syncIdCounter } from '../utils';

let past: EditorState[] = [];
let future: EditorState[] = [];
let lastState: EditorState | null = null;
let isUndoRedo = false;

function takeSnapshot(state: EditorState): EditorState {
    return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selection: [...state.selection],
        mode: state.mode,
    };
}

function recordCurrentStateAsHistory(state: EditorState) {
    if (isUndoRedo) return;
    const snapshot = takeSnapshot(state);
    past.push(snapshot);
    const maxHistory = getMaxHistory();
    if (past.length > maxHistory) past.shift();
    future = [];
    if (DEBUG) console.log(`[history] 📸 记录历史点 | past:${past.length} future:0 | 节点数:${state.nodes.length}`);
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export const modHistory: EditorMod = {
    id: 'history',
    init(bus: EditorBus) {
        const initState = bus.getState();
        lastState = takeSnapshot(initState);
        recordCurrentStateAsHistory(initState);

        const unsub = bus.subscribe(({ event, state }) => {
            if (isUndoRedo) return;

            // 使用注册中心判断是否应忽略
            if (isHistoryIgnoredEventType(event.type)) return;

            if (lastState) {
                const hasChanged = JSON.stringify(lastState.nodes) !== JSON.stringify(state.nodes) ||
                                   JSON.stringify(lastState.edges) !== JSON.stringify(state.edges);
                if (hasChanged) {
                    recordCurrentStateAsHistory(lastState);
                    if (DEBUG) console.log(`[history] 🔄 检测到状态变化，已记录历史点`);
                }
            }
            lastState = takeSnapshot(state);
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const key = e.key.toLowerCase();

            if (key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (past.length === 0) {
                    if (DEBUG) console.log('[history] ⚠️ 无法撤销：past 为空');
                    return;
                }
                isUndoRedo = true;
                const currentState = bus.getState();
                future.push(takeSnapshot(currentState));
                const prevState = past.pop()!;
                if (DEBUG) console.log(`[history] ↩️ 撤销 | past:${past.length} future:${future.length} 恢复到 ${prevState.nodes.length} 个节点`);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: prevState.nodes, edges: prevState.edges });
                lastState = takeSnapshot(prevState);
                setTimeout(() => { isUndoRedo = false; }, 0);
            } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
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