// src/bus/useEditorBus.ts
// 事件总线 React Hook 实现
// 使用 useReducer 管理状态，提供 dispatch / subscribe / getState
// 修复：确保订阅者在微任务中读取到的 stateRef 是最新状态（解决历史记录、自动保存等 Mod 拿到旧状态的问题）
// 修复：在 WORKFLOW_LOADED 时同步 ID 计数器，避免新节点 ID 冲突

import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react';
import type { EditorState, EditorEvent, EditorBus, Listener } from './types';
import { applyDownstreamValues } from '../utils/nodeHelpers';
import { syncIdCounter } from '../utils';
import { DEBUG } from '../../config/debug';

// ==================== Reducer：根据事件纯函数更新状态 ====================
function editorReducer(state: EditorState, event: EditorEvent): EditorState {
  switch (event.type) {
    // 添加单个节点（自动去重，相同 ID 的节点不会被重复添加）
    case 'NODE_ADDED': {
      if (state.nodes.some(n => n.id === event.node.id)) {
        if (DEBUG) console.warn(`[Bus] NODE_ADDED 重复 ID: ${event.node.id}，已忽略`);
        return state;
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

    // 更新节点数据，同时支持向下游传播 value 变化
    case 'NODE_DATA_CHANGED': {
      if (DEBUG) console.log(`[Bus] 🛠️ NODE_DATA_CHANGED: nodeId=${event.nodeId}, data=`, event.data, `propagate=${event.propagate !== false}`);
      let newNodes = state.nodes.map(n =>
        n.id === event.nodeId ? { ...n, data: { ...n.data, ...event.data } } : n
      );
      if (event.propagate !== false && event.data.value !== undefined) {
        if (DEBUG) console.log(`[Bus] 📡 传播 value 到下游节点`);
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
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      return {
        ...state,
        edges: [...state.edges.filter(e => e.id !== event.oldEdgeId), newEdge],
      };
    }

    // 选中变化
    case 'SELECTION_CHANGED': {
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

    // 加载工作流：替换所有节点和边，清空选中和模式，并同步 ID 计数器
    case 'WORKFLOW_LOADED': {
      if (DEBUG) console.log(`[Bus] WORKFLOW_LOADED`);
      syncIdCounter(event.nodes);
      return {
        ...state,
        nodes: event.nodes,
        edges: event.edges,
        selection: [],
        mode: 'default',
      };
    }

    // 内部同步节点数组
    case 'APPLY_NODE_CHANGES': {
      return { ...state, nodes: event.nodes };
    }

    // 以下事件不直接修改状态（仅用于副作用）
    case 'HISTORY_UNDO':
    case 'HISTORY_REDO':
    case 'BATCH_CONNECT_START':
    case 'BATCH_CONNECT_EXECUTE':
    case 'BATCH_CONNECT_CANCEL':
    case 'RECONNECT_START':
    case 'RECONNECT_END':
    case 'UPDATE_STATUS':        // 动态更新状态栏文本
    case 'SET_TOOLBAR_ENABLED':  // 设置工具栏按钮启用状态
    case 'VIEWPORT_CHANGED':     // 画布视图变化（缩放/平移）
    case 'RENDER_GUIDE_LINES':   // 渲染辅助线
    case 'CLEAR_GUIDE_LINES':    // 清除辅助线
    case 'SET_VIEWPORT_LIMITS':  // 设置视口限制
    case 'SET_PAN_ON_DRAG':      // 设置拖拽平移按键
    case 'SET_BACKGROUND_STYLE': // 设置背景样式
    case 'SET_THEME_COLOR':      // 设置主题颜色
    case 'SET_THEME_COLORS':     // 批量设置主题颜色
    case 'PROJECT_CONFIG_TOGGLE_PANEL':
    case 'PROJECT_CONFIG_CHANGED':
    case 'TOGGLE_MINIMAP':
    case 'SAVE_WORKFLOW':
    case 'LOAD_WORKFLOW':
    case 'ERROR_OCCURRED':
    case 'FLOATING_SEARCH_OPEN':
    case 'FLOATING_SEARCH_CLOSE':
    case 'CONNECTION_MENU_OPEN':
    case 'CONNECTION_MENU_CLOSE':
    case 'SET_LEFT_COLLAPSED':
    case 'SET_RIGHT_COLLAPSED':
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
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const listenersRef = useRef<Map<number, Listener>>(new Map());
  const nextIdRef = useRef(0);

  const busDispatch = useCallback((event: EditorEvent) => {
    const newState = editorReducer(stateRef.current, event);
    stateRef.current = newState;
    dispatch(event);
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

  const subscribe = useCallback((listener: Listener) => {
    const id = nextIdRef.current++;
    listenersRef.current.set(id, listener);
    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  const getState = useCallback((): EditorState => {
    return stateRef.current;
  }, []);

  const bus: EditorBus = useMemo(() => ({
    getState,
    dispatch: busDispatch,
    subscribe,
  }), [getState, busDispatch, subscribe]);

  return { state, bus };
}