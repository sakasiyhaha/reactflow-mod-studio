// src/components/PaneContextMenu.tsx
// 画布右键菜单 —— 支持动态注册的菜单项

import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getPaneMenuItems } from '../registry/contextMenuRegistry';

interface PaneContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
}

export default function PaneContextMenu({ x, y, onClose, addNode }: PaneContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useReactFlow();
  const bus = useEditorBusContext();
  const handlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (node && !node.contains(e.target as Node)) onClose();
      };
      handlerRef.current = handler;
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (handlerRef.current) document.removeEventListener('mousedown', handlerRef.current);
    };
  }, [onClose]);

  const handleAdd = (type: string) => {
    const pos = instance.screenToFlowPosition({ x, y });
    addNode(type, { x: pos.x - 80, y: pos.y - 20 });
    onClose();
  };

  const state = bus.getState();
  const dynamicItems = getPaneMenuItems(state);
  const templates = getAllTemplates();

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {/* 内置菜单项：添加节点 */}
      {templates.map((t) => (
        <div key={t.type} className="context-menu-item" onClick={() => handleAdd(t.type)}>
          {t.icon ?? '📦'} {t.title}
        </div>
      ))}
      {/* 动态注册的菜单项 */}
      {dynamicItems.length > 0 && (
        <>
          <div className="context-menu-item separator" style={{ borderBottom: '1px solid var(--border)' }} />
          {dynamicItems.map((item) => (
            <div
              key={item.id}
              className="context-menu-item"
              onClick={() => {
                item.action(bus, null);
                onClose();
              }}
            >
              {item.icon ? `${item.icon} ` : ''}{item.label}
            </div>
          ))}
        </>
      )}
    </div>
  );
}