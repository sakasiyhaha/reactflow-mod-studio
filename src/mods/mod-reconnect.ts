// src/mods/mod-reconnect.ts
// 重连 Mod - 添加详细日志用于调试

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
let suppressCount = 0;

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
          // 开始重连，设置极大抑制计数
          suppressCount = 999;
          console.log(`%c[mod-reconnect] RECONNECT_START 边=${event.edgeId} 类型=${event.handleType} suppressCount=${suppressCount}`, 'color: #f59e0b; font-weight: bold');
          break;
        }

        case 'RECONNECT_END': {
          if (!reconnectState) {
            console.warn(`[mod-reconnect] RECONNECT_END 但没有重连状态，忽略`);
            return;
          }
          console.log(`%c[mod-reconnect] RECONNECT_END 边=${reconnectState.edgeId} 当前suppressCount=${suppressCount}`, 'color: #e67e22; font-weight: bold');
          
          // 关键：释放到空白时需要删除边？由外部处理？原来的逻辑是在 RECONNECT_END 中直接删除边
          // 但是我们需要知道拖拽释放后是否有新的连接（newConnection）。这里的事件没有携带 newConnection 信息。
          // React Flow 的 onReconnectEnd 回调并不提供 newConnection，只有 onReconnect（成功时）才提供。
          // 因此，我们只能在 RECONNECT_START 时假设边可能被删除，而真正的删除应该发生在 onReconnect 未调用时。
          // 简单做法：在 RECONNECT_END 中直接删除原边（如果还没被删除）。
          // 但注意：如果重连成功，onReconnect 中会派发 EDGE_RECONNECTED 事件，其中会删除旧边并添加新边，所以我们这里不应该重复删除。
          // 目前项目中的 mod-reconnect 原本在 RECONNECT_END 中判断 suppressCount > 0 时删除边。
          // 为了保持行为，我们恢复该逻辑：
          if (suppressCount > 0) {
            console.log(`%c[mod-reconnect] 释放到空白，删除边 ${reconnectState.edgeId}`, 'color: #e67e22');
            bus.dispatch({ type: 'EDGE_DELETED', edgeId: reconnectState.edgeId });
          } else {
            console.log(`%c[mod-reconnect] 可能成功重连，不删除边`, 'color: #e67e22');
          }
          
          // 清理状态
          reconnectState = null;
          // 再次设置抑制计数为极大，然后延迟归零
          suppressCount = 999;
          setTimeout(() => {
            suppressCount = 0;
            console.log(`%c[mod-reconnect] 抑制计数已归零`, 'color: #e67e22');
          }, 0);
          break;
        }
      }
    });

    return () => {
      unsub();
      reconnectState = null;
      suppressCount = 0;
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
  console.log(`[mod-reconnect validate] source=${connection.source} target=${connection.target} handleSource=${connection.sourceHandle} handleTarget=${connection.targetHandle}`);
  
  const sourceType = getPortType(nodes, connection.source, connection.sourceHandle ?? '', 'source');
  const targetType = getPortType(nodes, connection.target, connection.targetHandle ?? '', 'target');
  console.log(`[validate] 源类型=${sourceType} 目标类型=${targetType}`);

  if (sourceType && targetType) {
    if (!isValidConnectionType(sourceType, targetType)) {
      console.log(`[validate] ❌ 拒绝（类型不兼容）`);
      return false;
    }
  }

  if (reconnectState) {
    const isSourceReconnect = reconnectState.handleType === 'source';
    const isTargetReconnect = reconnectState.handleType === 'target';
    console.log(`[validate] 重连模式: handleType=${reconnectState.handleType}, 源匹配=${connection.source === reconnectState.source && connection.sourceHandle === reconnectState.sourceHandle}, 目标匹配=${connection.target === reconnectState.target && connection.targetHandle === reconnectState.targetHandle}`);
    if (isTargetReconnect &&
        connection.source === reconnectState.source &&
        connection.sourceHandle === reconnectState.sourceHandle) {
      console.log(`[validate] ✅ 允许重连目标端`);
      return true;
    }
    if (isSourceReconnect &&
        connection.target === reconnectState.target &&
        connection.targetHandle === reconnectState.targetHandle) {
      console.log(`[validate] ✅ 允许重连源端`);
      return true;
    }
    console.log(`[validate] ❌ 拒绝（重连规则不符）`);
    return false;
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

export function getSuppressCount(): number {
  return suppressCount;
}

export function decreaseSuppressCount(): void {
  if (suppressCount > 0) suppressCount--;
}