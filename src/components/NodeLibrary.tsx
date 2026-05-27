// src/components/NodeLibrary.tsx
// 节点库组件 —— 左侧面板中的节点列表，支持按分类分组、搜索过滤、点击添加或拖拽到画布
// 自包含：不再依赖外部 addNode 回调
// 符合高保真方案：搜索框、分类标题、节点按钮样式统一，图标按分类着色

import { useState, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { createNode } from '../utils/nodeFactory';

// 根据分类返回对应的图标颜色（符合高保真方案）
const getCategoryColor = (category: string): string => {
  switch (category) {
    case '通用':
      return '#a0aec0';
    case '运算':
      return '#4299e1';
    case '数据':
      return '#48bb78';
    case '常量':
      return '#ed8936';
    case '逻辑':
      return '#9f7aea';
    case '控制流':
      return '#f56565';
    default:
      return '#a0aec0';
  }
};

export default function NodeLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const isDragging = useRef(false);
  const instance = useReactFlow();
  const bus = useEditorBusContext();

  const templates = getAllTemplates();

  // 按分类分组
  const grouped: Record<string, typeof templates> = {};
  templates.forEach((def) => {
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  });

  // 过滤
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

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
  };

  // 添加节点（点击时）
  const handleAddNode = (type: string) => {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = instance.screenToFlowPosition(center);
    const newNode = createNode(type, pos);
    bus.dispatch({ type: 'NODE_ADDED', node: newNode });
  };

  // 拖拽相关
  const handleMouseDown = () => {
    isDragging.current = false;
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    isDragging.current = true;
    e.dataTransfer.setData('application/reactflow-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (type: string) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    handleAddNode(type);
  };

  return (
    <div className="node-library">
      <div className="node-library-search-wrapper">
        <input
          type="text"
          placeholder="搜索节点（如加法器、开关）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="node-library-search"
        />
        {searchTerm && (
          <button className="node-library-search-clear" onClick={clearSearch}>
            ✕
          </button>
        )}
      </div>
      <div className="node-library-list">
        {Object.entries(filteredGroups).map(([cat, nodes]) => (
          <div key={cat} className="node-library-category">
            <div className="node-library-category-title">{cat}</div>
            {nodes.map((def) => {
              const iconColor = getCategoryColor(def.category);
              return (
                <button
                  key={def.type}
                  draggable
                  onMouseDown={handleMouseDown}
                  onDragStart={(e) => handleDragStart(e, def.type)}
                  onClick={() => handleClick(def.type)}
                  className="node-library-item"
                >
                  <span className="node-library-item-icon" style={{ color: iconColor }}>
                    {def.icon ?? '📦'}
                  </span>
                  <span className="node-library-item-label">{def.title}</span>
                </button>
              );
            })}
          </div>
        ))}
        {Object.keys(filteredGroups).length === 0 && (
          <p className="node-library-empty">没有匹配的节点</p>
        )}
      </div>
    </div>
  );
}