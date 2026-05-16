// src/components/FlowCanvas.tsx
// 核心画布组件 —— 封装 React Flow 实例，作为画布容器，处理拖放、批量连线、画布右键等交互
// 所有与 React Flow 直接相关的 props（onNodesChange, onConnect 等）由 App.tsx 传入，本组件仅负责传递和绑定额外事件
// 右键菜单逻辑现在使用 mod-canvas-context-menu 提供的纯函数

import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  MiniMap,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  NodeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnConnectEnd,
  OnReconnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CoordinateAxes from './CoordinateAxes';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { generateNodeId, getNodeDefaultConfig } from '../utils';
import { getContextMenuTarget } from '../mods/mod-canvas-context-menu'; // 新增
import { DEBUG } from '../../config/debug';

/** 批量连线状态结构 */
interface BatchConnectState {
  sourceNodeIds: string[];
  sourceHandleType: string;
}

/** FlowCanvas 组件的 Props 接口 */
interface FlowCanvasProps {
  nodeTypes: NodeTypes;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node | null) => void;
  onNodeDragStart: (event: React.MouseEvent, node: Node) => void;
  isValidConnection: (connection: { source: string; target: string }) => boolean;
  onReconnectStart: (event: React.MouseEvent, edge: Edge, handleType: 'source' | 'target') => void;
  onReconnect: OnReconnect;
  onReconnectEnd: (event: MouseEvent | TouchEvent, edge: Edge, handleType: 'source' | 'target') => void;
  onPaneContextMenu: (event: React.MouseEvent) => void;
  onPaneDoubleClick?: (event: React.MouseEvent) => void;
  showMinimap: boolean;
  mode: string;
  batchConnectState: BatchConnectState | null;
  executeBatchConnect: (targetNodeId: string, targetHandleId: string) => void;
  cancelBatchConnect: () => void;
}

export default function FlowCanvas({
  nodeTypes,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectEnd,
  onNodeClick,
  onPaneClick,
  onNodeContextMenu,
  onNodeDragStart,
  isValidConnection,
  onReconnectStart,
  onReconnect,
  onReconnectEnd,
  onPaneContextMenu,
  onPaneDoubleClick,
  showMinimap,
  mode,
  batchConnectState,
  executeBatchConnect,
  cancelBatchConnect,
}: FlowCanvasProps) {
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const bus = useEditorBusContext();

  // ==================== 右键菜单处理（替换原有的 useCanvasContextMenu） ====================
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent) => {
      // 使用 Mod 提供的纯函数判断目标
      const target = getContextMenuTarget(
        e.clientX,
        e.clientY,
        screenToFlowPosition,
        getIntersectingNodes,
        nodes
      );

      // 阻止浏览器默认右键菜单
      e.preventDefault();
      e.stopPropagation();

      // 构建模拟 React 事件对象（仅包含必要字段）
      const mockEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent;

      if (target.type === 'node') {
        // 节点右键：找到对应节点对象
        const node = nodes.find(n => n.id === target.nodeId) || null;
        onNodeContextMenu(mockEvent, node);
        if (DEBUG) console.log('[FlowCanvas] 节点右键', target.nodeId);
      } else if (target.type === 'multiple') {
        // 多选状态右键空白：弹出节点菜单（批量操作），传递 nodeId = null
        onNodeContextMenu(mockEvent, null);
        if (DEBUG) console.log('[FlowCanvas] 多选右键空白');
      } else {
        // 普通空白右键：弹出画布菜单
        onPaneContextMenu(mockEvent);
        if (DEBUG) console.log('[FlowCanvas] 画布右键');
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [screenToFlowPosition, getIntersectingNodes, nodes, onNodeContextMenu, onPaneContextMenu]);

  // ==================== 拖放节点处理 ====================
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const defaultData = getNodeDefaultConfig(type);
      bus.dispatch({
        type: 'NODE_ADDED',
        node: {
          id: generateNodeId(),
          type,
          position: { x: position.x - 80, y: position.y - 40 },
          data: { _nodeType: type, ...defaultData },
        },
      });
    },
    [screenToFlowPosition, bus]
  );

  // ==================== 批量连线模式下的点击监听 ====================
  useEffect(() => {
    if (!batchConnectState) return;
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const intersections = getIntersectingNodes({
        x: flowPos.x, y: flowPos.y, width: 1, height: 1,
      });

      if (intersections && intersections.length > 0) {
        const targetNode = intersections[0];
        const targetTemplate = getAllTemplates().find(t => t.type === targetNode.type);
        const matchingInput =
          targetTemplate?.inputs?.find(
            i => i.type === (batchConnectState.sourceHandleType || '*')
          ) ?? targetTemplate?.inputs?.[0];
        if (matchingInput) {
          executeBatchConnect(targetNode.id, matchingInput.id);
          return;
        }
      }
      cancelBatchConnect();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelBatchConnect();
      }
    };

    container.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [batchConnectState, screenToFlowPosition, getIntersectingNodes, executeBatchConnect, cancelBatchConnect]);

  // ==================== 画布空白点击处理 ====================
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('react-flow__pane')) return;
      if (event.button === 0) {
        onPaneClick(event);
      }
    },
    [onPaneClick]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      onPaneDoubleClick?.(event);
    },
    [onPaneDoubleClick]
  );

  // ==================== 渲染 ====================
  return (
    <div className="canvas-area" ref={canvasContainerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStart={onNodeDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        reconnectRadius={25}
        edgesReconnectable
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        deleteKeyCode={["Delete", "Backspace"]}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
        panOnDrag={[1]}
        panOnScroll={false}
        selectionOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={true}
        selectionMode={SelectionMode.Full}
        proOptions={{ hideAttribution: true }}
        disableKeyboardA11y={true}
        maxZoom={4}
        minZoom={0.2}
        translateExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
        onDoubleClick={handleDoubleClick}
      >
        <Controls showZoom showFitView showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <CoordinateAxes />
        {showMinimap && (
          <MiniMap
            nodeStrokeColor="var(--primary)"
            nodeColor="var(--bg-card)"
            nodeBorderRadius={4}
            style={{ width: 180, height: 120 }}
            maskColor="rgba(245, 249, 255, 0.6)"
          />
        )}
      </ReactFlow>

      {batchConnectState && (
        <div className="batch-connect-hint">
          🔗 已选择 {batchConnectState.sourceNodeIds.length} 个源节点，请点击目标节点的输入端口 · 右键或 Esc 取消
        </div>
      )}

      {nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--text-secondary)',
            fontSize: 18,
            pointerEvents: 'none',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.8)',
            padding: '16px 32px',
            borderRadius: 8,
            border: '1px dashed var(--border)',
          }}
        >
          ✨ 拖拽左侧节点或点击添加，开始构建流程
        </div>
      )}
    </div>
  );
}