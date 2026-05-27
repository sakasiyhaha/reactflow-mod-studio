// src/mods/mod-default-ui.tsx
// 默认 UI Mod —— 注册顶部栏、底部栏、左侧栏、右侧栏的默认组件/按钮
// 同时负责动态状态更新（节点/边数量、缩放比例、鼠标位置）
// 重构：精简顶部栏，将重复功能移至合适位置，补全所有按钮的点击回调

import React from 'react';
import type { EditorMod, EditorBus } from '../bus/types';
import {
  registerTopBarLeft,
  registerTopBarCenter,
  registerTopBarRight,
} from '../registry/topBarRegistry';
import {
  registerBottomBarLeft,
  registerBottomBarCenter,
  registerBottomBarRight,
} from '../registry/bottomBarRegistry';
import { registerSidebarComponent } from '../registry/sidebarRegistry';
import { registerPropsPanelComponent } from '../registry/propsPanelRegistry';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faFolderOpen,
  faSave,
  faUndo,
  faRedo,
  faHome,
  faPlay,
  faCog,
  faChartSimple,
  faMap,
} from '@fortawesome/free-solid-svg-icons';
import NodeLibrary from '../components/NodeLibrary';
import DefaultPropsPanelContent from '../components/DefaultPropsPanelContent';
import BrandLogo from '../components/BrandLogo';

