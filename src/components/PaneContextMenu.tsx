// src/components/PaneContextMenu.tsx
// 画布右键菜单 —— 在画布空白处右键时弹出，列出所有节点模板，点击在右键位置添加节点
// 现在使用 getAllTemplates() 动态获取模板列表

import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';

interface PaneContextMenuProps {
  x: number;                          // 菜单位置 X
  y: number;                          // 菜单位置 Y
  onClose: () => void;                // 关闭回调
  addNode: (type: string, position: { x: number; y: number }) => void; // 添加节点回调
}

export default function PaneContextMenu({ x, y, onClose, addNode }: PaneContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useReactFlow();
  const handlerRef = useRef<((e: MouseEvent) => void) | null>(null); // 保存外部点击处理器，用于清理

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => { if (node && !node.contains(e.target as Node)) onClose(); };
      handlerRef.current = handler;
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (handlerRef.current) document.removeEventListener('mousedown', handlerRef.current);
    };
  }, [onClose]);

  // 选择节点类型后，在右键位置添加节点
  const handleAdd = (type: string) => {
    const pos = instance.screenToFlowPosition({ x, y });
    addNode(type, { x: pos.x - 80, y: pos.y - 20 });
    onClose();
  };

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {getAllTemplates().map((t) => (
        <div key={t.type} className="context-menu-item" onClick={() => handleAdd(t.type)}>
          {t.icon ?? '📦'} {t.title}
        </div>
      ))}
    </div>
  );
}