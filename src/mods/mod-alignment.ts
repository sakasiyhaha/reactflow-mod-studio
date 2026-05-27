// src/mods/mod-alignment.ts
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
    const unsub = bus.subscribe(({ event, state }) => {
      const { selection, nodes } = state;
      if (selection.length < 2 && event.type !== 'AUTO_LAYOUT') return;
      let updatedNodes = [...nodes];

      switch (event.type) {
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
        case 'AUTO_LAYOUT': {
          const { horizontalSpacing = 280, verticalSpacing = 160, startX = 120, startY = 300 } = event.options || {};
          const layouted = autoLayoutUtil(nodes, state.edges, { horizontalSpacing, verticalSpacing, startX, startY });
          const updates = layouted.map((n: any) => ({ id: n.id, position: n.position }));
          bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates });
          if (DEBUG) console.log('[mod-alignment] 自动布局完成', { horizontalSpacing, verticalSpacing, startX, startY });
          return;
        }
        default:
          return;
      }

      const updates = updatedNodes
        .filter((n: any) => selection.includes(n.id))
        .map((n: any) => ({ id: n.id, position: n.position }));
      if (updates.length > 0) {
        bus.dispatch({ type: 'NODE_POSITIONS_CHANGED', updates });
        if (DEBUG) console.log(`[mod-alignment] ${event.type} 完成，更新 ${updates.length} 个节点`);
      }
    });
    return () => unsub();
  },
};