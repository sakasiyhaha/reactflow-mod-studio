// src/components/FloatingSearch.tsx
// 浮动搜索框 —— 双击画布空白弹出，支持输入过滤节点类型，键盘上下选择，回车确认添加
// 现在使用 getAllTemplates() 动态获取节点模板

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';

interface FloatingSearchProps {
  x: number;                          // 弹出位置 X
  y: number;                          // 弹出位置 Y
  onClose: () => void;                // 关闭回调
  addNode: (type: string, position: { x: number; y: number }) => void; // 添加节点回调
}

export default function FloatingSearch({ x, y, onClose, addNode }: FloatingSearchProps) {
  const [query, setQuery] = useState('');           // 搜索文本
  const [selectedIdx, setSelectedIdx] = useState(0); // 键盘选中索引
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instance = useReactFlow();

  // 从注册中心获取当前所有模板并过滤
  const filtered = getAllTemplates().filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase())
  );

  // 自动聚焦输入框
  useEffect(() => { inputRef.current?.focus(); }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
  }, [onClose]);

  // 选择节点类型后添加到画布并关闭
  const handleSelect = useCallback(
    (type: string) => {
      const pos = instance.screenToFlowPosition({ x, y });
      addNode(type, { x: pos.x - 80, y: pos.y - 20 });
      onClose();
    },
    [instance, x, y, addNode, onClose]
  );

  // 键盘交互：上下选择、回车确认、Esc 关闭
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIdx]) handleSelect(filtered[selectedIdx].type); }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <div ref={containerRef} className="context-menu" style={{ position: 'fixed', left: x - 150, top: y - 30, width: 300, zIndex: 1010 }}>
      <input
        ref={inputRef} type="text" placeholder="搜索节点类型..." value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: '8px 8px 0 0', fontSize: 14, outline: 'none', color: 'var(--text-primary)', background: '#fff' }}
        autoFocus
      />
      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
        {filtered.map((t, idx) => (
          <div key={t.type} className={`context-menu-item${idx === selectedIdx ? ' selected' : ''}`} onClick={() => handleSelect(t.type)}
               style={{ background: idx === selectedIdx ? '#F5F9FF' : 'transparent' }}>
            {t.icon ?? '📦'} {t.title}
            <span style={{ float: 'right', color: 'var(--text-secondary)', fontSize: 11 }}>{t.category}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="context-menu-item" style={{ cursor: 'default', color: 'var(--text-secondary)' }}>无匹配节点</div>}
      </div>
    </div>
  );
}