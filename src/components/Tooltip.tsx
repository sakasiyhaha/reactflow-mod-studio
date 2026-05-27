// src/components/Tooltip.tsx
// 自定义 Tooltip 组件，支持深色主题，悬浮显示提示文本

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string;        // 提示文本
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;         // 显示延迟（毫秒）
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top', delay = 300 }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const childRef = useRef<HTMLDivElement>(null);
  let timeoutId: ReturnType<typeof setTimeout>;

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (childRef.current) {
        const rect = childRef.current.getBoundingClientRect();
        let top = 0, left = 0;
        const offset = 8;
        switch (position) {
          case 'top':
            top = rect.top - offset;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - offset;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + offset;
            break;
        }
        setCoords({ top, left });
        setVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setVisible(false);
  };

  return (
    <>
      <div
        ref={childRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </div>
      {visible && createPortal(
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#1e1e1e',
            color: '#e0e0e0',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;