// src/components/FlowCanvas.tsx
import { useCallback, useRef, useEffect, useState } from 'react';
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
import { getContextMenuTarget } from '../mods/mod-canvas-context-menu';
import { getEdgeTypeMapDynamic } from '../../config/editorConfig';
import { getBatchConnectTargetPort } from '../registry/batchConnectStrategyRegistry';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../config/editorConfig';
import { DEBUG } from '../../config/debug';

interface BatchConnectState {
  sourceNodeIds: string[];
  sourceHandleType: string;
}

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
  const { screenToFlowPosition, getIntersectingNodes, fitView } = useReactFlow();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const bus = useEditorBusContext();

  // 动态视图控制状态
  const [minZoom, setMinZoom] = useState(0.2);
  const [maxZoom, setMaxZoom] = useState(4);
  const [translateExtent, setTranslateExtent] = useState<[[number, number], [number, number]]>([[-Infinity, -Infinity], [Infinity, Infinity]]);
  const [panOnDrag, setPanOnDrag] = useState<number[]>([1]);
  const [showBackground, setShowBackground] = useState(true);
  const [bgVariant, setBgVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);
  const [bgGap, setBgGap] = useState(20);
  const [bgSize, setBgSize] = useState(1);
  const [bgColor, setBgColor] = useState('var(--border)');

  // 辅助线状态
  const [guideLines, setGuideLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color?: string }>>([]);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  // 监听动态视图控制事件 + 辅助线事件 + FIT_VIEW
  useEffect(() => {
    const unsub = bus.subscribe(({ event }) => {
      switch (event.type) {
        case 'SET_VIEWPORT_LIMITS':
          if (event.payload.minZoom !== undefined) setMinZoom(event.payload.minZoom);
          if (event.payload.maxZoom !== undefined) setMaxZoom(event.payload.maxZoom);
          if (event.payload.translateExtent !== undefined) setTranslateExtent(event.payload.translateExtent);
          break;
        case 'SET_PAN_ON_DRAG':
          setPanOnDrag(event.payload);
          break;
        case 'SET_BACKGROUND_STYLE': {
          const { variant, gap, size, color } = event.payload;
          if (variant !== undefined) {
            if (variant === 'none') {
              setShowBackground(false);
            } else {
              setShowBackground(true);
              const variantMap: Record<string, BackgroundVariant> = {
                dots: BackgroundVariant.Dots,
                lines: BackgroundVariant.Lines,
              };
              setBgVariant(variantMap[variant] ?? BackgroundVariant.Dots);
            }
          }
          if (gap !== undefined) setBgGap(gap);
          if (size !== undefined) setBgSize(size);
          if (color !== undefined) setBgColor(color);
          break;
        }
        case 'RENDER_GUIDE_LINES':
          setGuideLines(event.payload.lines);
          break;
        case 'CLEAR_GUIDE_LINES':
          setGuideLines([]);
          break;
        case 'FIT_VIEW':
          fitView({ padding: event.options?.padding ?? 0.2, duration: event.options?.duration ?? 200 });
          break;
      }
    });
    return unsub;
  }, [bus, fitView]);

  // 右键菜单处理
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleContextMenu = (e: MouseEvent) => {
      const target = getContextMenuTarget(
        e.clientX,
        e.clientY,
        screenToFlowPosition,
        getIntersectingNodes,
        nodes
      );
      e.preventDefault();
      e.stopPropagation();

      const mockEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.MouseEvent;

      if (target.type === 'node') {
        const node = nodes.find(n => n.id === target.nodeId) || null;
        onNodeContextMenu(mockEvent, node);
        if (DEBUG) console.log('[FlowCanvas] 节点右键', target.nodeId);
      } else if (target.type === 'multiple') {
        onNodeContextMenu(mockEvent, null);
        if (DEBUG) console.log('[FlowCanvas] 多选右键空白');
      } else {
        onPaneContextMenu(mockEvent);
        if (DEBUG) console.log('[FlowCanvas] 画布右键');
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [screenToFlowPosition, getIntersectingNodes, nodes, onNodeContextMenu, onPaneContextMenu]);

  // 拖放节点
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
          position,
          data: { _nodeType: type, ...defaultData },
        },
      });
    },
    [screenToFlowPosition, bus]
  );

  // 批量连线
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
        if (!targetTemplate) return;

        const sourceNodeId = batchConnectState.sourceNodeIds[0];
        const sourceNode = nodes.find(n => n.id === sourceNodeId);

        const matchingInput = getBatchConnectTargetPort(
          sourceNode!,
          batchConnectState.sourceHandleType,
          targetNode,
          targetTemplate,
          edges
        );

        if (matchingInput) {
          executeBatchConnect(targetNode.id, matchingInput);
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
  }, [batchConnectState, screenToFlowPosition, getIntersectingNodes, executeBatchConnect, cancelBatchConnect, nodes, edges]);

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

  const handleMove = useCallback((_event: any, viewport: { x: number; y: number; zoom: number }) => {
    if (viewportRef.current.x === viewport.x && 
        viewportRef.current.y === viewport.y && 
        viewportRef.current.zoom === viewport.zoom) {
      return;
    }
    viewportRef.current = viewport;
    bus.dispatch({
      type: 'VIEWPORT_CHANGED',
      payload: viewport,
    });
    if (DEBUG) console.log('[FlowCanvas] 视图变化', viewport);
  }, [bus]);

  return (
    <div className="canvas-area" ref={canvasContainerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={getEdgeTypeMapDynamic()}
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
        reconnectRadius={50}   // 增加重连捕捉半径，从 25 改为 50
        edgesReconnectable
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        deleteKeyCode={["Delete", "Backspace"]}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
        panOnDrag={panOnDrag}
        panOnScroll={false}
        selectionOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={true}
        selectionMode={SelectionMode.Full}
        proOptions={{ hideAttribution: true }}
        disableKeyboardA11y={true}
        maxZoom={maxZoom}
        minZoom={minZoom}
        translateExtent={translateExtent}
        onDoubleClick={handleDoubleClick}
        onMove={handleMove}
      >
        {/* 隐藏的 SVG 渐变定义（用于自定义连接线） */}
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
        </svg>

        {/* 双网格：基础网格（20px） + 主网格（100px） */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={20}
          size={1}
          color="var(--grid-line-base)"
          style={{ opacity: 0.7 }}
        />
        <Background
          variant={BackgroundVariant.Lines}
          gap={100}
          size={1}
          color="var(--grid-line-major)"
          style={{ opacity: 1 }}
        />

        {/* 控制按钮组 */}
        <Controls showZoom showFitView showInteractive={false} />

        {/* 坐标轴（可选） */}
        <CoordinateAxes />

        {/* 迷你地图（固定在右下角） */}
        {showMinimap && (
          <MiniMap
            nodeStrokeColor="var(--primary)"
            nodeColor="var(--bg-card)"
            nodeBorderRadius={4}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 160,
              height: 120,
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 4,
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
        )}

        {/* 居中画布按钮 */}
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="canvas-center-btn"
          title="居中画布"
        >
          🏠
        </button>

        {/* 辅助线图层 */}
        {guideLines.length > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {guideLines.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color || '#f59e0b'}
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            ))}
          </svg>
        )}
      </ReactFlow>

      {/* 批量连线提示 */}
      {batchConnectState && (
        <div className="batch-connect-hint">
          🔗 已选择 {batchConnectState.sourceNodeIds.length} 个源节点，请点击目标节点的输入端口 · 右键或 Esc 取消
        </div>
      )}

      {/* 空状态提示 */}
      {nodes.length === 0 && (
        <div className="canvas-empty-state">
          ✨ 拖拽左侧节点或点击添加，开始构建流程
        </div>
      )}
    </div>
  );
}