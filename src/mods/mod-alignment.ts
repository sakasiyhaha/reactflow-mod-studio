// src/mods/mod-alignment.ts
// 对齐与自动布局 Mod
// 监听 ALIGN_LEFT / ALIGN_RIGHT / ... / AUTO_LAYOUT 等事件
// 调用 alignUtils 和 layoutUtils 中的纯函数计算新位置，并将结果通过 NODE_POSITIONS_CHANGED 事件派发出去

import type { EditorMod, EditorBus } from '../bus/types';
import { autoLayout as autoLayoutUtil } from '../utils/layoutUtils';
import {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterX,
  alignCenterY,
  distributeHorizontal,
  distributeVertical,
} from '../utils/alignUtils';
import { DEBUG } from '../../config/debug';

export const modAlignment: EditorMod = {
  id: 'alignment',
  init(bus: EditorBus) {
    // 订阅所有总线事件
    const unsub = bus.subscribe(({ event, state }) => {
      const { selection, nodes } = state;

      // 对齐和分布操作至少需要 2 个选中节点；自动布局不需要选中节点，单独处理
      if (selection.length < 2 && event.type !== 'AUTO_LAYOUT') {
        return;
      }

      // 复制一份节点数组，供工具函数修改（工具函数会直接修改节点位置，但不会影响 state 中的原始引用）
      let updatedNodes = [...nodes];

      switch (event.type) {
        // ---------- 对齐系列 ----------
        case 'ALIGN_LEFT':
          updatedNodes = alignLeft(nodes.filter(n => selection.includes(n.id)));
          break;
        case 'ALIGN_RIGHT':
          updatedNodes = alignRight(nodes.filter(n => selection.includes(n.id)));
          break;
        case 'ALIGN_TOP':
          updatedNodes = alignTop(nodes.filter(n => selection.includes(n.id)));
          break;
        case 'ALIGN_BOTTOM':
          updatedNodes = alignBottom(nodes.filter(n => selection.includes(n.id)));
          break;
        case 'ALIGN_CENTER_X':
          updatedNodes = alignCenterX(nodes.filter(n => selection.includes(n.id)));
          break;
        case 'ALIGN_CENTER_Y':
          updatedNodes = alignCenterY(nodes.filter(n => selection.includes(n.id)));
          break;

        // ---------- 分布系列（至少3个节点） ----------
        case 'DISTRIBUTE_HORIZONTAL':
          if (selection.length >= 3) {
            updatedNodes = distributeHorizontal(nodes.filter(n => selection.includes(n.id)));
          }
          break;
        case 'DISTRIBUTE_VERTICAL':
          if (selection.length >= 3) {
            updatedNodes = distributeVertical(nodes.filter(n => selection.includes(n.id)));
          }
          break;

        // ---------- 自动布局 ----------
        case 'AUTO_LAYOUT': {
          // 对整个图进行基于拓扑分层的自动布局
          const layouted = autoLayoutUtil(nodes, state.edges, {
            horizontalSpacing: 280,
            verticalSpacing: 160,
            startX: 120,
            startY: 300,
          });

          // 提取所有节点的新位置
          const updates = layouted.map((n: any) => ({
            id: n.id,
            position: n.position,
          }));

          // 派发位置更新事件
          bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates });
          if (DEBUG) console.log('[mod-alignment] 自动布局完成');
          return; // 自动布局后直接返回，不再走后续的统一位置收集
        }

        default:
          return; // 不处理的事件直接忽略
      }

      // 收集所有选中节点在对齐/分布后的新位置
      const updates = updatedNodes
        .filter((n: any) => selection.includes(n.id))
        .map((n: any) => ({ id: n.id, position: n.position }));

      if (updates.length > 0) {
        bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates });
        if (DEBUG) console.log(`[mod-alignment] ${event.type} 完成，更新 ${updates.length} 个节点`);
      }
    });

    // 清理函数：取消订阅
    return () => {
      unsub();
      if (DEBUG) console.log('[mod-alignment] 已卸载');
    };
  },
};