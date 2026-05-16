// src/components/Sidebar.tsx
// 左侧边栏组件 —— 包含节点库、功能按钮（自动布局、小地图、保存/加载、项目设置）
// 项目设置按钮现在通过总线事件驱动，不再依赖 onToggleConfig / configPanelVisible props
// 这消除了 Sidebar 对"项目设置"这个具体功能的直接依赖

import CollapseButton from './CollapseButton';
import NodeLibrary from './NodeLibrary';
import { useEditorBusContext } from '../bus/EditorBusContext'; // 获取总线实例

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
    // 获取总线实例，用于派发项目设置面板切换事件
    // Sidebar 不需要知道"谁来处理这个事件"，只需要表达"用户点击了设置按钮"
    const bus = useEditorBusContext();

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

            {/* 
                项目设置按钮
                - 展开状态：显示完整按钮
                - 折叠状态：仅显示图标
                - 点击时派发 PROJECT_CONFIG_TOGGLE_PANEL 事件
                - 面板的显示/隐藏由 App.tsx 监听同一事件来处理
                - Sidebar 不再需要知道"面板当前是否打开"（configPanelVisible）
            */}
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