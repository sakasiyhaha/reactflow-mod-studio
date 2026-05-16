// src/bus/useEditorBus.ts
// 事件总线 React Hook 实现
// 使用 useReducer 管理状态，提供 dispatch / subscribe / getState
// 修复：确保订阅者在微任务中读取到的 stateRef 是最新状态（解决历史记录、自动保存等 Mod 拿到旧状态的问题）

import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react';
import type { EditorState, EditorEvent, EditorBus, Listener } from './types';
import { applyDownstreamValues } from '../utils/nodeHelpers';
import { DEBUG } from '../../config/debug';

// ==================== Reducer：根据事件纯函数更新状态 ====================
function editorReducer(state: EditorState, event: EditorEvent): EditorState {
  switch (event.type) {
    // 添加单个节点（自动去重，相同 ID 的节点不会被重复添加）
    case 'NODE_ADDED': {
      if (state.nodes.some(n => n.id === event.node.id)) {
        if (DEBUG) console.warn(`[Bus] NODE_ADDED 重复 ID: ${event.node.id}，已忽略`);
        return state; // 直接返回原状态，不触发重渲染
      }
      if (DEBUG) console.log(`[Bus] NODE_ADDED`, event.node.id);
      return { ...state, nodes: [...state.nodes, event.node] };
    }

    // 批量添加节点，同样去重
    case 'NODES_ADDED': {
      const existingIds = new Set(state.nodes.map(n => n.id));
      const newNodes = event.nodes.filter(n => !existingIds.has(n.id));
      if (newNodes.length === 0) return state;
      if (DEBUG) console.log(`[Bus] NODES_ADDED`, newNodes.length);
      return { ...state, nodes: [...state.nodes, ...newNodes] };
    }

    // 删除节点：同时删除以这些节点为起点或终点的边，并从选中列表中移除
    case 'NODE_DELETED': {
      if (DEBUG) console.log(`[Bus] NODE_DELETED`, event.nodeIds);
      const deleteSet = new Set(event.nodeIds);
      return {
        ...state,
        nodes: state.nodes.filter(n => !deleteSet.has(n.id)),
        edges: state.edges.filter(e => !deleteSet.has(e.source) && !deleteSet.has(e.target)),
        selection: state.selection.filter(id => !deleteSet.has(id)),
      };
    }

    // 更新节点数据，同时支持向下游传播 value 变化（如数值输入传给显示输出）
    case 'NODE_DATA_CHANGED': {
      if (DEBUG) console.log(`[Bus] NODE_DATA_CHANGED`, event.nodeId);
      let newNodes = state.nodes.map(n =>
        n.id === event.nodeId ? { ...n, data: { ...n.data, ...event.data } } : n
      );
      // 如果包含了 value 且 propagate 不为 false，则传播到下游节点
      if (event.propagate !== false && event.data.value !== undefined) {
        newNodes = applyDownstreamValues(event.nodeId, event.data.value, newNodes, state.edges);
      }
      return { ...state, nodes: newNodes };
    }

    // 切换锁定状态
    case 'NODE_LOCK_TOGGLED': {
      if (DEBUG) console.log(`[Bus] NODE_LOCK_TOGGLED`, event.nodeId);
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === event.nodeId ? { ...n, data: { ...n.data, locked: !n.data.locked } } : n
        ),
      };
    }

    // 更新节点位置（批量更新）
    case 'NODE_POSITIONS_CHANGED': {
      if (DEBUG) console.log(`[Bus] NODE_POSITIONS_CHANGED`, event.updates.length);
      const updateMap = new Map(event.updates.map(u => [u.id, u.position]));
      return {
        ...state,
        nodes: state.nodes.map(n => {
          const newPos = updateMap.get(n.id);
          return newPos ? { ...n, position: newPos } : n;
        }),
      };
    }

    // 添加边
    case 'EDGE_ADDED': {
      if (DEBUG) console.log(`[Bus] EDGE_ADDED`);
      return { ...state, edges: [...state.edges, event.edge] };
    }

    // 删除边
    case 'EDGE_DELETED': {
      if (DEBUG) console.log(`[Bus] EDGE_DELETED`, event.edgeId);
      return { ...state, edges: state.edges.filter(e => e.id !== event.edgeId) };
    }

    // 重连：删除旧边，创建新边
    case 'EDGE_RECONNECTED': {
      if (DEBUG) console.log(`[Bus] EDGE_RECONNECTED`, event.oldEdgeId);
      const newEdge = {
        ...event.newConnection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, // 生成新 ID
      };
      return {
        ...state,
        edges: [...state.edges.filter(e => e.id !== event.oldEdgeId), newEdge],
      };
    }

    // 选中变化：更新 selection 列表，同时同步节点的 selected 属性（供 React Flow 高亮）
    case 'SELECTION_CHANGED': {
      // 如果选中内容没有改变，则跳过（防止无限循环）
      if (
        state.selection.length === event.nodeIds.length &&
        state.selection.every((id, idx) => id === event.nodeIds[idx])
      ) {
        return state;
      }
      const newSelectionSet = new Set(event.nodeIds);
      const newNodes = state.nodes.map(n => ({
        ...n,
        selected: newSelectionSet.has(n.id),
      }));
      if (DEBUG) console.log(`[Bus] SELECTION_CHANGED`, event.nodeIds);
      return { ...state, nodes: newNodes, selection: event.nodeIds };
    }

    // 切换模式
    case 'MODE_CHANGED': {
      if (DEBUG) console.log(`[Bus] MODE_CHANGED`, event.mode);
      return { ...state, mode: event.mode };
    }

    // 加载工作流：替换所有节点和边，清空选中和模式
    case 'WORKFLOW_LOADED': {
      if (DEBUG) console.log(`[Bus] WORKFLOW_LOADED`);
      return {
        ...state,
        nodes: event.nodes,
        edges: event.edges,
        selection: [],
        mode: 'default',
      };
    }

    // 内部使用：直接替换节点数组（用于与 React Flow 内部状态同步）
    case 'APPLY_NODE_CHANGES': {
      return { ...state, nodes: event.nodes };
    }

    // 以下事件不直接修改状态，由 Mod 监听后产生实际效果
    case 'HISTORY_UNDO':
    case 'HISTORY_REDO':
    case 'BATCH_CONNECT_START':
    case 'BATCH_CONNECT_EXECUTE':
    case 'BATCH_CONNECT_CANCEL':
    case 'RECONNECT_START':
    case 'RECONNECT_END':
      return state;

    default:
      console.warn('[Bus] 未处理的事件类型:', event);
      return state;
  }
}