export const modDefaultUI: EditorMod = {
  id: 'default-ui',
  init(bus: EditorBus) {
    // ============================================================
    // 顶部栏注册（精简版）
    // ============================================================
    // 左侧区域：品牌标志 + “文件”下拉菜单（精简）
    registerTopBarLeft({
      id: 'brand-logo',
      order: 0,
      component: BrandLogo,
    });
    registerTopBarLeft({
      id: 'file-menu',
      order: 10,
      label: '文件',
      children: [
        { id: 'file-new', order: 1, label: '新建', onClick: () => clearCanvas(bus) },
        { id: 'file-open', order: 2, label: '打开...', onClick: () => bus.dispatch({ type: 'LOAD_WORKFLOW' }) },
        { id: 'file-save', order: 3, label: '保存', onClick: () => bus.dispatch({ type: 'SAVE_WORKFLOW' }) },
        { id: 'file-export', order: 4, label: '导出...', onClick: () => bus.dispatch({ type: 'SAVE_WORKFLOW' }) },
        { id: 'file-import', order: 5, label: '导入...', onClick: () => bus.dispatch({ type: 'LOAD_WORKFLOW' }) },
        { id: 'file-separator', order: 6 },
        { id: 'file-about', order: 7, label: '关于', onClick: () => alert('React Flow Mod Studio v1.2.0') },
      ],
    });

    // 中间工具栏：核心操作按钮（全部绑定实际功能）
    registerTopBarCenter({
      id: 'new',
      order: 5,
      icon: <FontAwesomeIcon icon={faFile} />,
      onClick: () => clearCanvas(bus),
    });
    registerTopBarCenter({
      id: 'open',
      order: 10,
      icon: <FontAwesomeIcon icon={faFolderOpen} />,
      onClick: () => bus.dispatch({ type: 'LOAD_WORKFLOW' }),
    });
    registerTopBarCenter({
      id: 'save',
      order: 15,
      icon: <FontAwesomeIcon icon={faSave} />,
      onClick: () => bus.dispatch({ type: 'SAVE_WORKFLOW' }),
    });
    registerTopBarCenter({ id: 'separator-1', order: 20 });
    registerTopBarCenter({
      id: 'undo',
      order: 25,
      icon: <FontAwesomeIcon icon={faUndo} />,
      onClick: () => bus.dispatch({ type: 'HISTORY_UNDO' }),
      disabled: true, // 初始禁用，历史记录 Mod 会动态启用
    });
    registerTopBarCenter({
      id: 'redo',
      order: 30,
      icon: <FontAwesomeIcon icon={faRedo} />,
      onClick: () => bus.dispatch({ type: 'HISTORY_REDO' }),
      disabled: true,
    });
    registerTopBarCenter({ id: 'separator-2', order: 35 });
    registerTopBarCenter({
      id: 'auto-layout',
      order: 40,
      icon: <FontAwesomeIcon icon={faChartSimple} />,
      onClick: () => bus.dispatch({ type: 'AUTO_LAYOUT' }),
    });
    registerTopBarCenter({
      id: 'fit-view',
      order: 45,
      icon: <FontAwesomeIcon icon={faHome} />,
      onClick: () => bus.dispatch({ type: 'FIT_VIEW' }), // 需要处理 FIT_VIEW 事件
    });
    registerTopBarCenter({
      id: 'run',
      order: 50,
      icon: <FontAwesomeIcon icon={faPlay} />,
      onClick: () => console.log('[运行] 工作流执行逻辑可在此扩展'),
    });

    // 右侧区域：设置 + 小地图开关
    registerTopBarRight({
      id: 'toggle-minimap',
      order: 10,
      icon: <FontAwesomeIcon icon={faMap} />,
      onClick: () => bus.dispatch({ type: 'TOGGLE_MINIMAP' }),
    });
    registerTopBarRight({
      id: 'settings',
      order: 20,
      icon: <FontAwesomeIcon icon={faCog} />,
      label: '设置',
      onClick: () => bus.dispatch({ type: 'PROJECT_CONFIG_TOGGLE_PANEL' }),
    });

    // ============================================================
    // 底部栏注册（保持不变）
    // ============================================================
    registerBottomBarLeft({
      id: 'status-ready',
      order: 10,
      text: '● 就绪',
      updatable: false,
    });
    registerBottomBarCenter({
      id: 'node-edge-count',
      order: 10,
      text: '节点: 0 | 连接: 0',
      updatable: true,
    });
    registerBottomBarCenter({
      id: 'zoom-level',
      order: 20,
      text: '缩放: 100%',
      updatable: true,
    });
    registerBottomBarRight({
      id: 'mouse-position',
      order: 10,
      text: '坐标: (0, 0)',
      updatable: true,
    });

    // ============================================================
    // 左侧栏注册（仅保留节点库，移除按钮组）
    // ============================================================
    registerSidebarComponent({
      id: 'node-library',
      order: 0,
      component: NodeLibrary,
    });

    // ============================================================
    // 右侧栏注册（属性面板）
    // ============================================================
    registerPropsPanelComponent({
      id: 'default-props-panel',
      order: 0,
      component: DefaultPropsPanelContent,
    });

    // ============================================================
    // 动态状态更新监听
    // ============================================================
    const cleanups: (() => void)[] = [];

    const unsubCount = bus.subscribe(({ event, state }) => {
      const relevantEvents = new Set([
        'NODE_ADDED', 'NODES_ADDED', 'NODE_DELETED',
        'EDGE_ADDED', 'EDGE_DELETED', 'WORKFLOW_LOADED'
      ]);
      if (relevantEvents.has(event.type)) {
        const nodeCount = state.nodes.length;
        const edgeCount = state.edges.length;
        bus.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: 'node-edge-count', text: `节点: ${nodeCount} | 连接: ${edgeCount}` }
        });
      }
      if (event.type === 'VIEWPORT_CHANGED') {
        const zoomPercent = Math.round(event.payload.zoom * 100);
        bus.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: 'zoom-level', text: `缩放: ${zoomPercent}%` }
        });
      }
    });
    cleanups.push(unsubCount);

    const onMouseMove = (e: MouseEvent) => {
      bus.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: 'mouse-position', text: `坐标: (${e.clientX}, ${e.clientY})` }
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    cleanups.push(() => window.removeEventListener('mousemove', onMouseMove));

    // 清理函数：取消所有订阅，不涉及注册中心的清理（注册中心的数据由各 Mod 负责，但此处我们不移除已注册的 UI 项）
    return () => {
      cleanups.forEach(fn => fn());
      console.log('[mod-default-ui] 已清理动态状态监听');
    };
  },
};

// 辅助函数：清空画布（新建工作流）
function clearCanvas(bus: EditorBus) {
  if (confirm('新建工作流将清空当前所有节点和连线，确定吗？')) {
    bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: [], edges: [] });
  }
}