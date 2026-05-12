// src/bus/types.ts
// 事件总线核心类型定义
// 严格引用现有项目类型，无 any

// ==================== 外部依赖 ====================
import type { CustomNode, CustomEdge } from '../utils/types'; // 自定义节点/边类型
import type { Connection, XYPosition } from '@xyflow/react';  // React Flow 连接类型

// ==================== 编辑器模式 ====================
/**
 * 编辑器当前所处的操作模式
 * - 'default'       正常编辑
 * - 'batch-connect' 批量连线（选定源节点后，点击目标节点创建连线）
 * - 'reconnect'     重连现有边
 */
export type EditorMode = 'default' | 'batch-connect' | 'reconnect';

// ==================== 编辑器事件联合类型 ====================
/**
 * 所有可能的总线事件。
 * 每个事件都是 `{ type: 事件名, ...负载 }` 的形式。
 * 使用 TypeScript 联合类型和可辨识联合（discriminated union），
 * 让 reducer 能根据 type 安全地处理每种情况。
 */
export type EditorEvent =
  // ---------- 节点操作 ----------
  | { type: 'NODE_ADDED'; node: CustomNode }                           // 添加单个节点
  | { type: 'NODES_ADDED'; nodes: CustomNode[] }                      // 批量添加节点
  | { type: 'NODE_DELETED'; nodeIds: string[] }                       // 删除节点（同时删除相关边）
  | { type: 'NODE_DATA_CHANGED'; nodeId: string; data: Record<string, unknown>; propagate?: boolean } // 节点数据变更
  | { type: 'NODE_LOCK_TOGGLED'; nodeId: string }                     // 锁定/解锁节点
  | { type: 'NODE_POSITIONS_CHANGED'; updates: { id: string; position: XYPosition }[] } // 节点位置变化（通常在拖拽结束后）

  // ---------- 边操作 ----------
  | { type: 'EDGE_ADDED'; edge: CustomEdge }                          // 添加边
  | { type: 'EDGE_DELETED'; edgeId: string }                          // 删除边
  | { type: 'EDGE_RECONNECTED'; oldEdgeId: string; newConnection: Connection } // 重连边

  // ---------- 选中与模式 ----------
  | { type: 'SELECTION_CHANGED'; nodeIds: string[] }                  // 选中节点集合变化
  | { type: 'MODE_CHANGED'; mode: EditorMode; meta?: Record<string, unknown> } // 编辑器模式切换

  // ---------- 历史记录 ----------
  | { type: 'HISTORY_UNDO' }                                          // 执行撤销
  | { type: 'HISTORY_REDO' }                                          // 执行重做

  // ---------- 工作流整体 ----------
  | { type: 'WORKFLOW_LOADED'; nodes: CustomNode[]; edges: CustomEdge[] } // 加载 / 重置整个工作流

  // ---------- 批量连线 ----------
  | { type: 'BATCH_CONNECT_START'; sourceNodeIds: string[]; sourceHandleType: string }   // 开始批量连线，记录源节点和端口类型
  | { type: 'BATCH_CONNECT_EXECUTE'; targetNodeId: string; targetHandleId: string }      // 执行批量连线到目标节点
  | { type: 'BATCH_CONNECT_CANCEL' }                                                       // 取消批量连线

  // ---------- 重连 ----------
  | { type: 'RECONNECT_START'; edgeId: string; handleType: 'source' | 'target' }          // 开始拖拽重连
  | { type: 'RECONNECT_END' }                                                              // 结束重连（释放或成功）

  // ---------- 对齐与分布 ----------
  | { type: 'ALIGN_LEFT' }
  | { type: 'ALIGN_RIGHT' }
  | { type: 'ALIGN_TOP' }
  | { type: 'ALIGN_BOTTOM' }
  | { type: 'ALIGN_CENTER_X' }
  | { type: 'ALIGN_CENTER_Y' }
  | { type: 'DISTRIBUTE_HORIZONTAL' }
  | { type: 'DISTRIBUTE_VERTICAL' }
  | { type: 'AUTO_LAYOUT' }

  // ---------- 内部同步 ----------
  | { type: 'APPLY_NODE_CHANGES'; nodes: CustomNode[] };               // 将 React Flow 的节点变化直接应用到状态（如拖拽过程中的中间状态）

// ==================== 编辑器核心状态 ====================
/** 编辑器的完整状态快照 */
export interface EditorState {
  nodes: CustomNode[];        // 所有节点
  edges: CustomEdge[];        // 所有边
  selection: string[];        // 当前选中的节点 ID 列表
  mode: EditorMode;           // 当前编辑器模式
}

// ==================== 事件监听器 ====================
/** 总线订阅者回调签名，每次派发事件后都会收到事件和最新的状态 */
export type Listener = (payload: { event: EditorEvent; state: EditorState }) => void;

// ==================== 总线接口 ====================
/** 编辑器事件总线暴露的核心 API */
export interface EditorBus {
  getState(): EditorState;                      // 获取当前状态（非响应式，供回调使用）
  dispatch(event: EditorEvent): void;           // 派发一个事件
  subscribe(listener: Listener): () => void;    // 订阅事件，返回取消订阅的函数
}

// ==================== 编辑器 Mod 插件接口 ====================
/** 自定义 Mod 必须实现的接口 */
export interface EditorMod {
  id: string;                                             // 全局唯一标识
  init: (bus: EditorBus) => (() => void) | void;          // 初始化，可返回 cleanup 清理函数
  destroy?: () => void;                                   // 可选销毁函数
}