const initialState: EditorState = {
  nodes: [],
  edges: [],
  selection: [],
  mode: 'default',
};

// ==================== 自定义 Hook ====================
export function useEditorBus() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // 始终保持最新的 state 引用，供回调中同步读取
  const stateRef = useRef(state);
  // 注意：stateRef 的更新不再依赖 useEffect，而是在 busDispatch 中手动同步
  // 这里仅用于初始化，后续更新完全由 busDispatch 负责
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 订阅者存储，使用 Map 便于移除
  const listenersRef = useRef<Map<number, Listener>>(new Map());
  const nextIdRef = useRef(0);

  // 派发事件：修复核心 bug —— 确保订阅者拿到的是更新后的最新状态
  const busDispatch = useCallback((event: EditorEvent) => {
    // 关键修复：手动调用 reducer 计算新状态（reducer 是纯函数，无副作用）
    const newState = editorReducer(stateRef.current, event);
    // 立即更新 stateRef，保证在微任务执行前 stateRef 已是最新
    stateRef.current = newState;
    // 调用 React 的 dispatch，触发组件重渲染（同步更新 UI）
    dispatch(event);
    // 在微任务中通知所有订阅者，此时 stateRef.current 已经是最新状态
    Promise.resolve().then(() => {
      const currentState = stateRef.current;
      listenersRef.current.forEach((listener) => {
        try {
          listener({ event, state: currentState });
        } catch (err) {
          console.error('[Bus] 监听器执行错误:', err);
        }
      });
    });
  }, []);

  // 订阅：返回取消订阅函数
  const subscribe = useCallback((listener: Listener) => {
    const id = nextIdRef.current++;
    listenersRef.current.set(id, listener);
    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  // 获取最新状态（非响应式，用于事件回调中）
  const getState = useCallback((): EditorState => {
    return stateRef.current;
  }, []);

  // 使用 useMemo 稳定 bus 对象引用，避免父组件不必要的 effect 重复注册
  const bus: EditorBus = useMemo(() => ({
    getState,
    dispatch: busDispatch,
    subscribe,
  }), [getState, busDispatch, subscribe]);

  return { state, bus };
}