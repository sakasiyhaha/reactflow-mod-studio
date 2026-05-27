// src/mods/mod-reconnect.ts
import type { EditorMod, EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { isValidConnectionType } from '../utils/connectionRules';
import { DEBUG } from '../../config/debug';
import type { Connection } from '@xyflow/react';

// ==================== 内部状态 ====================
interface ReconnectState {
  edgeId: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  handleType: 'source' | 'target';
}

let reconnectState: ReconnectState | null = null;

// ==================== 辅助函数 ====================
function getPortType(
  nodes: any[],
  nodeId: string,
  handleId: string,
  handleKind: 'source' | 'target'
): string | null {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const template = getAllTemplates().find(t => t.type === node.type);
  if (!template) return null;
  const ports = handleKind === 'source'
    ? (template.handles?.sources ?? template.outputs ?? [])
    : (template.handles?.targets ?? template.inputs ?? []);
  const port = ports.find(p => p.id === handleId);
  return port?.type ?? null;
}

// 导出重连状态检查函数，供 connection-menu 使用
export function isReconnecting(): boolean {
  return reconnectState !== null;
}

// ==================== Mod 定义 ====================
export const modReconnect: EditorMod = {
  id: 'reconnect',
  init(bus: EditorBus) {
    const unsub = bus.subscribe(({ event, state }) => {
      switch (event.type) {
        case 'RECONNECT_START': {
          const edge = state.edges.find(e => e.id === event.edgeId);
          if (!edge) {
            console.error(`[mod-reconnect] RECONNECT_START: 未找到边 ${event.edgeId}`);
            return;
          }
          reconnectState = {
            edgeId: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle ?? '',
            target: edge.target,
            targetHandle: edge.targetHandle ?? '',
            handleType: event.handleType,
          };
          console.log(`%c[mod-reconnect] 开始重连边 ${event.edgeId}，操作端=${event.handleType}`, 'color: #f59e0b; font-weight: bold');
          break;
        }

        case 'EDGE_RECONNECTED': {
          if (reconnectState && event.oldEdgeId === reconnectState.edgeId) {
            console.log(`%c[mod-reconnect] 重连成功，清除状态`, 'color: #22c55e; font-weight: bold');
            reconnectState = null;
          }
          break;
        }

        case 'RECONNECT_END': {
          if (!reconnectState) {
            // 没有重连状态，可能是已经成功重连并清除了，忽略
            return;
          }
          console.log(`%c[mod-reconnect] 重连结束，边=${reconnectState.edgeId}，未收到成功事件，立即删除原边`, 'color: #e67e22');
          bus.dispatch({ type: 'EDGE_DELETED', edgeId: reconnectState.edgeId });
          reconnectState = null;
          break;
        }
      }
    });

    return () => {
      unsub();
      reconnectState = null;
      console.log('[mod-reconnect] 已卸载');
    };
  },
};

// ==================== 暴露给外部的工具函数 ====================
export function validateReconnectConnection(
  connection: Connection,
  edges: any[],
  nodes: any[]
): boolean {
  // 源节点和目标节点不能相同
  if (connection.source === connection.target) {
    console.log(`[validate] ❌ 拒绝（自环）`);
    return false;
  }

  const sourceType = getPortType(nodes, connection.source, connection.sourceHandle ?? '', 'source');
  const targetType = getPortType(nodes, connection.target, connection.targetHandle ?? '', 'target');
  console.log(`[validate] 源类型=${sourceType} 目标类型=${targetType}`);

  if (sourceType && targetType) {
    if (!isValidConnectionType(sourceType, targetType)) {
      console.log(`[validate] ❌ 拒绝（类型不兼容）`);
      return false;
    }
  }

  // 如果在重连模式下，允许改变另一端（只要不是自环且类型兼容）
  if (reconnectState) {
    console.log(`[validate] ✅ 允许重连（重连模式）`);
    return true;
  }

  // 非重连时，检查目标端口是否已被占用
  const conflict = edges.find(
    e => e.target === connection.target && e.targetHandle === connection.targetHandle
  );
  if (conflict) {
    console.log(`[validate] ❌ 拒绝（端口已占用）`);
    return false;
  }

  console.log(`[validate] ✅ 允许连接`);
  return true;
}

// 可选：获取当前重连状态（供调试）
export function getReconnectState() {
  return reconnectState;
}