// src/hooks/useConnectionEndHandler.ts
// 连接结束处理 Hook —— 当用户从端口拖线到空白处时，弹出候选节点菜单（正向或反向）
// 现在使用 getAllTemplates() 动态获取模板列表

import { useCallback } from 'react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { getSuppressCount, decreaseSuppressCount } from '../mods/mod-reconnect';
import { DEBUG } from '../../config/debug';

interface ConnectionMenuSetter {
  (menu: {
    x: number;
    y: number;
    sourceNodeId: string;
    sourceHandleId: string;
    availableTypes: any[];
    direction: 'forward' | 'reverse';
  } | null): void;
}

export function useConnectionEndHandler(setConnectionMenu: ConnectionMenuSetter) {
  /**
   * React Flow 的 onConnectEnd 回调
   * 当拖线结束但未形成有效连接时调用，用于弹出节点选择菜单
   */
  const onConnectEnd = useCallback((event: any, connectionState: any) => {
    // 如果已经形成有效连接，不需要菜单
    if (connectionState.isValid) return;

    const { fromNode, fromHandle } = connectionState;
    if (!fromNode || !fromHandle) return;

    // 重连期间不弹出菜单（由 mod-reconnect 控制）
    if (getSuppressCount() > 0) {
      decreaseSuppressCount();
      if (DEBUG) console.log('[connectionEndHandler] 重连抑制期，跳过连接菜单');
      return;
    }

    const sourceTemplate = getAllTemplates().find(t => t.type === fromNode.type);
    if (!sourceTemplate) return;

    // ---------- 正向连接：从输出端口拖出 ----------
    const sourcePort = sourceTemplate.outputs?.find(o => o.id === fromHandle.id);
    if (sourcePort?.type) {
      // 筛选出可以连接到该输出端口类型的节点模板（有匹配的输入端口）
      const available = sourcePort.type === '*'
        ? getAllTemplates().filter(t => t.inputs?.length > 0)
        : getAllTemplates().filter(t =>
            t.inputs?.some(i => i.type === sourcePort.type || i.type === '*')
          );
      if (available.length > 0) {
        setConnectionMenu({
          x: event.clientX,
          y: event.clientY,
          sourceNodeId: fromNode.id,
          sourceHandleId: fromHandle.id,
          availableTypes: available,
          direction: 'forward',    // 正向：新节点作为目标
        });
      }
      return;
    }

    // ---------- 反向连接：从输入端口拖出 ----------
    const targetPort = sourceTemplate.inputs?.find(i => i.id === fromHandle.id);
    if (targetPort?.type) {
      // 筛选出可以连接到该输入端口类型的节点模板（有匹配的输出端口）
      const available = targetPort.type === '*'
        ? getAllTemplates().filter(t => t.outputs?.length > 0)
        : getAllTemplates().filter(t =>
            t.outputs?.some(o => o.type === targetPort.type || o.type === '*')
          );
      if (available.length > 0) {
        setConnectionMenu({
          x: event.clientX,
          y: event.clientY,
          sourceNodeId: fromNode.id,      // 此时作为目标节点
          sourceHandleId: fromHandle.id,  // 此时作为目标端口
          availableTypes: available,
          direction: 'reverse',           // 反向：新节点作为源
        });
      }
    }
  }, [setConnectionMenu]);

  return { onConnectEnd };
}