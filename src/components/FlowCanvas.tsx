// src/components/FlowCanvas.tsx
// 核心画布组件 —— 封装 React Flow 实例，作为画布容器，处理拖放、批量连线、画布右键等交互
// 所有与 React Flow 直接相关的 props（onNodesChange, onConnect 等）由 App.tsx 传入，本组件仅负责传递和绑定额外事件

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
import '@xyflow/react/dist/style.css';        // React Flow 官方样式
import CoordinateAxes from './CoordinateAxes';  // 自定义坐标轴组件
import { useCanvasContextMenu } from '../hooks/useCanvasContextMenu'; // 右键菜单 Hook
import { useEditorBusContext } from '../bus/EditorBusContext';        // 获取总线实例
import { getAllTemplates } from '../registry/nodeTemplateRegistry';  // 动态获取节点模板
import { generateNodeId, getNodeDefaultConfig } from '../utils';     // 工具函数

/** 批量连线状态结构 */
interface BatchConnectState {
  sourceNodeIds: string[];      // 源节点 ID 列表
  sourceHandleType: string;     // 源端口类型（如 'number'）
}

/** FlowCanvas 组件的 Props 接口 */
interface FlowCanvasProps {
  nodeTypes: NodeTypes;                              // 节点类型映射（type → 渲染组件）
  nodes: Node[];                                     // 当前所有节点
  edges: Edge[];                                     // 当前所有边
  onNodesChange: OnNodesChange;                      // 节点变化回调
  onEdgesChange: OnEdgesChange;                      // 边变化回调
  onConnect: OnConnect;                              // 新建连接回调
  onConnectEnd: OnConnectEnd;                        // 连接结束回调（用于弹出菜单）
  onNodeClick: (event: React.MouseEvent, node: Node) => void;  // 点击节点
  onPaneClick: (event: React.MouseEvent) => void;             // 点击画布空白
  onNodeContextMenu: (event: React.MouseEvent, node: Node | null) => void; // 右键节点/多选
  onNodeDragStart: (event: React.MouseEvent, node: Node) => void;          // 开始拖拽节点
  isValidConnection: (connection: { source: string; target: string }) => boolean; // 连接合法性校验
  onReconnectStart: (event: React.MouseEvent, edge: Edge, handleType: 'source' | 'target') => void;
  onReconnect: OnReconnect;
  onReconnectEnd: (event: MouseEvent | TouchEvent, edge: Edge, handleType: 'source' | 'target') => void;
  onPaneContextMenu: (event: React.MouseEvent) => void;   // 画布右键（空白处）
  onPaneDoubleClick?: (event: React.MouseEvent) => void; // 画布双击
  showMinimap: boolean;                                   // 是否显示小地图
  mode: string;                                           // 当前编辑器模式
  batchConnectState: BatchConnectState | null;            // 批量连线状态
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
  const bus = useEditorBusContext(); // 获取总线，用于拖放添加节点

  // ---------- 拖放节点处理 ----------
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();                             // 必须阻止默认行为才能触发 onDrop
    event.dataTransfer.dropEffect = 'move';             // 显示移动光标
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type'); // 获取拖拽的节点类型
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY }); // 屏幕坐标转画布坐标
      const defaultData = getNodeDefaultConfig(type);
      bus.dispatch({
        type: 'NODE_ADDED',
        node: {
          id: generateNodeId(),
          type,
          position: { x: position.x - 80, y: position.y - 40 },  // 居中偏移
          data: { _nodeType: type, ...defaultData },
        },
      });
    },
    [screenToFlowPosition, bus]
  );

  // ---------- 右键菜单绑定（画布容器上） ----------
  useCanvasContextMenu(
    canvasContainerRef,
    screenToFlowPosition,
    getIntersectingNodes,
    onNodeContextMenu,
    onPaneContextMenu,
    nodes
  );

  // ---------- 批量连线模式下的点击监听 ----------
  useEffect(() => {
    if (!batchConnectState) return;           // 非批量连线模式，不监听
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      // 获取点击位置下的节点
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const intersections = getIntersectingNodes({
        x: flowPos.x, y: flowPos.y, width: 1, height: 1,
      });

      if (intersections && intersections.length > 0) {
        const targetNode = intersections[0];
        // 从注册中心获取目标节点的模板，而不是硬编码的 NODE_TEMPLATES
        const targetTemplate = getAllTemplates().find(t => t.type === targetNode.type);
        // 匹配与源端口类型相同的输入端口，或取第一个输入端口
        const matchingInput =
          targetTemplate?.inputs?.find(
            i => i.type === (batchConnectState.sourceHandleType || '*')
          ) ?? targetTemplate?.inputs?.[0];
        if (matchingInput) {
          executeBatchConnect(targetNode.id, matchingInput.id);
          return;
        }
      }
      // 点击空白处 → 取消批量连线
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

  // ---------- 画布空白点击处理（排除按钮和控件） ----------
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('react-flow__pane')) return; // 只处理真实空白区域
      if (event.button === 0) {  // 仅左键
        onPaneClick(event);
      }
    },
    [onPaneClick]
  );

  // ---------- 画布双击处理 ----------
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
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        reconnectRadius={25}          // 重连的检测半径（像素）
        edgesReconnectable            // 允许重连已有边
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        deleteKeyCode={["Delete", "Backspace"]}  // 按 Delete 或 Backspace 删除选中元素
        fitView                       // 初始自动适配视图
        fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
        panOnDrag={[1]}               // 鼠标左键拖拽平移画布
        panOnScroll={false}           // 禁用滚轮平移
        selectionOnDrag={true}        // 拖拽空白区域进行框选
        zoomOnScroll={true}           // 滚轮缩放
        zoomOnPinch={true}            // 触摸板缩放
        zoomOnDoubleClick={false}     // 禁用双击缩放
        selectNodesOnDrag={true}      // 拖拽选中节点（已替代默认行为）
        selectionMode={SelectionMode.Full}
        proOptions={{ hideAttribution: true }} // 隐藏 React Flow 水印
        disableKeyboardA11y={true}    // 禁用键盘无障碍（避免冲突）
        maxZoom={4}
        minZoom={0.2}
        translateExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]} // 无限画布
        onDoubleClick={handleDoubleClick}
      >
        {/* 内置控件：放大/缩小/适应视图 */}
        <Controls showZoom showFitView showInteractive={false} />
        {/* 背景圆点网格 */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        {/* 自定义坐标轴（原点始终在 (0,0)） */}
        <CoordinateAxes />
        {/* 条件渲染小地图 */}
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

      {/* 批量连线模式下的浮动提示 */}
      {batchConnectState && (
        <div className="batch-connect-hint">
          🔗 已选择 {batchConnectState.sourceNodeIds.length} 个源节点，请点击目标节点的输入端口 · 右键或 Esc 取消
        </div>
      )}

      {/* 画布为空时的引导提示 */}
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