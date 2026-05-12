// src/mods/mod-batch-connect.ts
// 批量连线 Mod
// 替代 useBatchConnect 中的状态管理与边创建逻辑
// 画布点击/ESC 等交互仍由 FlowCanvas 组件处理，组件会 dispatch 相应事件
// 现在使用 getAllTemplates() 动态获取模板

import type { EditorMod, EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { DEBUG } from '../../config/debug';

/**
 * 批量连线期间的临时状态
 */
interface BatchState {
  sourceNodeIds: string[];    // 源节点 ID 列表（多个）
  sourceHandleType: string;   // 源端口类型（例如 'number'）
}

// 模块私有变量，不在 React 状态中
let batchState: BatchState | null = null;

export const modBatchConnect: EditorMod = {
  id: 'batch-connect',
  init(bus: EditorBus) {
    const unsub = bus.subscribe(({ event, state }) => {
      switch (event.type) {

        // ----- 开始批量连线 -----
        case 'BATCH_CONNECT_START': {
          const { sourceNodeIds, sourceHandleType } = event;
          // 至少需要两个源节点才有意义
          if (sourceNodeIds.length < 2) {
            if (DEBUG) console.log('[mod-batch-connect] 源节点数不足，忽略');
            return;
          }

          // 保存批量连线状态
          batchState = {
            sourceNodeIds: [...sourceNodeIds],
            sourceHandleType,
          };

          // 切换编辑器模式为批量连线模式（组件会据此渲染提示信息和绑定点击监听）
          bus.dispatch({ type: 'MODE_CHANGED', mode: 'batch-connect' });

          if (DEBUG) console.log('[mod-batch-connect] 进入批量连线模式，源节点:', sourceNodeIds);
          break;
        }

        // ----- 执行批量连线（用户点击目标节点时触发） -----
        case 'BATCH_CONNECT_EXECUTE': {
          if (!batchState) {
            if (DEBUG) console.log('[mod-batch-connect] 不在批量连线模式，忽略执行');
            return;
          }

          const { targetNodeId, targetHandleId } = event;
          const { sourceNodeIds, sourceHandleType } = batchState;

          const currentState = bus.getState();
          const newEdges: any[] = [];

          // 为每个源节点尝试创建一条到目标节点的边
          sourceNodeIds.forEach(sourceNodeId => {
            const sourceNode = currentState.nodes.find(n => n.id === sourceNodeId);
            if (!sourceNode) return;

            // 从注册中心获取模板
            const sourceTemplate = getAllTemplates().find(t => t.type === sourceNode.type);
            // 查找源节点中与共同端口类型匹配的输出端口
            const sourcePort = sourceTemplate?.outputs?.find(o => o.type === sourceHandleType);
            if (!sourcePort) return;

            // 避免创建重复的边（源端口 + 目标端口组合已存在）
            const exists = currentState.edges.some(
              e =>
                e.source === sourceNodeId &&
                e.sourceHandle === sourcePort.id &&
                e.target === targetNodeId &&
                e.targetHandle === targetHandleId
            );
            if (exists) return;

            newEdges.push({
              source: sourceNodeId,
              sourceHandle: sourcePort.id,
              target: targetNodeId,
              targetHandle: targetHandleId,
            });
          });

          // 逐个添加边（每条边生成唯一 ID）
          newEdges.forEach(edge => {
            const edgeWithId = {
              ...edge,
              id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            };
            bus.dispatch({ type: 'EDGE_ADDED', edge: edgeWithId });
          });

          if (DEBUG) console.log(`[mod-batch-connect] 创建 ${newEdges.length} 条边`);

          // 执行完毕后退出批量连线模式
          batchState = null;
          bus.dispatch({ type: 'MODE_CHANGED', mode: 'default' });
          break;
        }

        // ----- 取消批量连线（ESC 或点击空白） -----
        case 'BATCH_CONNECT_CANCEL': {
          if (DEBUG) console.log('[mod-batch-connect] 取消批量连线');
          batchState = null;
          bus.dispatch({ type: 'MODE_CHANGED', mode: 'default' });
          break;
        }
      }
    });

    // 清理函数：取消订阅，重置内部状态
    return () => {
      unsub();
      batchState = null;
      if (DEBUG) console.log('[mod-batch-connect] 已卸载');
    };
  },
};