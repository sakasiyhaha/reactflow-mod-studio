// src/components/Sidebar.tsx
// 左侧边栏组件 —— 包含节点库、功能按钮（内置 + 动态注册）

import CollapseButton from './CollapseButton';
import NodeLibrary from './NodeLibrary';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getSidebarButtons } from '../registry/sidebarRegistry';
import { useState, useEffect } from 'react';

interface SidebarProps {
    collapsed: boolean;       // 是否折叠
    onToggle: () => void;     // 切换折叠状态
    addNode: (type: string) => void;          // 添加节点回调
    onSaveWorkflow: () => void;               // 保存工作流
    onLoadWorkflow: () => void;               // 加载工作流
    onAutoLayout: () => void;                 // 自动布局
    onToggleMinimap: () => void;              // 切换小地图
    showMinimap: boolean;                     // 小地图是否可见
}

export default function Sidebar({
    collapsed, onToggle, addNode,
    onSaveWorkflow,
    onLoadWorkflow,
    onAutoLayout,
    onToggleMinimap,
    showMinimap,
}: SidebarProps) {
    const bus = useEditorBusContext();
    const [, forceUpdate] = useState(0); // 用于刷新动态按钮列表

    // 监听按钮注册变化（简单重新渲染）
    useEffect(() => {
        // 由于注册中心是同步的，可以在每次渲染时重新获取按钮列表
        // 但为了响应动态注册，我们可以在 window 上挂一个事件，简单起见这里每次渲染都重新获取即可
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const customButtons = getSidebarButtons();

    return (
        <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
            {/* 折叠按钮 */}
            <CollapseButton side="left" collapsed={collapsed} onClick={onToggle} />

            {/* 节点库（支持搜索、拖拽、点击添加） */}
            <NodeLibrary onAddNode={addNode} collapsed={collapsed} />

            {/* 功能按钮区域（仅在展开时显示） */}
            {!collapsed && (
                <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* 内置按钮 */}
                    <button className="sidebar-action-btn" onClick={onAutoLayout}>
                        🔄 自动布局
                    </button>
                    <button
                        className="sidebar-action-btn"
                        onClick={onToggleMinimap}
                        style={{
                            background: showMinimap ? 'var(--primary)' : 'transparent',
                            color: showMinimap ? '#fff' : 'var(--text-primary)',
                        }}
                    >
                        🗺️ 小地图 {showMinimap ? 'ON' : 'OFF'}
                    </button>
                    <button className="sidebar-action-btn" onClick={onSaveWorkflow}>
                        💾 保存工作流
                    </button>
                    <button className="sidebar-action-btn" onClick={onLoadWorkflow}>
                        📂 加载工作流
                    </button>

                    {/* 动态注册的按钮 */}
                    {customButtons.map(btn => (
                        <button
                            key={btn.id}
                            className="sidebar-action-btn"
                            onClick={() => btn.onClick(bus)}
                        >
                            {btn.icon ? `${btn.icon} ` : ''}{btn.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 项目设置按钮（永远在最底部） */}
            <div className="sidebar-footer">
                {!collapsed ? (
                    <button
                        className="sidebar-action-btn"
                        onClick={() => bus.dispatch({ type: 'PROJECT_CONFIG_TOGGLE_PANEL' })}
                        style={{ marginBottom: 8 }}
                    >
                        ⚙️ 项目设置
                    </button>
                ) : (
                    <div
                        onClick={() => bus.dispatch({ type: 'PROJECT_CONFIG_TOGGLE_PANEL' })}
                        style={{
                            writingMode: 'vertical-rl', textOrientation: 'mixed',
                            padding: '12px 0',
                            color: 'var(--text-secondary)',
                            fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
                        }}
                    >
                        ⚙️
                    </div>
                )}
            </div>
        </div>
    );
}