// src/mods/mod-clipboard.ts
// 剪贴板 Mod - 处理复制、剪切、粘贴操作（保留连线）
// 优化：粘贴后自动选中新节点，增加 Ctrl+A 全选

import type { EditorMod, EditorBus } from '../bus/types';
import { generateNodeId } from '../utils';
import { DEBUG } from '../../config/debug';
import type { CustomNode, CustomEdge } from '../utils/types';

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
      // 如果焦点在输入框内，不处理快捷键
      if (isEditableTarget(e.target)) return;

      // 仅处理 Ctrl / Cmd 组合键
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      // ---------- Ctrl+C 复制 ----------
      if (key === 'c') {
        e.preventDefault();                               // 阻止浏览器默认行为
        const state = bus.getState();                     // 获取当前状态
        const selectedIds = new Set(state.selection);     // 当前选中的节点 ID 集合
        const selectedNodes = state.nodes.filter(n => selectedIds.has(n.id));
        if (selectedNodes.length === 0) return;

        // 只复制两端都在选中节点集合内的边
        const selectedEdges = state.edges.filter(
          e => selectedIds.has(e.source) && selectedIds.has(e.target)
        );

        // 深拷贝选中的节点和边，存入剪贴板
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

        // 存入选中的节点和边（与复制相同）
        clipboard = {
          nodes: selectedNodes.map(node => structuredClone(node)) as CustomNode[],
          edges: selectedEdges.map(edge => structuredClone(edge)) as CustomEdge[],
        };

        if (DEBUG) console.log(`[mod-clipboard] 剪切 ${clipboard.nodes.length} 个节点，${clipboard.edges.length} 条边`);

        // 然后删除画布上的这些节点 → 实现“剪切”
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
          const oldId = node.id;                  // 保留旧 ID
          const newId = generateNodeId();         // 生成新 ID
          oldIdToNewId.set(oldId, newId);         // 记录映射
          return {
            ...structuredClone(node),
            id: newId,
            position: {
              x: (node.position?.x ?? 0) + 50 * (index + 1),  // 逐步偏移
              y: (node.position?.y ?? 0) + 50 * (index + 1),
            },
          } as CustomNode;
        });

        // 2. 批量添加新节点
        bus.dispatch({ type: 'NODES_ADDED', nodes: newNodes });

        // 3. 为新节点创建新边（两端节点的旧 ID 都能映射到新 ID 的边才复制）
        const newEdges: CustomEdge[] = clipboard.edges
          .filter(edge => oldIdToNewId.has(edge.source) && oldIdToNewId.has(edge.target))
          .map(edge => ({
            ...structuredClone(edge),
            id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,  // 新边 ID
            source: oldIdToNewId.get(edge.source)!,   // 映射为新源节点 ID
            target: oldIdToNewId.get(edge.target)!,   // 映射为新目标节点 ID
          })) as CustomEdge[];

        // 4. 逐条添加边
        if (newEdges.length > 0) {
          newEdges.forEach(edge => {
            bus.dispatch({ type: 'EDGE_ADDED', edge });
          });
        }

        if (DEBUG) console.log(`[mod-clipboard] 粘贴 ${newNodes.length} 个节点，${newEdges.length} 条边`);

        // 5. 粘贴后自动选中这些新节点（方便用户继续操作）
        Promise.resolve().then(() => {
          bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: newNodes.map(n => n.id) });
        });
      }

      // ---------- Ctrl+A 全选 ----------
      else if (key === 'a') {
        e.preventDefault();
        const allNodeIds = bus.getState().nodes.map(n => n.id);  // 所有节点 ID
        bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: allNodeIds });
        if (DEBUG) console.log('[mod-clipboard] 全选节点');
      }
    };

    // 注册全局键盘监听
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数：移除键盘监听，清空剪贴板
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clipboard = null;
      if (DEBUG) console.log('[mod-clipboard] 已卸载');
    };
  },
};