// src/components/Sidebar.tsx
// 左侧边栏组件 —— 包含节点库、功能按钮（自动布局、小地图、保存/加载、项目设置）

import CollapseButton from './CollapseButton';
import NodeLibrary from './NodeLibrary';

interface SidebarProps {
    collapsed: boolean;       // 是否折叠
    onToggle: () => void;     // 切换折叠状态
    addNode: (type: string) => void;          // 添加节点回调
    onToggleConfig: () => void;               // 切换项目设置面板
    configPanelVisible: boolean;              // 项目设置面板是否可见
    onSaveWorkflow: () => void;               // 保存工作流
    onLoadWorkflow: () => void;               // 加载工作流
    onAutoLayout: () => void;                 // 自动布局
    onToggleMinimap: () => void;              // 切换小地图
    showMinimap: boolean;                     // 小地图是否可见
}

export default function Sidebar({
    collapsed, onToggle, addNode,
    onToggleConfig, configPanelVisible,
    onSaveWorkflow,
    onLoadWorkflow,
    onAutoLayout,
    onToggleMinimap,
    showMinimap,
}: SidebarProps) {
    return (
        <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
            {/* 折叠按钮 */}
            <CollapseButton side="left" collapsed={collapsed} onClick={onToggle} />

            {/* 节点库（支持搜索、拖拽、点击添加） */}
            <NodeLibrary onAddNode={addNode} collapsed={collapsed} />

            {/* 功能按钮区域（仅在展开时显示） */}
            {!collapsed && (
                <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                </div>
            )}

            {/* 项目设置按钮（折叠和展开显示方式不同） */}
            <div className="sidebar-footer">
                {!collapsed ? (
                    <button
                        className="sidebar-action-btn"
                        onClick={onToggleConfig}
                        style={{
                            marginBottom: 8,
                            background: configPanelVisible ? 'var(--primary)' : 'transparent',
                            color: configPanelVisible ? '#fff' : 'var(--text-primary)',
                        }}
                    >
                        ⚙️ 项目设置
                    </button>
                ) : (
                    // 折叠状态下仅显示一个图标
                    <div
                        onClick={onToggleConfig}
                        style={{
                            writingMode: 'vertical-rl', textOrientation: 'mixed',
                            padding: '12px 0',
                            color: configPanelVisible ? 'var(--primary)' : 'var(--text-secondary)',
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