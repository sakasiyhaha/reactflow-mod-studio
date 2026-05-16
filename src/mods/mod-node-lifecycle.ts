// src/mods/mod-node-lifecycle.ts
// 节点生命周期适配器 Mod
// 将 React Flow 的 onNodesChange / onEdgesChange / onConnect / onReconnect 等回调适配为 EditorEvent
// 支持继承：暴露工具函数 createOnNodesChange, createOnEdgesChange, createOnConnect, createOnReconnect

import type { EditorMod, EditorBus } from '../bus/types';
import { applyNodeChanges } from '@xyflow/react';
import { DEBUG } from '../../config/debug';

// ==================== 工具函数（可被继承复用） ====================

/**
 * 创建 onNodesChange 回调
 * 处理节点变化（位置、删除、选中），派发相应事件
 */
export function createOnNodesChange(bus: EditorBus) {
  return (changes: any[]) => {
    const currentNodes = bus.getState().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes);

    // 提取删除的节点 ID
    const removedIds = changes
      .filter((c: any) => c.type === 'remove')
      .map((c: any) => c.id);
    // 提取位置最终更新（拖拽结束）
    const positionUpdates = changes
      .filter((c: any) => c.type === 'position' && c.dragging !== true)
      .map((c: any) => ({ id: c.id, position: c.position }));

    // 同步节点数组
    bus.dispatch({ type: 'APPLY_NODE_CHANGES', nodes: newNodes });

    if (removedIds.length > 0) {
      bus.dispatch({ type: 'NODE_DELETED', nodeIds: removedIds });
      if (DEBUG) console.log('[node-lifecycle] 移除节点:', removedIds);
    }

    if (positionUpdates.length > 0) {
      bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates: positionUpdates });
      if (DEBUG) console.log('[node-lifecycle] 最终位置更新:', positionUpdates.length);
    }

    // 处理选中状态变化
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

/**
 * 创建 onEdgesChange 回调
 * 处理边直接删除（如按 Delete 键）
 */
export function createOnEdgesChange(bus: EditorBus) {
  return (changes: any[]) => {
    const removedEdgeIds = changes.filter((c: any) => c.type === 'remove').map((c: any) => c.id);
    removedEdgeIds.forEach((id: string) => bus.dispatch({ type: 'EDGE_DELETED', edgeId: id }));
  };
}

/**
 * 创建 onConnect 回调（新建连接）
 * 为边生成唯一 ID 并派发添加事件
 */
export function createOnConnect(bus: EditorBus) {
  return (connection: any) => {
    bus.dispatch({
      type: 'EDGE_ADDED',
      edge: {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      },
    });
  };
}

/**
 * 创建 onReconnect 回调（重连已有边）
 */
export function createOnReconnect(bus: EditorBus) {
  return (oldEdge: any, newConnection: any) => {
    if (newConnection) {
      bus.dispatch({
        type: 'EDGE_RECONNECTED',
        oldEdgeId: oldEdge.id,
        newConnection,
      });
    }
  };
}

// ==================== Mod 定义 ====================

export const modNodeLifecycle: EditorMod = {
  id: 'node-lifecycle',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-node-lifecycle] 初始化');
    // 此 Mod 不需要持久订阅，仅作为工具函数容器
    return () => {
      if (DEBUG) console.log('[mod-node-lifecycle] 已卸载');
    };
  },
};

// 可选：提供统一的获取适配器集合的函数（方便继承者批量获取）
export function getNodeLifecycleAdapters(bus: EditorBus) {
  return {
    onNodesChange: createOnNodesChange(bus),
    onEdgesChange: createOnEdgesChange(bus),
    onConnect: createOnConnect(bus),
    onReconnect: createOnReconnect(bus),
  };
}