// src/App.tsx
// 应用根组件 —— 组装编辑器所有部分（侧边栏、画布、面板、菜单、搜索）
// 负责初始化事件总线、注册内置/自定义 Mod、创建各种回调函数并传给子组件
// 所有状态变更最终通过 bus.dispatch(event) 驱动，UI 只消费 state 并生成事件

import { customMods } from '../custom-mods/index';          // 用户自定义 Mod 列表
import { useState, useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Connection, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import Sidebar from './components/Sidebar';                 // 左侧节点库
import FlowCanvas from './components/FlowCanvas';           // 中央画布
import PropsPanel from './components/PropsPanel';           // 右侧属性面板
import ProjectConfigPanel from './components/ProjectConfigPanel'; // 项目设置面板
import ContextMenu from './components/ContextMenu';         // 节点右键菜单
import PaneContextMenu from './components/PaneContextMenu'; // 画布右键菜单（添加节点）
import ConnectionNodeMenu from './components/ConnectionNodeMenu'; // 连线结束时的节点选择菜单
import FloatingSearch from './components/FloatingSearch';   // 画布双击搜索框
import { useEditorBus } from './bus/useEditorBus';           // 事件总线 Hook
import { EditorBusProvider } from './bus/EditorBusContext';  // 总线 Context 提供者
import { initMods } from './mods/index';                     // Mod 初始化函数
import { useLayout } from './hooks/useLayout';               // 布局折叠状态
import { useWorkflowIO } from './hooks/useWorkflowIO';       // 导入导出
import { useConnectionEndHandler } from './hooks/useConnectionEndHandler'; // 连接结束处理
import { getNodeTypeMap } from '../config/editorConfig';     // 动态节点类型映射
import { validateReconnectConnection } from './mods/mod-reconnect'; // 连接校验函数
import { nodeLifecycleAdapters } from './adapters/nodeLifecycleAdapters'; // 回调适配器
import { getAllTemplates } from './registry/nodeTemplateRegistry';  // 动态获取模板
import { createNode } from './utils/nodeFactory';           // 节点工厂函数
import './App.css';
import { DEBUG } from '../config/debug';
import type { CustomNode } from './utils/types';

function AppInner() {
    const instance = useReactFlow();                         // React Flow 实例，用于坐标转换等
    const { state, bus } = useEditorBus();                   // 获取总线状态和操作方法
    const layout = useLayout();                             // 左右面板折叠状态

    // 注册所有 Mod（内置 + 用户自定义），组件卸载时自动清理
    useEffect(() => {
        const cleanup = initMods(bus, customMods);
        return cleanup;
    }, [bus]);

    // ==================== 本地 UI 状态（仅影响 UI 显示，与工作流无关） ====================
    const [configPanelVisible, setConfigPanelVisible] = useState(false); // 是否显示项目设置面板
    const [floatingSearch, setFloatingSearch] = useState<{ x: number; y: number } | null>(null); // 浮动搜索框位置
    const [showMinimap, setShowMinimap] = useState(false);   // 是否显示小地图
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null); // 右键菜单
    const [paneMenu, setPaneMenu] = useState<{ x: number; y: number } | null>(null); // 画布右键菜单
    const [connectionMenu, setConnectionMenu] = useState<any>(null); // 连线结束时的候选节点菜单

    // 从选中列表找到第一个节点（供属性面板使用）
    const selectedNode = state.nodes.find(n => n.id === state.selection[0]) ?? null;

    // 处理后的节点数组：为每个节点添加 draggable 属性（锁定节点不可拖拽）
    const processedNodes = useMemo(() =>
        state.nodes.map(n => ({ ...n, draggable: !n.data.locked })),
        [state.nodes]
    );

    // 动态获取节点类型映射（支持运行时添加的自定义模板）
    const nodeTypeMap = getNodeTypeMap();

    // ==================== 节点添加相关的回调 ====================

    /** 从侧边栏点击添加节点（放置到画布中心） */
    const handleAddNodeFromClick = useCallback((type: string) => {
        const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const pos = instance.screenToFlowPosition(center);
        const newNode = createNode(type, pos);    // 工厂函数生成节点
        bus.dispatch({ type: 'NODE_ADDED', node: newNode });
    }, [bus, instance]);

    /** 画布右键菜单打开 */
    const handlePaneContext = useCallback((event: any) => {
        event.preventDefault();
        setPaneMenu({ x: event.clientX, y: event.clientY });
        if (DEBUG) console.log('[App] 画布右键打开菜单');
    }, []);

    const toggleConfigPanel = useCallback(() => setConfigPanelVisible(prev => !prev), []);

    /** 画布双击弹出浮动搜索框（仅当双击在真实画布空白区域） */
    const handlePaneDoubleClick = useCallback((event: any) => {
        if (event.target.classList.contains('react-flow__pane')) {
            setFloatingSearch({ x: event.clientX, y: event.clientY });
        }
    }, []);

    // ==================== 导入导出（使用自定义 Hook） ====================
    const { handleSaveWorkflow, handleLoadWorkflow } = useWorkflowIO(
        state.nodes, state.edges,
        (newNodes, newEdges) => bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: newNodes, edges: newEdges })
    );

    /** 自动布局 */
    const handleAutoLayout = useCallback(() => {
        bus.dispatch({ type: 'AUTO_LAYOUT' });
    }, [bus]);

    const toggleMinimap = useCallback(() => setShowMinimap(prev => !prev), []);

    // ==================== 右侧面板内容 ====================
    const rightPanel = configPanelVisible ? (
        <ProjectConfigPanel />
    ) : (
        <PropsPanel
            collapsed={layout.rightCollapsed}
            onToggle={layout.toggleRight}
            selectedNode={selectedNode}
            updateNodeData={(id, data) => bus.dispatch({ type: 'NODE_DATA_CHANGED', nodeId: id, data })}
        />
    );

    // ==================== 拖拽开始（锁定节点不允许拖拽） ====================
    const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: CustomNode) => {
        if (node.data.locked) return; // 锁定节点直接忽略拖拽
    }, []);

    // ==================== 连接校验 ====================
    const isValidConnection = useCallback((connection: Connection) => {
        return validateReconnectConnection(connection, state.edges, state.nodes);
    }, [state.edges, state.nodes]);

    // ==================== 节点右键菜单逻辑 ====================
    const handleNodeContextMenu = useCallback((event: any, node: CustomNode | null) => {
        event.preventDefault();
        if (node) {
            // 右键在单个节点上
            setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
        } else if (state.selection.length > 1) {
            // 多选状态下右键空白 → 仍打开多选菜单
            setContextMenu({ x: event.clientX, y: event.clientY, nodeId: null });
        } else {
            // 单选或无选状态下右键空白 → 打开添加节点菜单
            setPaneMenu({ x: event.clientX, y: event.clientY });
        }
    }, [state.selection]);

    // ==================== React Flow 回调适配器 ====================
    const onNodesChange: OnNodesChange = useCallback(
        (changes) => nodeLifecycleAdapters.createOnNodesChange(bus)(changes),
        [bus]
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => nodeLifecycleAdapters.createOnEdgesChange(bus)(changes),
        [bus]
    );
    const onConnect: OnConnect = useCallback(
        (connection) => nodeLifecycleAdapters.createOnConnect(bus)(connection),
        [bus]
    );

    // 连接结束（弹出候选节点菜单） —— 使用专用 Hook
    const { onConnectEnd } = useConnectionEndHandler(setConnectionMenu);

    // ==================== 重连处理 ====================
    const handleReconnectStart = useCallback((_event: React.MouseEvent, edge: Edge, handleType: 'source' | 'target') => {
        bus.dispatch({ type: 'RECONNECT_START', edgeId: edge.id, handleType });
    }, [bus]);

    const handleReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, _edge: Edge, _handleType: 'source' | 'target') => {
        bus.dispatch({ type: 'RECONNECT_END' });
    }, [bus]);

    const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
        nodeLifecycleAdapters.createOnReconnect(bus)(oldEdge, newConnection);
    }, [bus]);

    // ==================== 菜单关闭回调 ====================
    const closeContextMenu = useCallback(() => setContextMenu(null), []);
    const closePaneMenu = useCallback(() => setPaneMenu(null), []);
    const closeConnectionMenu = useCallback(() => setConnectionMenu(null), []);

    // ==================== 渲染 ====================
    return (
        <EditorBusProvider value={bus}>
            <div className={`app-container ${state.mode === 'batch-connect' ? 'batch-connect-active' : ''}`}>
                {/* 左侧节点库 */}
                <Sidebar
                    collapsed={layout.leftCollapsed}
                    onToggle={layout.toggleLeft}
                    addNode={handleAddNodeFromClick}
                    onToggleConfig={toggleConfigPanel}
                    configPanelVisible={configPanelVisible}
                    onSaveWorkflow={handleSaveWorkflow}
                    onLoadWorkflow={handleLoadWorkflow}
                    onAutoLayout={handleAutoLayout}
                    onToggleMinimap={toggleMinimap}
                    showMinimap={showMinimap}
                />
                {/* 中央画布 */}
                <FlowCanvas
                    nodeTypes={nodeTypeMap}
                    nodes={processedNodes}
                    edges={state.edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onConnectEnd={onConnectEnd}
                    onNodeClick={(_, node) => bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: [node.id] })}
                    onPaneClick={() => bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: [] })}
                    onNodeContextMenu={handleNodeContextMenu}
                    onNodeDragStart={handleNodeDragStart}
                    isValidConnection={isValidConnection}
                    onReconnectStart={handleReconnectStart}
                    onReconnect={onReconnect}
                    onReconnectEnd={handleReconnectEnd}
                    onPaneContextMenu={handlePaneContext}
                    onPaneDoubleClick={handlePaneDoubleClick}
                    showMinimap={showMinimap}
                    mode={state.mode}
                    batchConnectState={state.mode === 'batch-connect' ? { sourceNodeIds: state.selection, sourceHandleType: '' } : null}
                    executeBatchConnect={(targetId, targetHandle) => bus.dispatch({ type: 'BATCH_CONNECT_EXECUTE', targetNodeId: targetId, targetHandleId: targetHandle })}
                    cancelBatchConnect={() => bus.dispatch({ type: 'BATCH_CONNECT_CANCEL' })}
                />
                {rightPanel}

                {/* 节点右键菜单 */}
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        nodeId={contextMenu.nodeId}
                        onClose={closeContextMenu}
                        onToggleLibrary={layout.toggleLeft}
                        leftCollapsed={layout.leftCollapsed}
                    />
                )}

                {/* 画布右键菜单（添加节点） */}
                {paneMenu && (
                    <PaneContextMenu
                        x={paneMenu.x}
                        y={paneMenu.y}
                        onClose={closePaneMenu}
                        addNode={(type) => {
                            const pos = instance.screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
                            const newNode = createNode(type, { x: pos.x - 80, y: pos.y - 20 });
                            bus.dispatch({ type: 'NODE_ADDED', node: newNode });
                            closePaneMenu();
                        }}
                    />
                )}

                {/* 连线结束后的候选节点菜单（正向和反向） */}
                {connectionMenu && (
                    <ConnectionNodeMenu
                        x={connectionMenu.x}
                        y={connectionMenu.y}
                        availableTypes={connectionMenu.availableTypes}
                        sourceNodeId={connectionMenu.sourceNodeId}
                        sourceHandleId={connectionMenu.sourceHandleId}
                        onClose={closeConnectionMenu}
                        direction={connectionMenu.direction}
                        addNodeAndConnect={(type, pos, srcId, srcHandle) => {
                            const newNode = createNode(type, pos);
                            bus.dispatch({ type: 'NODE_ADDED', node: newNode });
                            const targetTemplate = getAllTemplates().find(t => t.type === type);
                            if (targetTemplate?.inputs?.[0]) {
                                bus.dispatch({
                                    type: 'EDGE_ADDED',
                                    edge: {
                                        source: srcId,
                                        sourceHandle: srcHandle,
                                        target: newNode.id,
                                        targetHandle: targetTemplate.inputs[0].id,
                                        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                    },
                                });
                            }
                            closeConnectionMenu();
                        }}
                        addNodeAndConnectReverse={(type, pos, targetId, targetHandle) => {
                            const newNode = createNode(type, pos);
                            bus.dispatch({ type: 'NODE_ADDED', node: newNode });
                            const sourceTemplate = getAllTemplates().find(t => t.type === type);
                            if (sourceTemplate?.outputs?.[0]) {
                                bus.dispatch({
                                    type: 'EDGE_ADDED',
                                    edge: {
                                        source: newNode.id,
                                        sourceHandle: sourceTemplate.outputs[0].id,
                                        target: targetId,
                                        targetHandle: targetHandle,
                                        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                    },
                                });
                            }
                            closeConnectionMenu();
                        }}
                    />
                )}

                {/* 画布双击浮动搜索框 */}
                {floatingSearch && (
                    <FloatingSearch
                        x={floatingSearch.x}
                        y={floatingSearch.y}
                        onClose={() => setFloatingSearch(null)}
                        addNode={(type: string) => {
                            const pos = instance.screenToFlowPosition({ x: floatingSearch.x, y: floatingSearch.y });
                            const newNode = createNode(type, { x: pos.x - 80, y: pos.y - 20 });
                            bus.dispatch({ type: 'NODE_ADDED', node: newNode });
                            setFloatingSearch(null);
                        }}
                    />
                )}
            </div>
        </EditorBusProvider>
    );
}

export default function App() {
    return (
        <ReactFlowProvider>
            <AppInner />
        </ReactFlowProvider>
    );
}