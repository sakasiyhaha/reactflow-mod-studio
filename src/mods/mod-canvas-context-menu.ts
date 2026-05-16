// src/mods/mod-canvas-context-menu.ts
// 画布右键菜单 Mod
// 提供纯函数，判断右键位置应该弹出节点菜单还是画布菜单
// 支持继承：暴露 getContextMenuTarget 工具函数
import type { EditorMod } from '../bus/types';
import type { Node } from '@xyflow/react';
import { DEBUG } from '../../config/debug';

/**
 * 右键目标结果类型
 */
export interface ContextMenuTarget {
  type: 'node' | 'pane' | 'multiple';   // multiple 表示多选状态下右键空白
  nodeId?: string;                       // 如果 type 为 'node'，对应的节点 ID
}

/**
 * 核心判断函数：根据鼠标位置和当前节点状态，确定应该弹出什么菜单
 * @param screenX 鼠标屏幕 X 坐标
 * @param screenY 鼠标屏幕 Y 坐标
 * @param screenToFlowPosition 屏幕坐标转画布坐标函数（由 useReactFlow 提供）
 * @param getIntersectingNodes 获取指定矩形内节点的函数（由 useReactFlow 提供）
 * @param nodes 当前所有节点
 * @returns 菜单目标类型
 */
export function getContextMenuTarget(
  screenX: number,
  screenY: number,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
  getIntersectingNodes: (rect: { x: number; y: number; width: number; height: number }) => Node[],
  nodes: Node[]
): ContextMenuTarget {
  // 转换到画布坐标
  const flowPos = screenToFlowPosition({ x: screenX, y: screenY });
  // 查找该点下的节点（1x1 矩形）
  const intersections = getIntersectingNodes({
    x: flowPos.x,
    y: flowPos.y,
    width: 1,
    height: 1,
  });

  if (intersections.length > 0) {
    // 在节点上右键
    return { type: 'node', nodeId: intersections[0].id };
  }

  // 在空白处右键：检查是否有选中的多个节点
  const selectedNodes = nodes.filter(n => n.selected);
  if (selectedNodes.length > 1) {
    return { type: 'multiple' };  // 多选状态，弹出节点菜单（批量操作）
  }

  return { type: 'pane' };  // 普通空白，弹出画布菜单
}

// ==================== Mod 定义 ====================
export const modCanvasContextMenu: EditorMod = {
  id: 'canvas-context-menu',
  init() {
    if (DEBUG) console.log('[mod-canvas-context-menu] 初始化');
    // 此 Mod 仅作为工具函数容器，无需订阅
    return () => {
      if (DEBUG) console.log('[mod-canvas-context-menu] 已卸载');
    };
  },
};

// 为了方便继承，也可以导出批量工具对象
export const canvasContextMenuUtils = {
  getContextMenuTarget,
};