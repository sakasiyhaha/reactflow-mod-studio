// src/components/FloatingSearch.tsx
// 浮动搜索框 —— 支持自定义过滤器

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { applySearchFilters } from '../utils/searchExtensions';

interface FloatingSearchProps {
  x: number;
  y: number;
  onClose: () => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
}

export default function FloatingSearch({ x, y, onClose, addNode }: FloatingSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instance = useReactFlow();

  // 获取所有模板（内置 + 自定义）
  const allTemplates = getAllTemplates();

  // 内置过滤：按标题或分类匹配关键词
  const builtInFiltered = allTemplates.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase())
  );

  // 应用外部注册的过滤器（可修改列表、排序、添加额外项等）
  const filtered = applySearchFilters(builtInFiltered, query);

  // 自动聚焦
  useEffect(() => { inputRef.current?.focus(); }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // 选择节点
  const handleSelect = useCallback(
    (type: string) => {
      const pos = instance.screenToFlowPosition({ x, y });
      addNode(type, { x: pos.x - 80, y: pos.y - 20 });
      onClose();
    },
    [instance, x, y, addNode, onClose]
  );

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIdx]) handleSelect(filtered[selectedIdx].type);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // 当过滤结果变化时，重置选中索引
  useEffect(() => {
    setSelectedIdx(0);
  }, [filtered]);

  return (
    <div ref={containerRef} className="context-menu" style={{ position: 'fixed', left: x - 150, top: y - 30, width: 300, zIndex: 1010 }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="搜索节点类型..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); }}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: '8px 8px 0 0', fontSize: 14, outline: 'none', color: 'var(--text-primary)', background: '#fff' }}
        autoFocus
      />
      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
        {filtered.map((t, idx) => (
          <div
            key={t.type}
            className={`context-menu-item${idx === selectedIdx ? ' selected' : ''}`}
            onClick={() => handleSelect(t.type)}
            style={{ background: idx === selectedIdx ? '#F5F9FF' : 'transparent' }}
          >
            {t.icon ?? '📦'} {t.title}
            <span style={{ float: 'right', color: 'var(--text-secondary)', fontSize: 11 }}>{t.category}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="context-menu-item" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>
            无匹配节点
          </div>
        )}
      </div>
    </div>
  );
}