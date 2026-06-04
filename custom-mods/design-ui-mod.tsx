// custom-mods/design-ui-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { useEditorBusContext } from '../src/bus/EditorBusContext';
import ReactDOM from 'react-dom/client';
import React from 'react';

// ==================== 1. 隐藏原有面板 ====================
function hideOriginalPanels() {
  // 等待 DOM 渲染完成，确保元素存在
  setTimeout(() => {
    const sidebar = document.querySelector('.sidebar');
    const propsPanel = document.querySelector('.props-panel');
    if (sidebar) (sidebar as HTMLElement).style.display = 'none';
    if (propsPanel) (propsPanel as HTMLElement).style.display = 'none';
    // 可选：清除 localStorage 中的折叠状态（非必须）
    // localStorage.removeItem('editor_layout_left_collapsed');
    // localStorage.removeItem('editor_layout_right_collapsed');
  }, 100);
}

// ==================== 2. 设置主题变量（深色科技感） ====================
function setThemeVariables() {
  const root = document.documentElement;
  root.style.setProperty('--bg-canvas', '#0A0A0A');
  root.style.setProperty('--bg-sidebar', '#171717');
  root.style.setProperty('--bg-card', '#171717');
  root.style.setProperty('--border', '#2A2A2A');
  root.style.setProperty('--text-primary', '#FFFFFF');
  root.style.setProperty('--text-secondary', '#A3A3A3');
  root.style.setProperty('--node-border-radius', '12px');
  root.style.setProperty('--primary', '#8B5CF6'); // 紫色主题

  // 修改画布网格为径向点阵
  const style = document.createElement('style');
  style.textContent = `
    .react-flow__background {
      background-image: radial-gradient(circle, #1F1F1F 2px, transparent 2px) !important;
      background-size: 40px 40px !important;
    }
    /* 调整节点卡片样式 */
    .custom-node {
      backdrop-filter: blur(4px);
      background: rgba(23, 23, 23, 0.95);
      border: 1px solid #3A3A3A;
    }
    .react-flow__node.selected .custom-node {
      border-color: #8B5CF6 !important;
      box-shadow: 0 0 0 2px #8B5CF6, 0 4px 12px rgba(0,0,0,0.3) !important;
    }
  `;
  document.head.appendChild(style);
}

// ==================== 3. 自定义顶部栏 ====================
const TopBarComponent: React.FC = () => {
  const bus = useEditorBusContext();
  return (
    <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center hover:bg-gray-800 transition-colors">
          <i className="fa fa-angle-left text-sm"></i>
        </button>
        <div className="px-4 py-2 rounded-xl bg-[#171717] shadow-lg">
          <span className="text-sm font-medium">未命名项目</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center hover:bg-gray-800 transition-colors">
          <i className="fa fa-search text-sm"></i>
        </button>
        <div className="px-4 py-2 rounded-xl bg-[#171717] shadow-lg flex items-center gap-2">
          <i className="fa fa-bolt text-purple-400 text-sm"></i>
          <span className="text-sm font-bold">830</span>
        </div>
        <div className="px-4 py-2 rounded-xl bg-[#171717] shadow-lg flex items-center gap-2">
          <i className="fa fa-gem text-yellow-400 text-sm"></i>
          <span className="text-sm">会员特惠4.3折</span>
        </div>
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <i className="fa fa-user text-sm"></i>
        </button>
      </div>
    </header>
  );
};

