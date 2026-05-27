// src/components/PropsPanel.tsx
// 属性面板 —— 右侧面板，支持动态注册整个面板组件（替换默认编辑器）
// 符合高保真方案：面板标题、属性编辑区、隐藏调试信息

import React from 'react';
import CollapseButton from './CollapseButton';
import { getPropsPanelComponents } from '../registry/propsPanelRegistry';
import { useEditorBusContext } from '../bus/EditorBusContext';
import type { CustomNode } from '../utils/types';

interface PropsPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  selectedNode: CustomNode | null;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
}

export default function PropsPanel({ collapsed, onToggle, selectedNode, updateNodeData }: PropsPanelProps) {
  const bus = useEditorBusContext();
  const panelComponents = getPropsPanelComponents();

  // 如果没有注册任何面板组件，显示空状态
  if (panelComponents.length === 0) {
    return (
      <div className={`props-panel${collapsed ? ' collapsed' : ''} glass-effect`}>
        <CollapseButton side="right" collapsed={collapsed} onClick={onToggle} />
        {!collapsed && (
          <div className="props-content">
            <p className="prop-tip">未注册属性面板组件</p>
          </div>
        )}
      </div>
    );
  }

  // 渲染第一个注册的面板组件（通常只有一个，按 order 排序后取第一个）
  const PrimaryPanel = panelComponents[0].component;

  return (
    <div className={`props-panel${collapsed ? ' collapsed' : ''} glass-effect`}>
      <CollapseButton side="right" collapsed={collapsed} onClick={onToggle} />
      {!collapsed && (
        <div className="props-content">
          <PrimaryPanel selectedNode={selectedNode} bus={bus} />
        </div>
      )}
    </div>
  );
}