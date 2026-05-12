// src/hooks/useCanvasContextMenu.ts
// 画布右键菜单绑定 Hook —— 在画布容器上监听 contextmenu 事件
// 判断右键位置是否有节点，分别触发节点右键菜单或画布右键菜单

import { useEffect } from 'react';
import { DEBUG } from '../../config/debug';
import type { Node } from '@xyflow/react';

// 函数类型别称，提高可读性
interface ScreenToFlowPosition {
  (position: { x: number; y: number }): { x: number; y: number };
}
interface GetIntersectingNodes {
  (rect: { x: number; y: number; width: number; height: number }): Node[];
}
type NodeContextMenuHandler = (
  event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void },
  node: Node | null
) => void;
type PaneContextMenuHandler = (
  event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void }
) => void;

/**
 * @param canvasContainerRef   画布容器的 ref
 * @param screenToFlowPosition 屏幕坐标 → 画布坐标转换函数
 * @param getIntersectingNodes 根据矩形获取相交节点
 * @param onNodeContextMenu    节点右键菜单回调
 * @param onPaneContextMenu    画布右键菜单回调
 * @param nodes                当前所有节点
 */
export function useCanvasContextMenu(
  canvasContainerRef: React.RefObject<HTMLDivElement | null>,
  screenToFlowPosition: ScreenToFlowPosition,
  getIntersectingNodes: GetIntersectingNodes,
  onNodeContextMenu: NodeContextMenuHandler,
  onPaneContextMenu: PaneContextMenuHandler,
  nodes: Node[]
) {
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent) => {
      // 将屏幕坐标转为画布坐标，查找该位置下的节点
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const intersections = getIntersectingNodes({
        x: flowPos.x, y: flowPos.y, width: 1, height: 1,
      });

      // 构建一个简单的模拟事件对象
      const mockEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
      };

      if (intersections?.length) {
        // 在节点上右键
        e.preventDefault();
        e.stopPropagation();
        if (DEBUG) console.log('[canvasContextMenu] 节点右键触发');
        onNodeContextMenu(mockEvent, intersections[0]);
        return;
      }

      // 在空白处右键
      e.preventDefault();
      e.stopPropagation();

      const selectedNodes = nodes.filter(n => n.selected);
      if (selectedNodes.length > 1) {
        // 多选状态下在空白处右键 → 仍然弹节点菜单（处理多选批量操作）
        if (DEBUG) console.log('[canvasContextMenu] 多选画布右键');
        onNodeContextMenu(mockEvent, null);   // null 表示多选，没有具体节点
      } else {
        // 未多选时在空白处右键 → 弹画布菜单（添加节点）
        if (DEBUG) console.log('[canvasContextMenu] 画布右键');
        onPaneContextMenu(mockEvent);
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [canvasContainerRef, screenToFlowPosition, getIntersectingNodes, onNodeContextMenu, onPaneContextMenu, nodes]);
}