// ==================== 4. 自定义底部控制栏（圆形胶囊） ====================
const BottomBarComponent: React.FC = () => {
  const [zoom, setZoom] = React.useState(100);
  const bus = useEditorBusContext();

  React.useEffect(() => {
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'VIEWPORT_CHANGED') {
        setZoom(Math.round(event.payload.zoom * 100));
      }
    });
    return unsub;
  }, [bus]);

  const handleZoomIn = () => {
    // 派发一个自定义事件或者直接操作 React Flow 实例比较困难，这里简单派发 FIT_VIEW 作为演示
    // 实际缩放可通过 bus 和 FlowCanvas 配合实现，但需要额外工作。为保持简单，这里只展示 UI 结构
    bus.dispatch({ type: 'FIT_VIEW' });
  };
  const handleZoomOut = () => {
    // 类似，可以派发自定义缩放事件，但为了演示，留空或调用 fitView
    bus.dispatch({ type: 'FIT_VIEW' });
  };
  const handleUndo = () => bus.dispatch({ type: 'HISTORY_UNDO' });
  const handleRedo = () => bus.dispatch({ type: 'HISTORY_REDO' });
  const handleFitView = () => bus.dispatch({ type: 'FIT_VIEW' });

  return (
    <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-[#171717] rounded-full shadow-lg px-4 py-2 flex items-center gap-4">
        <div className="flex gap-1">
          <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
            <i className="fa fa-mouse-pointer text-sm"></i>
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800">
            <i className="fa fa-hand-paper-o text-sm"></i>
          </button>
        </div>
        <div className="h-6 w-px bg-gray-700"></div>
        <div className="flex items-center gap-3">
          <button onClick={handleZoomOut} className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
            <i className="fa fa-minus text-xs"></i>
          </button>
          <span className="text-sm font-medium w-10 text-center">{zoom}%</span>
          <button onClick={handleZoomIn} className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
            <i className="fa fa-plus text-xs"></i>
          </button>
        </div>
        <div className="h-6 w-px bg-gray-700"></div>
        <button onClick={handleFitView} className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
          <i className="fa fa-expand text-xs"></i>
        </button>
        <div className="h-6 w-px bg-gray-700"></div>
        <button className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
          <i className="fa fa-eye text-xs"></i>
        </button>
        <div className="h-6 w-px bg-gray-700"></div>
        <div className="flex gap-1">
          <button onClick={handleUndo} className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
            <i className="fa fa-undo text-xs"></i>
          </button>
          <button onClick={handleRedo} className="w-6 h-6 flex items-center justify-center hover:text-gray-400">
            <i className="fa fa-repeat text-xs"></i>
          </button>
        </div>
      </div>
    </footer>
  );
};

// ==================== 5. 浮动左侧工具栏 ====================
const FloatingToolbar: React.FC = () => {
  const bus = useEditorBusContext();
  // 示例按钮点击事件，可以根据需要派发对应事件
  const handleAddNode = () => {
    // 触发添加节点（例如打开浮动搜索）
    bus.dispatch({ type: 'FLOATING_SEARCH_OPEN', payload: { x: window.innerWidth / 2, y: window.innerHeight / 2 } });
  };
  return (
    <aside className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
      <div className="bg-[#171717] rounded-xl shadow-lg p-2 flex flex-col gap-2">
        <button onClick={handleAddNode} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800">
          <i className="fa fa-cubes text-lg"></i>
        </button>
        <button className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
          <i className="fa fa-play-circle text-lg"></i>
        </button>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800">
          <i className="fa fa-clock-o text-lg"></i>
        </button>
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800">
          <i className="fa fa-scissors text-lg"></i>
        </button>
      </div>
    </aside>
  );
};

// ==================== 6. 覆盖 default-ui Mod ====================
export const designUiMod: EditorMod = {
  id: 'default-ui',
  init(bus: EditorBus) {
    console.log('[design-ui] 正在应用设计稿 UI...');
    // 隐藏原有侧边栏和属性面板
    hideOriginalPanels();
    // 设置主题变量
    setThemeVariables();

    // 注入自定义顶部栏（通过 Portal 直接添加到 body）
    const topBarContainer = document.createElement('div');
    topBarContainer.id = 'custom-topbar-root';
    document.body.appendChild(topBarContainer);
    const topBarRoot = ReactDOM.createRoot(topBarContainer);
    topBarRoot.render(React.createElement(TopBarComponent));

    // 注入自定义底部栏
    const bottomBarContainer = document.createElement('div');
    bottomBarContainer.id = 'custom-bottom-root';
    document.body.appendChild(bottomBarContainer);
    const bottomBarRoot = ReactDOM.createRoot(bottomBarContainer);
    bottomBarRoot.render(React.createElement(BottomBarComponent));

    // 注入浮动左侧工具栏
    const toolbarContainer = document.createElement('div');
    toolbarContainer.id = 'floating-toolbar-root';
    document.body.appendChild(toolbarContainer);
    const toolbarRoot = ReactDOM.createRoot(toolbarContainer);
    toolbarRoot.render(React.createElement(FloatingToolbar));

    // 返回清理函数，卸载 Mod 时移除所有注入的 DOM 节点
    return () => {
      topBarRoot.unmount();
      topBarContainer.remove();
      bottomBarRoot.unmount();
      bottomBarContainer.remove();
      toolbarRoot.unmount();
      toolbarContainer.remove();
      // 恢复被隐藏的面板显示
      const sidebar = document.querySelector('.sidebar');
      const propsPanel = document.querySelector('.props-panel');
      if (sidebar) (sidebar as HTMLElement).style.display = '';
      if (propsPanel) (propsPanel as HTMLElement).style.display = '';
      console.log('[design-ui] UI 已恢复');
    };
  },
};