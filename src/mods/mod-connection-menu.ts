// src/mods/mod-connection-menu.ts
// 连接菜单 Mod - 处理从端口拖线到空白时弹出节点选择菜单
// 配合 mod-reconnect 的抑制计数器，重连期间不弹出菜单

import type { EditorMod, EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { getSuppressCount, decreaseSuppressCount } from './mod-reconnect'; // 导入抑制计数器工具
import { DEBUG } from '../../config/debug';

// 模块私有变量：存储当前连接菜单状态（用于防重复）
let currentMenu: any = null;

// ==================== 工具函数（可被继承复用） ====================

/**
 * 显示连接菜单
 */
export function showConnectionMenu(bus: EditorBus, params: {
  x: number;
  y: number;
  sourceNodeId: string;
  sourceHandleId: string;
  availableTypes: any[];
  direction: 'forward' | 'reverse';
}) {
  if (currentMenu) {
    hideConnectionMenu(bus);
  }
  currentMenu = params;
  bus.dispatch({ type: 'CONNECTION_MENU_OPEN', payload: params });
  if (DEBUG) console.log('[connection-menu] 显示连接菜单', params);
}

/**
 * 关闭连接菜单
 */
export function hideConnectionMenu(bus: EditorBus) {
  if (currentMenu) {
    currentMenu = null;
    bus.dispatch({ type: 'CONNECTION_MENU_CLOSE' });
    if (DEBUG) console.log('[connection-menu] 关闭连接菜单');
  }
}

/**
 * 核心逻辑：根据拖线结束事件判断是否弹出菜单
 * 配合重连抑制计数器，避免在重连过程中弹出菜单
 */
export function createConnectionEndHandler(bus: EditorBus) {
  return (event: any, connectionState: any) => {
    // 如果已经形成有效连接，不需要菜单
    if (connectionState.isValid) return;

    // 检查抑制计数器：如果大于0，说明正在重连，跳过菜单
    if (getSuppressCount() > 0) {
      // 可选递减（如果希望计数器逐步归零），但我们的重连结束会重置，这里不递减也可
      // decreaseSuppressCount();
      if (DEBUG) console.log(`[connection-menu] 抑制中（计数=${getSuppressCount()}），跳过菜单`);
      return;
    }

    const { fromNode, fromHandle } = connectionState;
    if (!fromNode || !fromHandle) return;

    const sourceTemplate = getAllTemplates().find(t => t.type === fromNode.type);
    if (!sourceTemplate) return;

    // 正向连接：从输出端口拖出
    const sourcePort = sourceTemplate.outputs?.find(o => o.id === fromHandle.id);
    if (sourcePort?.type) {
      const available = sourcePort.type === '*'
        ? getAllTemplates().filter(t => t.inputs?.length > 0)
        : getAllTemplates().filter(t =>
            t.inputs?.some(i => i.type === sourcePort.type || i.type === '*')
          );
      if (available.length > 0) {
        showConnectionMenu(bus, {
          x: event.clientX,
          y: event.clientY,
          sourceNodeId: fromNode.id,
          sourceHandleId: fromHandle.id,
          availableTypes: available,
          direction: 'forward',
        });
      }
      return;
    }

    // 反向连接：从输入端口拖出
    const targetPort = sourceTemplate.inputs?.find(i => i.id === fromHandle.id);
    if (targetPort?.type) {
      const available = targetPort.type === '*'
        ? getAllTemplates().filter(t => t.outputs?.length > 0)
        : getAllTemplates().filter(t =>
            t.outputs?.some(o => o.type === targetPort.type || o.type === '*')
          );
      if (available.length > 0) {
        showConnectionMenu(bus, {
          x: event.clientX,
          y: event.clientY,
          sourceNodeId: fromNode.id,
          sourceHandleId: fromHandle.id,
          availableTypes: available,
          direction: 'reverse',
        });
      }
    }
  };
}

// ==================== Mod 定义 ====================
export const modConnectionMenu: EditorMod = {
  id: 'connection-menu',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-connection-menu] 初始化');
    // 订阅 CLOSE 事件清理内部状态
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'CONNECTION_MENU_CLOSE') {
        currentMenu = null;
      }
    });
    return () => {
      unsub();
      if (DEBUG) console.log('[mod-connection-menu] 已卸载');
    };
  },
};

// 批量获取处理器（方便继承）
export function getConnectionMenuHandlers(bus: EditorBus) {
  return {
    onConnectEnd: createConnectionEndHandler(bus),
    showConnectionMenu: (params: any) => showConnectionMenu(bus, params),
    hideConnectionMenu: () => hideConnectionMenu(bus),
  };
}