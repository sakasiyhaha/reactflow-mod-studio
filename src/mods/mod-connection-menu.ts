// src/mods/mod-connection-menu.ts
import type { EditorMod, EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { isReconnecting } from './mod-reconnect'; // 导入重连状态检查函数
import { DEBUG } from '../../config/debug';

let currentMenu: any = null;

export function showConnectionMenu(bus: EditorBus, params: {
  x: number;
  y: number;
  sourceNodeId: string;
  sourceHandleId: string;
  availableTypes: any[];
  direction: 'forward' | 'reverse';
}) {
  if (currentMenu) hideConnectionMenu(bus);
  currentMenu = params;
  bus.dispatch({ type: 'CONNECTION_MENU_OPEN', payload: params });
  if (DEBUG) console.log('[connection-menu] 显示连接菜单', params);
}

export function hideConnectionMenu(bus: EditorBus) {
  if (currentMenu) {
    currentMenu = null;
    bus.dispatch({ type: 'CONNECTION_MENU_CLOSE' });
    if (DEBUG) console.log('[connection-menu] 关闭连接菜单');
  }
}

export function createConnectionEndHandler(bus: EditorBus) {
  return (event: any, connectionState: any) => {
    if (connectionState.isValid) return;

    // 检查是否处于重连状态，如果是则跳过菜单（避免在重连时弹出）
    if (isReconnecting()) {
      if (DEBUG) console.log('[connection-menu] 重连中，跳过菜单');
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

export const modConnectionMenu: EditorMod = {
  id: 'connection-menu',
  init(bus: EditorBus) {
    if (DEBUG) console.log('[mod-connection-menu] 初始化');
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'CONNECTION_MENU_CLOSE') currentMenu = null;
    });
    return () => {
      unsub();
      if (DEBUG) console.log('[mod-connection-menu] 已卸载');
    };
  },
};

export function getConnectionMenuHandlers(bus: EditorBus) {
  return {
    onConnectEnd: createConnectionEndHandler(bus),
    showConnectionMenu: (params: any) => showConnectionMenu(bus, params),
    hideConnectionMenu: () => hideConnectionMenu(bus),
  };
}