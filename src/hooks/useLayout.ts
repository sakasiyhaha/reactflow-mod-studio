// src/hooks/useLayout.ts
// 布局状态 Hook —— 管理左右两栏的折叠/展开，并持久化到 localStorage
// 不再依赖事件总线，避免循环依赖

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_LEFT = 'editor_layout_left_collapsed';
const STORAGE_KEY_RIGHT = 'editor_layout_right_collapsed';

interface LayoutState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}

interface LayoutActions {
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
}

export function useLayout(): LayoutState & LayoutActions {
  // 从 localStorage 读取初始状态
  const getInitialLeft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEFT);
      return saved === 'true';
    } catch {
      return false;
    }
  };
  const getInitialRight = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RIGHT);
      return saved === 'true';
    } catch {
      return false;
    }
  };

  const [leftCollapsed, setLeftCollapsedState] = useState(getInitialLeft);
  const [rightCollapsed, setRightCollapsedState] = useState(getInitialRight);

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEFT, String(leftCollapsed));
  }, [leftCollapsed]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RIGHT, String(rightCollapsed));
  }, [rightCollapsed]);

  const toggleLeft = useCallback(() => setLeftCollapsedState(prev => !prev), []);
  const toggleRight = useCallback(() => setRightCollapsedState(prev => !prev), []);
  const setLeftCollapsed = useCallback((collapsed: boolean) => setLeftCollapsedState(collapsed), []);
  const setRightCollapsed = useCallback((collapsed: boolean) => setRightCollapsedState(collapsed), []);

  return {
    leftCollapsed,
    rightCollapsed,
    toggleLeft,
    toggleRight,
    setLeftCollapsed,
    setRightCollapsed,
  };
}