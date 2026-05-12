// src/hooks/useLayout.ts
// 布局状态 Hook —— 管理左右两栏的折叠/展开

import { useState } from 'react';

interface LayoutState {
  leftCollapsed: boolean;    // 左侧节点库是否折叠
  rightCollapsed: boolean;   // 右侧属性面板是否折叠
}

interface LayoutActions {
  toggleLeft: () => void;    // 切换左侧折叠
  toggleRight: () => void;   // 切换右侧折叠
}

/** 返回布局状态和切换函数 */
export function useLayout(): LayoutState & LayoutActions {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const toggleLeft = () => setLeftCollapsed(prev => !prev);
  const toggleRight = () => setRightCollapsed(prev => !prev);

  return {
    leftCollapsed,
    rightCollapsed,
    toggleLeft,
    toggleRight,
  };
}