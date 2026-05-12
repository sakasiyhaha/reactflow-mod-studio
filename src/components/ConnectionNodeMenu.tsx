// src/components/ConnectionNodeMenu.tsx
// 连接节点菜单 —— 当从端口拖线到空白处时弹出，显示可连接的目标/源节点类型，点击创建一个新节点并自动连线

import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeTemplate } from '../nodeTemplates';

interface ConnectionNodeMenuProps {
    x: number;                          // 菜单位置 X（屏幕坐标）
    y: number;                          // 菜单位置 Y
    availableTypes: NodeTemplate[];     // 可选的节点模板列表
    sourceNodeId: string;               // 拖线来源节点 ID
    sourceHandleId: string;             // 拖线来源端口 ID
    onClose: () => void;                // 关闭菜单回调
    addNodeAndConnect: (type: string, position: { x: number; y: number }, sourceNodeId: string, sourceHandleId: string) => void; // 正向连接
    addNodeAndConnectReverse?: (type: string, position: { x: number; y: number }, targetNodeId: string, targetHandleId: string) => void; // 反向连接
    direction?: 'forward' | 'reverse';  // 正向或反向
}

export default function ConnectionNodeMenu({
    x, y, availableTypes, sourceNodeId, sourceHandleId,
    onClose, addNodeAndConnect, addNodeAndConnectReverse,
    direction = 'forward',
}: ConnectionNodeMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    // 点击菜单外部关闭
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    /** 选择一个节点类型：创建节点并自动连线，然后关闭菜单 */
    const handleSelect = (type: string) => {
        const flowPos = screenToFlowPosition({ x, y }); // 转为画布坐标
        if (direction === 'reverse' && addNodeAndConnectReverse) {
            // 反向：新节点作为源，连线到当前节点
            addNodeAndConnectReverse(type, { x: flowPos.x - 200, y: flowPos.y - 20 }, sourceNodeId, sourceHandleId);
        } else {
            // 正向：新节点作为目标，从当前节点连线
            addNodeAndConnect(type, flowPos, sourceNodeId, sourceHandleId);
        }
        onClose();
    };

    return (
        <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
            {availableTypes.map((t) => (
                <div
                    key={t.type}
                    className="context-menu-item"
                    onClick={() => handleSelect(t.type)}
                >
                    {t.icon ?? '📦'} {t.title}
                </div>
            ))}
        </div>
    );
}