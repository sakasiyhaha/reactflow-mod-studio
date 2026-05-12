// src/mods/mod-history.ts
// 历史记录 Mod - 监听所有变更事件，维护 past/future 快照栈
// 替代 useHistory Hook 的大部分逻辑
// 当收到 HISTORY_UNDO / HISTORY_REDO 事件时，从栈中取出快照并恢复

import type { EditorMod, EditorBus, EditorState } from '../bus/types';
import { MAX_HISTORY } from '../../constants/editor';
import { DEBUG } from '../../config/debug';
import { syncIdCounter } from '../utils'; // 新增导入

// ==================== 内部状态（模块私有） ====================
let past: EditorState[] = [];       // 过去快照栈
let future: EditorState[] = [];     // 未来快照栈（重做时使用）
let isRestoring = false;            // 标志：是否正在执行还原操作（防止还原时误记录快照）

// ==================== 辅助函数 ====================
/** 深拷贝当前状态，生成一个不可变快照 */
function takeSnapshot(state: EditorState): EditorState {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    selection: [...state.selection],
    mode: state.mode,
  };
}

/** 将当前状态存入 past 栈，并清空 future 栈（新操作导致重做不可用） */
function pushSnapshot(state: EditorState) {
  if (isRestoring) return;          // 还原过程中不记录

  const snapshot = takeSnapshot(state);
  past.push(snapshot);
  if (past.length > MAX_HISTORY) past.shift();   // 限制最大历史步数
  future = [];                     // 清空未来栈

  if (DEBUG) console.log(`[mod-history] 快照存入 past:${past.length}, future:0`);
}

// ==================== Mod 定义 ====================
export const modHistory: EditorMod = {
  id: 'history',
  init(bus: EditorBus) {
    // 订阅所有事件
    const unsub = bus.subscribe(({ event, state }) => {
      if (isRestoring) return; // 还原过程中跳过，避免循环记录

      switch (event.type) {
        // ----- 需要记录快照的事件（工作流拓扑发生变化） -----
        case 'NODE_ADDED':
        case 'NODES_ADDED':
        case 'NODE_DELETED':
        case 'NODE_DATA_CHANGED':
        case 'NODE_POSITIONS_CHANGED':
        case 'EDGE_ADDED':
        case 'EDGE_DELETED':
        case 'EDGE_RECONNECTED':
          pushSnapshot(state);
          break;

        // ----- 工作流加载（导入/重置）：清空历史，记录初始快照，并同步 ID 计数器 -----
        case 'WORKFLOW_LOADED':
          past = [];
          future = [];
          pushSnapshot(state);
          // 关键修复：根据加载的节点同步 ID 生成器，防止新节点 ID 冲突
          syncIdCounter(event.nodes);
          break;

        // ----- 撤销命令 -----
        case 'HISTORY_UNDO': {
          if (past.length === 0) {
            if (DEBUG) console.log('[mod-history] 无法撤销：past 为空');
            return;
          }
          isRestoring = true;

          future.push(takeSnapshot(state));     // 当前状态存入未来栈
          const prev = past.pop()!;             // 取出上一个快照

          if (DEBUG) console.log(`[mod-history] 撤销 → past:${past.length}, future:${future.length}`);
          bus.dispatch({
            type: 'WORKFLOW_LOADED',
            nodes: prev.nodes,
            edges: prev.edges,
          });

          // 延迟重置标志，确保 WORKFLOW_LOADED 事件处理完再解除保护
          Promise.resolve().then(() => { isRestoring = false; });
          break;
        }

        // ----- 重做命令 -----
        case 'HISTORY_REDO': {
          if (future.length === 0) {
            if (DEBUG) console.log('[mod-history] 无法重做：future 为空');
            return;
          }
          isRestoring = true;

          past.push(takeSnapshot(state));       // 当前状态存入 past
          const next = future.pop()!;           // 取出最近一个未来快照

          if (DEBUG) console.log(`[mod-history] 重做 → past:${past.length}, future:${future.length}`);
          bus.dispatch({
            type: 'WORKFLOW_LOADED',
            nodes: next.nodes,
            edges: next.edges,
          });

          Promise.resolve().then(() => { isRestoring = false; });
          break;
        }
      }
    });

    // 返回清理函数：移除订阅，重置所有内部状态
    return () => {
      unsub();
      past = [];
      future = [];
      isRestoring = false;
      if (DEBUG) console.log('[mod-history] 已卸载，历史清空');
    };
  },
};