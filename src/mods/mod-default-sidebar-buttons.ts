// src/mods/mod-default-sidebar-buttons.ts
import type { EditorMod, EditorBus } from '../bus/types';
import { registerSidebarButton } from '../registry/sidebarRegistry';

export const modDefaultSidebarButtons: EditorMod = {
  id: 'default-sidebar-buttons',
  init(bus: EditorBus) {
    // 自动布局按钮
    registerSidebarButton({
      id: 'auto-layout',
      label: '🔄 自动布局',
      onClick: (b) => {
        b.dispatch({ type: 'AUTO_LAYOUT' });
      },
      order: 10,
    });
    // 小地图开关按钮
    registerSidebarButton({
      id: 'toggle-minimap',
      label: '🗺️ 小地图',
      onClick: (b) => {
        // 需要获取当前小地图状态并取反。由于状态在 App.tsx 中，可以通过事件或直接修改 store。
        // 简单做法：派发自定义事件，让 App.tsx 监听切换。
        // 但为了保持按钮独立，我们可以派发 TOGGLE_MINIMAP 事件，并在 App.tsx 中处理。
        // 当前项目中已有 showMinimap 状态和 toggleMinimap 函数，但无法从 bus 直接获取。
        // 替代方案：在注册时传入一个函数，该函数通过 bus 派发事件，App.tsx 监听事件来切换。
        b.dispatch({ type: 'TOGGLE_MINIMAP' });
      },
      order: 20,
    });
    // 保存工作流按钮
    registerSidebarButton({
      id: 'save-workflow',
      label: '💾 保存工作流',
      onClick: (b) => {
        // 保存工作流逻辑原先在 App.tsx 中调用 exportWorkflowData。可以通过事件或直接调用。
        // 为了不耦合，派发 SAVE_WORKFLOW 事件，让 App.tsx 监听。
        b.dispatch({ type: 'SAVE_WORKFLOW' });
      },
      order: 30,
    });
    // 加载工作流按钮
    registerSidebarButton({
      id: 'load-workflow',
      label: '📂 加载工作流',
      onClick: (b) => {
        b.dispatch({ type: 'LOAD_WORKFLOW' });
      },
      order: 40,
    });
    console.log('[mod-default-sidebar-buttons] 已注册默认侧边栏按钮');
    return () => {};
  },
};