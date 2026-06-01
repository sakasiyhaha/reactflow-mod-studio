// src/mods/mod-clipboard.ts
// 剪贴板 Mod - 处理复制、剪切、粘贴操作（保留连线）
// 优化：粘贴后自动选中新节点，增加 Ctrl+A 全选
// 新增：粘贴时增加资源引用计数（ResourceStore.retain）

import type { EditorMod, EditorBus } from '../bus/types';
import { generateNodeId } from '../utils';
import { DEBUG } from '../../config/debug';
import type { CustomNode, CustomEdge } from '../utils/types';
import { ResourceStore } from '../store/ResourceStore';

/** 剪贴板数据结构：存储节点和它们之间的边 */
interface ClipboardData {
  nodes: CustomNode[];
  edges: CustomEdge[];
}

// 模块私有变量，存储剪贴板内容
let clipboard: ClipboardData | null = null;

/** 判断当前焦点是否在输入框或可编辑区域，避免在输入时触发快捷键 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export const modClipboard: EditorMod = {
  id: 'clipboard',
  init(bus: EditorBus) {
    // 注册全局键盘事件
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      // ---------- Ctrl+C 复制 ----------
      if (key === 'c') {
        e.preventDefault();
        const state = bus.getState();
        const selectedIds = new Set(state.selection);
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        if (selectedNodes.length === 0) return;

        const selectedEdges = state.edges.filter(
          e => selectedIds.has(e.source) && selectedIds.has(e.target)
        );

        clipboard = {
          nodes: selectedNodes.map(node => structuredClone(node)) as CustomNode[],
          edges: selectedEdges.map(edge => structuredClone(edge)) as CustomEdge[],
        };
        if (DEBUG) console.log(`[mod-clipboard] 复制 ${clipboard.nodes.length} 个节点，${clipboard.edges.length} 条边`);
      }

      // ---------- Ctrl+X 剪切 ----------
      else if (key === 'x') {
        e.preventDefault();
        const state = bus.getState();
        const selectedIds = new Set(state.selection);
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        if (selectedNodes.length === 0) return;

        const selectedEdges = state.edges.filter(
          e => selectedIds.has(e.source) && selectedIds.has(e.target)
        );

        clipboard = {
          nodes: selectedNodes.map(node => structuredClone(node)) as CustomNode[],
          edges: selectedEdges.map(edge => structuredClone(edge)) as CustomEdge[],
        };

        if (DEBUG) console.log(`[mod-clipboard] 剪切 ${clipboard.nodes.length} 个节点，${clipboard.edges.length} 条边`);

        // 删除画布上的节点（删除时会自动释放资源，由资源生命周期 Mod 负责）
        bus.dispatch({ type: 'NODE_DELETED', nodeIds: Array.from(selectedIds) });
      }

      // ---------- Ctrl+V 粘贴 ----------
      else if (key === 'v') {
        e.preventDefault();
        if (!clipboard || clipboard.nodes.length === 0) return;

        // 建立旧节点 ID → 新节点 ID 的映射，用于重新连接边
        const oldIdToNewId = new Map<string, string>();

        // 1. 创建新节点，偏移位置避免重叠
        const newNodes: CustomNode[] = clipboard.nodes.map((node, index) => {
          const oldId = node.id;
          const newId = generateNodeId();
          oldIdToNewId.set(oldId, newId);

          // 粘贴时，为新节点中的每个资源增加引用计数
          const resources = node.data._resources;
          if (resources && resources.length > 0) {
            for (const resId of resources) {
              // 如果资源存在，增加引用计数；如果不存在（理论上不应该），则跳过
              if (ResourceStore.has(resId)) {
                ResourceStore.retain(resId);
                if (DEBUG) console.log(`[mod-clipboard] 粘贴时增加资源引用: ${resId}`);
              } else {
                console.warn(`[mod-clipboard] 粘贴时发现不存在的资源: ${resId}，跳过`);
              }
            }
          }

          return {
            ...structuredClone(node),
            id: newId,
            position: {
              x: (node.position?.x ?? 0) + 50 * (index + 1),
              y: (node.position?.y ?? 0) + 50 * (index + 1),
            },
          } as CustomNode;
        });

        // 2. 批量添加新节点
        bus.dispatch({ type: 'NODES_ADDED', nodes: newNodes });

        // 3. 为新节点创建新边
        const newEdges: CustomEdge[] = clipboard.edges
          .filter(edge => oldIdToNewId.has(edge.source) && oldIdToNewId.has(edge.target))
          .map(edge => ({
            ...structuredClone(edge),
            id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            source: oldIdToNewId.get(edge.source)!,
            target: oldIdToNewId.get(edge.target)!,
          })) as CustomEdge[];

        // 4. 逐条添加边
        if (newEdges.length > 0) {
          newEdges.forEach(edge => {
            bus.dispatch({ type: 'EDGE_ADDED', edge });
          });
        }

        if (DEBUG) console.log(`[mod-clipboard] 粘贴 ${newNodes.length} 个节点，${newEdges.length} 条边`);

        // 5. 粘贴后自动选中这些新节点
        Promise.resolve().then(() => {
          bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: newNodes.map(n => n.id) });
        });
      }

      // ---------- Ctrl+A 全选 ----------
      else if (key === 'a') {
        e.preventDefault();
        const allNodeIds = bus.getState().nodes.map(n => n.id);
        bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: allNodeIds });
        if (DEBUG) console.log('[mod-clipboard] 全选节点');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clipboard = null;
      if (DEBUG) console.log('[mod-clipboard] 已卸载');
    };
  },
};