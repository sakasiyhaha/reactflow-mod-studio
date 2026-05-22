// src/components/Sidebar.tsx
// 左侧边栏组件 —— 包含节点库、功能按钮（全部由注册中心动态渲染）

import CollapseButton from './CollapseButton';
import NodeLibrary from './NodeLibrary';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getSidebarButtons } from '../registry/sidebarRegistry';
import { useState, useEffect } from 'react';

interface SidebarProps {
    collapsed: boolean;       // 是否折叠
    onToggle: () => void;     // 切换折叠状态
    addNode: (type: string) => void;          // 添加节点回调
}

export default function Sidebar({
    collapsed, onToggle, addNode,
}: SidebarProps) {
    const bus = useEditorBusContext();
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const customButtons = getSidebarButtons();

    return (
        <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
            <CollapseButton side="left" collapsed={collapsed} onClick={onToggle} />
            <NodeLibrary onAddNode={addNode} collapsed={collapsed} />
            {!collapsed && (
                <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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