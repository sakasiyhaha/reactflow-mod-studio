// src/adapters/nodeLifecycleAdapters.ts
// 节点生命周期适配器
// 将 React Flow 的 onNodesChange / onEdgesChange / onConnect / onReconnect 等回调适配为 EditorEvent
// 这些适配器函数在 App.tsx 中被用来生成传给 FlowCanvas 的事件处理函数

import type { EditorBus } from '../bus/types';
import { applyNodeChanges } from '@xyflow/react';   // React Flow 提供的工具函数，能根据 changes 生成新的节点数组
import { DEBUG } from '../../config/debug';

export const nodeLifecycleAdapters = {

  // ---------- 创建 onNodesChange 回调 ----------
  createOnNodesChange: (bus: EditorBus) => (changes: any[]) => {
    // 1. 获取当前节点并应用变化，得到最新的节点数组
    const currentNodes = bus.getState().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes);

    // 2. 提取副作用信息
    // 被删除的节点 ID
    const removedIds = changes
      .filter((c: any) => c.type === 'remove')
      .map((c: any) => c.id);
    // 最终位置更新（跳过拖拽过程中的中间位置，只记录 drag 结束后的位置）
    const positionUpdates = changes
      .filter((c: any) => c.type === 'position' && c.dragging !== true)
      .map((c: any) => ({ id: c.id, position: c.position }));

    // 3. 派发整个节点数组的同步事件（保证 React Flow 内部状态与总线状态一致）
    bus.dispatch({ type: 'APPLY_NODE_CHANGES', nodes: newNodes });

    // 4. 如果有节点被删除，派发删除事件（会同时清理相关边和选中状态）
    if (removedIds.length > 0) {
      bus.dispatch({ type: 'NODE_DELETED', nodeIds: removedIds });
      if (DEBUG) console.log('[node-lifecycle] 移除节点:', removedIds);
    }

    // 5. 如果有位置最终确定，派发位置变更事件（供历史记录等 Mod 使用）
    if (positionUpdates.length > 0) {
      bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates: positionUpdates });
      if (DEBUG) console.log('[node-lifecycle] 最终位置更新:', positionUpdates.length);
    }

    // 6. 处理选中状态变化：比较新旧选中集，只有真正变化时才派发
    const newSelectedIds = newNodes.filter((n: any) => n.selected).map((n: any) => n.id);
    const oldSelectedIds = currentNodes.filter((n: any) => n.selected).map((n: any) => n.id);
    const selectionChanged =
      newSelectedIds.length !== oldSelectedIds.length ||
      !newSelectedIds.every((id: string, idx: number) => id === oldSelectedIds[idx]);

    if (selectionChanged) {
      // 使用微任务延迟派发，确保当前同步更新（例如 APPLY_NODE_CHANGES）已经完成
      Promise.resolve().then(() => {
        bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: newSelectedIds });
      });
    }
  },

  // ---------- 创建 onEdgesChange 回调 ----------
  createOnEdgesChange: (bus: EditorBus) => (changes: any[]) => {
    // 只处理边被直接删除的情况（例如按 Delete 键）
    const removedEdgeIds = changes.filter((c: any) => c.type === 'remove').map((c: any) => c.id);
    removedEdgeIds.forEach((id: string) => bus.dispatch({ type: 'EDGE_DELETED', edgeId: id }));
  },

  // ---------- 创建 onConnect 回调（新建连接） ----------
  createOnConnect: (bus: EditorBus) => (connection: any) => {
    // 为新边生成唯一 ID 并派发添加事件
    bus.dispatch({
      type: 'EDGE_ADDED',
      edge: {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      },
    });
  },

  // ---------- 创建 onReconnect 回调（重连已有边） ----------
  createOnReconnect: (bus: EditorBus) => (oldEdge: any, newConnection: any) => {
    if (newConnection) {
      bus.dispatch({
        type: 'EDGE_RECONNECTED',
        oldEdgeId: oldEdge.id,
        newConnection,
      });
    }
  },
};