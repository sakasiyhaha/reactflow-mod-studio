// src/components/NodeLibrary.tsx
// 节点库组件 —— 左侧面板中的节点列表，支持按分类分组、搜索过滤、点击添加或拖拽到画布
// 现在使用 getAllTemplates() 动态获取节点模板，支持自定义扩展

import { useState, useRef } from 'react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';

export default function NodeLibrary({ onAddNode, collapsed }: {
  onAddNode: (type: string) => void;  // 添加节点的回调（由 App.tsx 提供）
  collapsed: boolean;                // 面板是否折叠
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const isDragging = useRef(false);   // 标记是否正在拖拽（防止拖拽时误触发 click 事件）

  // 获取当前所有可用的模板（内置 + 自定义）
  const templates = getAllTemplates();

  // ---------- 按分类分组 ----------
  const grouped: Record<string, typeof templates> = {};
  templates.forEach((def) => {
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  });

  // ---------- 根据搜索词过滤分组 ----------
  const filteredGroups: Record<string, typeof templates> = {};
  Object.entries(grouped).forEach(([cat, nodes]) => {
    const filtered = nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      filteredGroups[cat] = filtered;
    }
  });

  // ---------- 拖拽/点击互斥逻辑 ----------
  const handleMouseDown = () => {
    isDragging.current = false;   // 每次鼠标按下时重置拖拽标记
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    isDragging.current = true;    // 标记正在拖拽
    e.dataTransfer.setData('application/reactflow-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (type: string) => {
    // 如果已经发生了拖拽（dragstart），则忽略本次 click
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    onAddNode(type);
  };

  // 折叠状态：只显示一个图标
  if (collapsed) {
    return (
      <div style={{
        writingMode: 'vertical-rl', textOrientation: 'mixed',
        padding: '12px 0', color: 'var(--primary)', fontSize: 14, fontWeight: 'bold'
      }}>
        📦
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-content" style={{ paddingTop: '12px' }}>
        {/* 搜索框 */}
        <input
          type="text"
          placeholder="🔍 搜索节点..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', marginBottom: 12,
            background: 'var(--bg-canvas)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
          }}
        />

        {/* 分类和节点列表 */}
        {Object.entries(filteredGroups).map(([cat, nodes]) => (
          <div key={cat}>
            <div className="category-title">{cat}</div>
            {nodes.map((def) => (
              <button
                key={def.type}
                draggable
                onMouseDown={handleMouseDown}
                onDragStart={(e) => handleDragStart(e, def.type)}
                onClick={() => handleClick(def.type)}
              >
                {def.icon ?? '📦'} {def.title}
              </button>
            ))}
          </div>
        ))}
        {Object.keys(filteredGroups).length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center' }}>
            没有匹配的节点
          </p>
        )}
      </div>
      <div className="sidebar-footer">
        <h3>📦 节点库</h3>
      </div>
    </>
  );
}