// custom-mods/export-svg-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { registerPaneMenuItem } from '../src/registry/contextMenuRegistry';
import { useReactFlow } from '@xyflow/react';

// 注意：由于菜单项 action 中无法直接使用 React hook，我们需要通过 bus 传递一个函数，
// 但更简单的方式：在 action 中动态获取 dom 元素并调用 react-flow 的导出方法。
// 由于无法在纯函数中调用 useReactFlow，我们利用全局 react-flow 实例（通过 window 存储）。
// 实际上，更好的做法是在 App.tsx 中暴露 getReactFlowInstance，但为了教程简单，我们通过事件触发导出。

export const exportSvgMod: EditorMod = {
    id: 'export-svg',
    init(bus: EditorBus) {
        // 注册画布右键菜单项
        const unregister = registerPaneMenuItem({
            id: 'export-svg',
            label: '📸 导出为 SVG',
            icon: '🖼️',
            action: () => {
                // 触发自定义事件，由 App.tsx 监听并执行导出
                bus.dispatch({
                    type: 'EXPORT_SVG' as any,
                    payload: {}
                });
            },
            order: 10,
        });

        // 监听导出事件（实际导出逻辑可能需要访问 react-flow 实例）
        // 因为该 Mod 无法直接获取 ReactFlow 实例，我们需要另一种方式：
        // 方案：在 App.tsx 中监听这个自定义事件，调用 useReactFlow 的 toImage 方法。
        // 但为了教程完整性，我们只演示注册菜单项，实际导出需在 App.tsx 中补充。
        console.log('[export-svg] 画布右键菜单已添加“导出为 SVG”，需在 App.tsx 中实现导出逻辑');

        return unregister;
    }
};