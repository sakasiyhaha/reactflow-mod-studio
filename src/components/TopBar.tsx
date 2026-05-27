// src/components/TopBar.tsx
// 顶部栏组件 —— 动态渲染注册的左/中/右区域项目
// 支持下拉菜单，使用 Portal 避免被画布遮挡
// 所有按钮使用自定义 Tooltip 组件，替代原生 title

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { useReactFlow } from '@xyflow/react';
import {
  getTopBarLeftItems,
  getTopBarCenterItems,
  getTopBarRightItems,
  type TopBarItem,
} from '../registry/topBarRegistry';
import Tooltip from './Tooltip';

const isSeparator = (item: TopBarItem) => item.id.startsWith('separator-');

// 标准按钮渲染组件（使用 Tooltip）
const StandardButton: React.FC<{ item: TopBarItem; onClick: () => void; disabled: boolean }> = ({ item, onClick, disabled }) => {
  const { label, icon, shortcut } = item;
  const tooltipText = shortcut ? `${label} (${shortcut})` : label;
  return (
    <Tooltip content={tooltipText} position="bottom" delay={500}>
      <button
        className="top-bar-btn"
        onClick={onClick}
        disabled={disabled}
      >
        {icon && <span className="top-bar-icon">{icon}</span>}
        {label && <span>{label}</span>}
        {shortcut && <span className="top-bar-shortcut">{shortcut}</span>}
      </button>
    </Tooltip>
  );
};

// 下拉菜单组件（使用 Portal 挂载到 body）
const DropdownMenu: React.FC<{ items: TopBarItem[]; onClose: () => void; anchorRef: React.RefObject<HTMLElement> }> = ({ items, onClose, anchorRef }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const bus = useEditorBusContext();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleItemClick = (item: TopBarItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
    } else {
      switch (item.id) {
        case 'undo':
          bus.dispatch({ type: 'HISTORY_UNDO' });
          break;
        case 'redo':
          bus.dispatch({ type: 'HISTORY_REDO' });
          break;
        case 'save':
          bus.dispatch({ type: 'SAVE_WORKFLOW' });
          break;
        case 'load':
          bus.dispatch({ type: 'LOAD_WORKFLOW' });
          break;
        case 'zoom-in':
          zoomIn();
          break;
        case 'zoom-out':
          zoomOut();
          break;
        case 'fit-view':
          fitView({ padding: 0.2 });
          break;
        case 'settings':
          bus.dispatch({ type: 'PROJECT_CONFIG_TOGGLE_PANEL' });
          break;
        default:
          console.warn(`[DropdownMenu] 未处理: ${item.id}`);
      }
    }
    onClose();
  };

  const menu = (
    <div
      ref={menuRef}
      className="top-bar-dropdown"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
    >
      {items.map((item) => {
        if (isSeparator(item)) {
          return <div key={item.id} className="top-bar-dropdown-separator" />;
        }
        return (
          <div
            key={item.id}
            className="top-bar-dropdown-item"
            onClick={() => handleItemClick(item)}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="top-bar-dropdown-shortcut">{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );

  return createPortal(menu, document.body);
};

const TopBar: React.FC = () => {
  const bus = useEditorBusContext();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const leftItems = getTopBarLeftItems();
  const centerItems = getTopBarCenterItems();
  const rightItems = getTopBarRightItems();

  const [enabledMap, setEnabledMap] = useState<Map<string, boolean>>(new Map());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'SET_TOOLBAR_ENABLED') {
        setEnabledMap(prev => {
          const newMap = new Map(prev);
          newMap.set(event.payload.buttonId, event.payload.enabled);
          return newMap;
        });
      }
    });
    return unsub;
  }, [bus]);

  const handleButtonClick = (item: TopBarItem) => {
    const isDisabled = (item.disabled !== undefined ? item.disabled : (enabledMap.get(item.id) === false));
    if (isDisabled) return;

    if (item.onClick) {
      item.onClick();
      return;
    }
    switch (item.id) {
      case 'undo':
        bus.dispatch({ type: 'HISTORY_UNDO' });
        break;
      case 'redo':
        bus.dispatch({ type: 'HISTORY_REDO' });
        break;
      case 'save':
        bus.dispatch({ type: 'SAVE_WORKFLOW' });
        break;
      case 'load':
        bus.dispatch({ type: 'LOAD_WORKFLOW' });
        break;
      case 'zoom-in':
        zoomIn();
        break;
      case 'zoom-out':
        zoomOut();
        break;
      case 'fit-view':
        fitView({ padding: 0.2 });
        break;
      case 'run':
        console.log('[TopBar] 运行工作流');
        break;
      case 'toggle-minimap':
        bus.dispatch({ type: 'TOGGLE_MINIMAP' });
        break;
      case 'auto-layout':
        bus.dispatch({ type: 'AUTO_LAYOUT' });
        break;
      case 'settings':
        bus.dispatch({ type: 'PROJECT_CONFIG_TOGGLE_PANEL' });
        break;
      default:
        console.warn(`[TopBar] 未处理的按钮 id: ${item.id}`);
    }
  };

  const handleMenuClick = (item: TopBarItem) => {
    if (item.children && item.children.length > 0) {
      setOpenMenuId(openMenuId === item.id ? null : item.id);
    } else {
      handleButtonClick(item);
    }
  };

  const renderItems = (items: TopBarItem[]) =>
    items.map((item) => {
      if (isSeparator(item)) {
        return <div key={item.id} className="top-bar-separator" />;
      }
      if (item.component) {
        const CustomComp = item.component;
        return <CustomComp key={item.id} />;
      }
      const hasChildren = !!(item.children && item.children.length > 0);
      const isDisabled = (item.disabled !== undefined ? item.disabled : (enabledMap.get(item.id) === false));
      return (
        <div key={item.id} className="top-bar-item-wrapper">
          {hasChildren ? (
            <>
              <button
                ref={(el) => { if (el) buttonRefs.current.set(item.id, el); }}
                className="top-bar-btn"
                onClick={() => handleMenuClick(item)}
                disabled={!hasChildren && isDisabled}
              >
                {item.icon && <span className="top-bar-icon">{item.icon}</span>}
                {item.label && <span>{item.label}</span>}
                <span className="top-bar-arrow">▼</span>
              </button>
              {openMenuId === item.id && (
                <DropdownMenu
                  items={item.children!}
                  onClose={() => setOpenMenuId(null)}
                  anchorRef={{ current: buttonRefs.current.get(item.id) || null }}
                />
              )}
            </>
          ) : (
            <Tooltip content={item.label || ''} position="bottom" delay={500}>
              <button
                ref={(el) => { if (el) buttonRefs.current.set(item.id, el); }}
                className="top-bar-btn"
                onClick={() => handleButtonClick(item)}
                disabled={isDisabled}
              >
                {item.icon && <span className="top-bar-icon">{item.icon}</span>}
                {item.label && <span>{item.label}</span>}
              </button>
            </Tooltip>
          )}
        </div>
      );
    });

  return (
    <header className="top-bar">
      <div className="top-bar-left">{renderItems(leftItems)}</div>
      <div className="top-bar-center">{renderItems(centerItems)}</div>
      <div className="top-bar-right">{renderItems(rightItems)}</div>
    </header>
  );
};

export default TopBar;