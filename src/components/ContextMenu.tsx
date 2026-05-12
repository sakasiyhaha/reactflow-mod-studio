// src/components/ContextMenu.tsx
// 节点右键菜单组件 —— 单选或多选时弹出，提供删除、复制、重置、锁定、批量连线、对齐分布等操作
// 菜单选项根据选中节点数量（单选/多选）动态构建
// 现在使用 getAllTemplates() 动态获取模板

import { useEffect, useRef } from 'react';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { generateNodeId } from '../utils';
import type { CustomNode } from '../utils/types';

interface ContextMenuProps {
    x: number;              // 菜单显示的横坐标（clientX）
    y: number;              // 菜单显示的纵坐标（clientY）
    nodeId: string | null;  // 右键的节点 ID，null 表示多选右键空白
    onClose: () => void;    // 关闭菜单的回调
    onToggleLibrary: () => void;  // 切换节点库的显示/隐藏
    leftCollapsed: boolean;       // 节点库是否已折叠
}

export default function ContextMenu({
    x, y, nodeId, onClose, onToggleLibrary, leftCollapsed,
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const bus = useEditorBusContext();

    // 点击菜单外部自动关闭
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // 获取当前总线状态
    const state = bus.getState();
    const selectedNodes = state.nodes.filter(n => state.selection.includes(n.id));
    const isMultiple = selectedNodes.length > 1;
    const isNodeLocked = state.nodes.find(n => n.id === nodeId)?.data?.locked ?? false;

    // ==================== 操作函数（全部通过 bus.dispatch 派发事件） ====================

    /** 删除节点（单选或多选） */
    const handleDelete = () => {
        if (isMultiple) {
            bus.dispatch({ type: 'NODE_DELETED', nodeIds: state.selection });
        } else if (nodeId) {
            bus.dispatch({ type: 'NODE_DELETED', nodeIds: [nodeId] });
        }
        onClose();
    };

    /** 复制节点（单选或多选），新节点位置偏移避免重叠 */
    const handleDuplicate = () => {
        if (isMultiple) {
            const toCopy = state.nodes.filter(n => state.selection.includes(n.id));
            const newNodes: CustomNode[] = toCopy.map((node, idx) => ({
                ...structuredClone(node),
                id: generateNodeId(),
                position: {
                    x: node.position.x + 50 * (idx + 1),
                    y: node.position.y + 50 * (idx + 1),
                },
                selected: false,
            }));
            bus.dispatch({ type: 'NODES_ADDED', nodes: newNodes });
        } else if (nodeId) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                const newNode: CustomNode = {
                    ...structuredClone(node),
                    id: generateNodeId(),
                    position: { x: node.position.x + 50, y: node.position.y + 50 },
                    selected: false,
                };
                bus.dispatch({ type: 'NODE_ADDED', node: newNode });
            }
        }
        onClose();
    };

    /** 重置属性：将节点的 value 设为 0，并传播到下游 */
    const handleReset = () => {
        if (nodeId) {
            bus.dispatch({
                type: 'NODE_DATA_CHANGED',
                nodeId,
                data: { value: 0 },
                propagate: true,
            });
        }
        onClose();
    };

    /** 锁定/解锁节点 */
    const handleToggleLock = () => {
        if (nodeId) {
            bus.dispatch({ type: 'NODE_LOCK_TOGGLED', nodeId });
        }
        onClose();
    };

    /** 批量连线：取第一个选中节点的第一个输出端口类型作为共同端口 */
    const handleBatchConnect = () => {
        const selected = state.nodes.filter(n => state.selection.includes(n.id));
        if (selected.length < 2) return;

        const firstTemplate = getAllTemplates().find(t => t.type === selected[0].type);
        const commonType = firstTemplate?.outputs?.[0]?.type;
        if (commonType) {
            bus.dispatch({
                type: 'BATCH_CONNECT_START',
                sourceNodeIds: state.selection,
                sourceHandleType: commonType,
            });
        }
        onClose();
    };

    // ==================== 菜单项动态构建 ====================
    const items: { label: string; action: () => void; type?: string }[] = [];

    if (isMultiple) {
        // 多选模式
        items.push(
            { label: `🔗 批量连线 (${selectedNodes.length})`, action: handleBatchConnect },
            { label: `🗑️ 删除选中节点 (${selectedNodes.length})`, action: handleDelete },
            { label: `📋 复制选中节点 (${selectedNodes.length})`, action: handleDuplicate },
            { label: '─── 对齐与分布 ───', action: () => {}, type: 'separator' },
            { label: '⬅ 左对齐', action: () => { bus.dispatch({ type: 'ALIGN_LEFT' }); onClose(); } },
            { label: '➡ 右对齐', action: () => { bus.dispatch({ type: 'ALIGN_RIGHT' }); onClose(); } },
            { label: '⬆ 顶对齐', action: () => { bus.dispatch({ type: 'ALIGN_TOP' }); onClose(); } },
            { label: '⬇ 底对齐', action: () => { bus.dispatch({ type: 'ALIGN_BOTTOM' }); onClose(); } },
            { label: '↔ 水平居中', action: () => { bus.dispatch({ type: 'ALIGN_CENTER_X' }); onClose(); } },
            { label: '↕ 垂直居中', action: () => { bus.dispatch({ type: 'ALIGN_CENTER_Y' }); onClose(); } },
        );
        if (selectedNodes.length >= 3) {
            items.push(
                { label: '─── 分布 ───', action: () => {}, type: 'separator' },
                { label: '↔ 水平均分', action: () => { bus.dispatch({ type: 'DISTRIBUTE_HORIZONTAL' }); onClose(); } },
                { label: '↕ 垂直均分', action: () => { bus.dispatch({ type: 'DISTRIBUTE_VERTICAL' }); onClose(); } },
            );
        }
        items.push({ label: '✖ 取消', action: onClose, type: 'separator' });
    } else {
        // 单选模式
        items.push(
            { label: '🗑️ 删除节点', action: handleDelete },
            { label: '📋 复制节点', action: handleDuplicate },
            { label: '🔄 重置属性', action: handleReset },
            {
                label: isNodeLocked ? '🔓 解锁节点' : '🔒 锁定节点',
                action: handleToggleLock,
            },
            {
                label: leftCollapsed ? '📂 显示节点库' : '📁 隐藏节点库',
                action: () => { onToggleLibrary(); onClose(); },
            },
            { label: '✖ 取消', action: onClose, type: 'separator' },
        );
    }

    return (
        <div ref={menuRef} className="context-menu" style={{ left: x, top: y }}>
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className={`context-menu-item${item.type === 'separator' ? ' separator' : ''}`}
                    onClick={item.action}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
}