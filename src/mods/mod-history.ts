// src/mods/mod-history.ts
// 历史记录 Mod - 使用状态对比法正确记录操作前的状态
// 支持动态配置最大历史步数，支持注册忽略事件类型
// 新增：派发 SET_TOOLBAR_ENABLED 事件控制撤销/重做按钮状态
// 优化：使用 fromHistory 标志代替 isUndoRedo + setTimeout

import type { EditorMod, EditorBus, EditorState } from '../bus/types';
import { getMaxHistory } from '../../constants/editor';
import { isHistoryIgnoredEventType } from '../registry/historyIgnoreRegistry';
import { DEBUG } from '../../config/debug';
import { syncIdCounter } from '../utils';

let past: EditorState[] = [];
let future: EditorState[] = [];
let lastState: EditorState | null = null;

function takeSnapshot(state: EditorState): EditorState {
    return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selection: [...state.selection],
        mode: state.mode,
    };
}

function updateToolbarState(bus: EditorBus) {
    bus.dispatch({
        type: 'SET_TOOLBAR_ENABLED',
        payload: { buttonId: 'undo', enabled: past.length > 0 }
    });
    bus.dispatch({
        type: 'SET_TOOLBAR_ENABLED',
        payload: { buttonId: 'redo', enabled: future.length > 0 }
    });
}

function recordCurrentStateAsHistory(state: EditorState, bus: EditorBus) {
    const snapshot = takeSnapshot(state);
    past.push(snapshot);
    const maxHistory = getMaxHistory();
    if (past.length > maxHistory) past.shift();
    future = [];
    if (DEBUG) console.log(`[history] 📸 记录历史点 | past:${past.length} future:0 | 节点数:${state.nodes.length}`);
    updateToolbarState(bus);
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
        recordCurrentStateAsHistory(initState, bus);

        const unsub = bus.subscribe(({ event, state }) => {
            // 如果事件来自撤销/重做操作本身，不记录历史点
            if (event.type === 'WORKFLOW_LOADED' && event.fromHistory === true) {
                if (DEBUG) console.log('[history] 跳过来自撤销/重做的历史记录');
                return;
            }

            if (isHistoryIgnoredEventType(event.type)) return;

            if (lastState) {
                const hasChanged = JSON.stringify(lastState.nodes) !== JSON.stringify(state.nodes) ||
                                   JSON.stringify(lastState.edges) !== JSON.stringify(state.edges);
                if (hasChanged) {
                    recordCurrentStateAsHistory(lastState, bus);
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
                const currentState = bus.getState();
                future.push(takeSnapshot(currentState));
                const prevState = past.pop()!;
                if (DEBUG) console.log(`[history] ↩️ 撤销 | past:${past.length} future:${future.length} 恢复到 ${prevState.nodes.length} 个节点`);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: prevState.nodes, edges: prevState.edges, fromHistory: true });
                lastState = takeSnapshot(prevState);
                updateToolbarState(bus);
            } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
                e.preventDefault();
                if (future.length === 0) {
                    if (DEBUG) console.log('[history] ⚠️ 无法重做：future 为空');
                    return;
                }
                const currentState = bus.getState();
                past.push(takeSnapshot(currentState));
                const nextState = future.pop()!;
                if (DEBUG) console.log(`[history] ↩️↩️ 重做 | past:${past.length} future:${future.length} 恢复到 ${nextState.nodes.length} 个节点`);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: nextState.nodes, edges: nextState.edges, fromHistory: true });
                lastState = takeSnapshot(nextState);
                updateToolbarState(bus);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        updateToolbarState(bus);

        return () => {
            unsub();
            window.removeEventListener('keydown', handleKeyDown);
            past = [];
            future = [];
            lastState = null;
            if (DEBUG) console.log('[history] 已卸载');
        };
    },
};