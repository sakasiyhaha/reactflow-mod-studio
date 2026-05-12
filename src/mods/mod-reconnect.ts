// src/mods/mod-reconnect.ts
// 重连 Mod - 替代 useReconnectManager 和 useReconnectHandler 中的核心重连逻辑
// 负责管理重连状态、抑制连接结束后的菜单弹出，并提供连接校验工具函数
// 现在使用 getAllTemplates() 动态获取模板

import type { EditorMod, EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { isValidConnectionType } from '../utils/connectionRules';
import { DEBUG } from '../../config/debug';
import type { Connection } from '@xyflow/react';

// ==================== 内部状态 ====================
// 重连状态：记录当前正在拖拽重连的边信息
interface ReconnectState {
  edgeId: string;               // 正在重连的边 ID
  source: string;               // 原源节点 ID
  sourceHandle: string;         // 原源端口 ID
  target: string;               // 原目标节点 ID
  targetHandle: string;         // 原目标端口 ID
  handleType: 'source' | 'target'; // 正在拖拽的是源端还是目标端
}

let reconnectState: ReconnectState | null = null;
// 抑制计数器：非零时 onConnectEnd 不弹出连接菜单（用于避免重连过程中的多余菜单）
let suppressCount = 0;

// ==================== 辅助函数 ====================
/**
 * 根据节点 ID 和端口 ID 获取端口类型（number / boolean / exec / *）
 * @param nodes  当前所有节点数组
 * @param nodeId 节点 ID
 * @param handleId 端口 ID
 * @param handleKind 端口类别（source 或 target）
 * @returns 端口类型，如果未找到则返回 null
 */
function getPortType(
  nodes: any[],
  nodeId: string,
  handleId: string,
  handleKind: 'source' | 'target'
): string | null {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;

  // 从注册中心获取模板
  const template = getAllTemplates().find(t => t.type === node.type);
  if (!template) return null;

  // 根据端口类别获取端口列表
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

        // ----- 开始重连 -----
        case 'RECONNECT_START': {
          const edge = state.edges.find(e => e.id === event.edgeId);
          if (!edge) return;

          // 保存当前边的信息用于校验
          reconnectState = {
            edgeId: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle ?? '',
            target: edge.target,
            targetHandle: edge.targetHandle ?? '',
            handleType: event.handleType,
          };

          // 设置极大的抑制计数，确保重连过程中 onConnectEnd 不会弹出节点菜单
          suppressCount = 999;

          if (DEBUG) {
            console.log(
              `%c[mod-reconnect] 开始重连 边=${edge.id} 端点=${event.handleType}`,
              'color: #f59e0b'
            );
          }
          break;
        }

        // ----- 结束重连（拖拽释放） -----
        case 'RECONNECT_END': {
          if (!reconnectState) return;

          if (DEBUG) {
            console.log(
              `%c[mod-reconnect] 重连结束 suppressCount=${suppressCount}`,
              'color: #e67e22'
            );
          }

          // 如果拖拽释放到了空白（未连接到有效端口），删除原边
          if (suppressCount > 0) {
            bus.dispatch({ type: 'EDGE_DELETED', edgeId: reconnectState.edgeId });
          }

          // 清除重连状态，并延迟清零抑制计数器（在所有同步任务后恢复菜单弹出能力）
          reconnectState = null;
          setTimeout(() => { suppressCount = 0; }, 0);
          break;
        }
      }
    });

    return () => {
      unsub();
      reconnectState = null;
      suppressCount = 0;
      if (DEBUG) console.log('[mod-reconnect] 已卸载');
    };
  },
};

// ==================== 暴露给外部的工具函数 ====================

/**
 * 校验连接是否合法（类型兼容、端口未被占用、重连规则）
 * @param connection 待校验的连接
 * @param edges      当前所有边
 * @param nodes      当前所有节点
 * @returns 是否允许连接
 */
export function validateReconnectConnection(
  connection: Connection,
  edges: any[],
  nodes: any[]
): boolean {
  if (DEBUG) console.log(`[mod-reconnect validate] source=${connection.source} target=${connection.target}`);

  // 1. 端口类型校验
  const sourceType = getPortType(nodes, connection.source, connection.sourceHandle ?? '', 'source');
  const targetType = getPortType(nodes, connection.target, connection.targetHandle ?? '', 'target');

  if (sourceType && targetType) {
    if (!isValidConnectionType(sourceType, targetType)) {
      if (DEBUG) console.log(`[validate] 拒绝（类型不兼容）`);
      return false;
    }
  }

  // 2. 如果正在重连，应用特殊规则
  if (reconnectState) {
    const isSourceReconnect = reconnectState.handleType === 'source';
    const isTargetReconnect = reconnectState.handleType === 'target';

    // 目标端重连：新连接的目标可以改变，但源端必须不变
    if (isTargetReconnect &&
        connection.source === reconnectState.source &&
        connection.sourceHandle === reconnectState.sourceHandle) {
      return true;
    }

    // 源端重连：新连接的源端可以改变，但目标端必须不变
    if (isSourceReconnect &&
        connection.target === reconnectState.target &&
        connection.targetHandle === reconnectState.targetHandle) {
      return true;
    }

    // 其他重连情况（例如试图改变两端）一律拒绝
    return false;
  }

  // 3. 非重连时：检查目标端口是否已被占用（同一端口只能有一条入边）
  const conflict = edges.find(
    e => e.target === connection.target && e.targetHandle === connection.targetHandle
  );
  if (conflict) {
    if (DEBUG) console.log(`[validate] 拒绝（端口已占用）`);
    return false;
  }

  return true;
}

/**
 * 获取当前抑制计数器的值
 * 用于 onConnectEnd 判断是否应弹出菜单
 */
export function getSuppressCount() {
  return suppressCount;
}

/**
 * 递减抑制计数器（每次 onConnectEnd 触发时调用）
 */
export function decreaseSuppressCount() {
  if (suppressCount > 0) suppressCount--;
}