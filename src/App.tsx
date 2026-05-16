// src/App.tsx
// 应用根组件 —— 组装编辑器所有部分（侧边栏、画布、面板、菜单、搜索）
// 工作流导入导出现在使用 mod-workflow-io
// 错误提示使用 Toast 组件

import { customMods } from '../custom-mods/index';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Connection, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import PropsPanel from './components/PropsPanel';
import ProjectConfigPanel from './components/ProjectConfigPanel';
import ContextMenu from './components/ContextMenu';
import PaneContextMenu from './components/PaneContextMenu';
import ConnectionNodeMenu from './components/ConnectionNodeMenu';
import FloatingSearch from './components/FloatingSearch';
import ToastContainer, { type ToastMessage } from './components/Toast'; // 新增
import { useEditorBus } from './bus/useEditorBus';
import { EditorBusProvider } from './bus/EditorBusContext';
import { initMods } from './mods/index';
import { useLayout } from './hooks/useLayout';
import { getNodeTypeMap } from '../config/editorConfig';
import { validateReconnectConnection } from './mods/mod-reconnect';
import { createOnNodesChange, createOnEdgesChange, createOnConnect, createOnReconnect } from './mods/mod-node-lifecycle';
import { createConnectionEndHandler } from './mods/mod-connection-menu';
import { openSearch, closeSearch } from './mods/mod-floating-search';
import { exportWorkflowData, importWorkflowData } from './mods/mod-workflow-io';
import { getAllTemplates } from './registry/nodeTemplateRegistry';
import { createNode } from './utils/nodeFactory';
import './App.css';
import { DEBUG } from '../config/debug';
import type { CustomNode } from './utils/types';

