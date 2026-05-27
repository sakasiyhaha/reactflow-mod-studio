// src/mods/mod-node-lifecycle.ts
import type { EditorMod, EditorBus } from '../bus/types';
import { applyNodeChanges } from '@xyflow/react';
import { DEBUG } from '../../config/debug';
import { generateEdgeId } from '../utils';

// ==================== 工具函数 ====================

export function createOnNodesChange(bus: EditorBus) {
  return (changes: any[]) => {
    const currentNodes = bus.getState().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes);

    const removedIds = changes
      .filter((c: any) => c.type === 'remove')
      .map((c: any) => c.id);
    const positionUpdates = changes
      .filter((c: any) => c.type === 'position' && c.dragging !== true)
      .map((c: any) => ({ id: c.id, position: c.position }));

    bus.dispatch({ type: 'APPLY_NODE_CHANGES', nodes: newNodes });

    if (removedIds.length > 0) {
      bus.dispatch({ type: 'NODE_DELETED', nodeIds: removedIds });
      if (DEBUG) console.log('[node-lifecycle] 移除节点:', removedIds);
    }

    if (positionUpdates.length > 0) {
      bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates: positionUpdates });
      if (DEBUG) console.log('[node-lifecycle] 最终位置更新:', positionUpdates.length);
    }

    const newSelectedIds = newNodes.filter((n: any) => n.selected).map((n: any) => n.id);
    const oldSelectedIds = currentNodes.filter((n: any) => n.selected).map((n: any) => n.id);
    const selectionChanged =
      newSelectedIds.length !== oldSelectedIds.length ||
      !newSelectedIds.every((id: string, idx: number) => id === oldSelectedIds[idx]);

    if (selectionChanged) {
      Promise.resolve().then(() => {
        bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: newSelectedIds });
      });
    }
  };
}

export function createOnEdgesChange(bus: EditorBus) {
  return (changes: any[]) => {
    const removedEdgeIds = changes.filter((c: any) => c.type === 'remove').map((c: any) => c.id);
    removedEdgeIds.forEach((id: string) => bus.dispatch({ type: 'EDGE_DELETED', edgeId: id }));
  };
}

export function createOnConnect(bus: EditorBus) {
  return (connection: any) => {
    bus.dispatch({
      type: 'EDGE_ADDED',
      edge: {
        ...connection,
        id: generateEdgeId(),
        type: 'gradient',
      },
    });
  };
}

export function createOnReconnect(bus: EditorBus) {
  return (oldEdge: any, newConnection: any) => {
    // 只有当 newConnection 存在且有效时才派发重连事件
    if (newConnection && newConnection.source && newConnection.target) {
      bus.dispatch({
        type: 'EDGE_RECONNECTED',
        oldEdgeId: oldEdge.id,
        newConnection: {
          ...newConnection,
          type: 'gradient',   // 新边使用渐变样式
        },
      });
      if (DEBUG) console.log('[node-lifecycle] 重连边', oldEdge.id, '->', newConnection);
    } else {
      if (DEBUG) console.warn('[node-lifecycle] 重连无效，忽略', newConnection);
    }
  };
}

// ==================== Mod 定义 ====================

export const modNodeLifecycle: EditorMod = {
  id: 'node-lifecycle',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-node-lifecycle] 初始化');
    return () => {
      if (DEBUG) console.log('[mod-node-lifecycle] 已卸载');
    };
  },
};

export function getNodeLifecycleAdapters(bus: EditorBus) {
  return {
    onNodesChange: createOnNodesChange(bus),
    onEdgesChange: createOnEdgesChange(bus),
    onConnect: createOnConnect(bus),
    onReconnect: createOnReconnect(bus),
  };
}