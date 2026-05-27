// src/components/SidebarButtonGroup.tsx
// 侧边栏按钮组组件 —— 渲染所有通过 registerSidebarButton 注册的按钮

import React from 'react';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getSidebarButtons } from '../registry/sidebarRegistry';

const SidebarButtonGroup: React.FC = () => {
  const bus = useEditorBusContext();
  const buttons = getSidebarButtons();

  if (buttons.length === 0) return null;

  return (
    <div className="sidebar-button-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
      {buttons.map(btn => (
        <button
          key={btn.id}
          className="sidebar-action-btn"
          onClick={() => btn.onClick(bus)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '13px',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {btn.icon ? `${btn.icon} ` : ''}{btn.label}
        </button>
      ))}
    </div>
  );
};

export default SidebarButtonGroup;