function AppInner() {
    const instance = useReactFlow();
    const { state, bus } = useEditorBus();
    const layout = useLayout();

    // 注册所有 Mod（内置 + 用户自定义）
    useEffect(() => {
        const cleanup = initMods(bus, customMods);
        return cleanup;
    }, [bus]);

    // 本地 UI 状态
    const [configPanelVisible, setConfigPanelVisible] = useState(false);
    const [floatingSearch, setFloatingSearch] = useState<{ x: number; y: number } | null>(null);
    const [showMinimap, setShowMinimap] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
    const [paneMenu, setPaneMenu] = useState<{ x: number; y: number } | null>(null);
    const [connectionMenu, setConnectionMenu] = useState<any>(null);
    const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]); // 新增：Toast 消息列表

    // 项目设置面板事件驱动
    useEffect(() => {
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'PROJECT_CONFIG_TOGGLE_PANEL') {
                setConfigPanelVisible(prev => !prev);
            }
        });
        return unsub;
    }, [bus]);

    // 监听连接菜单事件
    useEffect(() => {
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'CONNECTION_MENU_OPEN') {
                setConnectionMenu(event.payload);
            } else if (event.type === 'CONNECTION_MENU_CLOSE') {
                setConnectionMenu(null);
            }
        });
        return unsub;
    }, [bus]);

    // 监听浮动搜索事件
    useEffect(() => {
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'FLOATING_SEARCH_OPEN') {
                setFloatingSearch({ x: event.payload.x, y: event.payload.y });
            } else if (event.type === 'FLOATING_SEARCH_CLOSE') {
                setFloatingSearch(null);
            }
        });
        return unsub;
    }, [bus]);

    // 监听错误事件，添加 Toast 消息
    useEffect(() => {
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'ERROR_OCCURRED') {
                const { message, type = 'error', details } = event.error;
                if (DEBUG) console.error(`[App] 错误: ${message}`, details);
                const newToast: ToastMessage = {
                    id: Date.now() + Math.random(),
                    message,
                    type,
                };
                setToastMessages(prev => [...prev, newToast]);
                // 5 秒后自动移除
                setTimeout(() => {
                    setToastMessages(prev => prev.filter(t => t.id !== newToast.id));
                }, 5000);
            }
        });
        return unsub;
    }, [bus]);

    const selectedNode = state.nodes.find(n => n.id === state.selection[0]) ?? null;
    const processedNodes = useMemo(() =>
        state.nodes.map(n => ({ ...n, draggable: !n.data.locked })),
        [state.nodes]
    );
    const nodeTypeMap = getNodeTypeMap();

    const handleAddNodeFromClick = useCallback((type: string) => {
        const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const pos = instance.screenToFlowPosition(center);
        const newNode = createNode(type, pos);
        bus.dispatch({ type: 'NODE_ADDED', node: newNode });
    }, [bus, instance]);

    const handlePaneContext = useCallback((event: any) => {
        event.preventDefault();
        setPaneMenu({ x: event.clientX, y: event.clientY });
        if (DEBUG) console.log('[App] 画布右键打开菜单');
    }, []);

    const handlePaneDoubleClick = useCallback((event: any) => {
        if (event.target.classList.contains('react-flow__pane')) {
            openSearch(bus, event.clientX, event.clientY);
        }
    }, [bus]);

    // 工作流导入导出
    const handleSaveWorkflow = useCallback(() => {
        exportWorkflowData(state.nodes, state.edges);
    }, [state.nodes, state.edges]);

    const handleLoadWorkflow = useCallback(async () => {
        await importWorkflowData(bus);
    }, [bus]);

    const handleAutoLayout = useCallback(() => {
        bus.dispatch({ type: 'AUTO_LAYOUT' });
    }, [bus]);

    const toggleMinimap = useCallback(() => setShowMinimap(prev => !prev), []);

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

    const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: CustomNode) => {
        if (node.data.locked) return;
    }, []);

    const isValidConnection = useCallback((connection: Connection) => {
        return validateReconnectConnection(connection, state.edges, state.nodes);
    }, [state.edges, state.nodes]);

    const handleNodeContextMenu = useCallback((event: any, node: CustomNode | null) => {
        event.preventDefault();
        if (node) {
            setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
        } else if (state.selection.length > 1) {
            setContextMenu({ x: event.clientX, y: event.clientY, nodeId: null });
        } else {
            setPaneMenu({ x: event.clientX, y: event.clientY });
        }
    }, [state.selection]);

    // React Flow 回调适配器
    const onNodesChange: OnNodesChange = useCallback(
        (changes) => createOnNodesChange(bus)(changes),
        [bus]
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => createOnEdgesChange(bus)(changes),
        [bus]
    );
    const onConnect: OnConnect = useCallback(
        (connection) => createOnConnect(bus)(connection),
        [bus]
    );
    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            createOnReconnect(bus)(oldEdge, newConnection);
        },
        [bus]
    );
    const onConnectEnd = createConnectionEndHandler(bus);

    const handleReconnectStart = useCallback((_event: React.MouseEvent, edge: Edge, handleType: 'source' | 'target') => {
        bus.dispatch({ type: 'RECONNECT_START', edgeId: edge.id, handleType });
    }, [bus]);

    const handleReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, _edge: Edge, _handleType: 'source' | 'target') => {
        bus.dispatch({ type: 'RECONNECT_END' });
    }, [bus]);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);
    const closePaneMenu = useCallback(() => setPaneMenu(null), []);
    const closeConnectionMenu = useCallback(() => setConnectionMenu(null), []);
    const closeFloatingSearch = useCallback(() => closeSearch(bus), [bus]);

    // 移除 Toast 消息（手动关闭）
    const removeToast = useCallback((id: number) => {
        setToastMessages(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <EditorBusProvider value={bus}>
            <div className={`app-container ${state.mode === 'batch-connect' ? 'batch-connect-active' : ''}`}>
                <Sidebar
                    collapsed={layout.leftCollapsed}
                    onToggle={layout.toggleLeft}
                    addNode={handleAddNodeFromClick}
                    onSaveWorkflow={handleSaveWorkflow}
                    onLoadWorkflow={handleLoadWorkflow}
                    onAutoLayout={handleAutoLayout}
                    onToggleMinimap={toggleMinimap}
                    showMinimap={showMinimap}
                />
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

                {floatingSearch && (
                    <FloatingSearch
                        x={floatingSearch.x}
                        y={floatingSearch.y}
                        onClose={closeFloatingSearch}
                        addNode={(type: string) => {
                            const pos = instance.screenToFlowPosition({ x: floatingSearch.x, y: floatingSearch.y });
                            const newNode = createNode(type, { x: pos.x - 80, y: pos.y - 20 });
                            bus.dispatch({ type: 'NODE_ADDED', node: newNode });
                            closeFloatingSearch();
                        }}
                    />
                )}

                {/* Toast 提示容器 */}
                <ToastContainer messages={toastMessages} onClose={removeToast} />
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