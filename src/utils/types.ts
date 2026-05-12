// src/utils/types.ts
// 项目核心类型定义 —— 自定义节点数据类型与边类型

import type { Node, Edge } from '@xyflow/react';

/**
 * 自定义节点数据接口
 * 扩展了 React Flow 的 Node 类型，增加了编辑器需要的内联控件、锁定等字段
 */
export interface CustomNodeData {
  _nodeType: string;                          // 节点模板类型标识，对应 nodeTemplates 中的 type 字段
  label?: string;                             // 节点标题（可覆盖模板的 title）
  value?: number | string;                    // 节点的当前值（用于数值输入、加法器等）
  locked?: boolean;                           // 是否锁定（锁定后无法拖拽移动）
  [key: string]: unknown;                     // 索引签名，允许动态属性（如内联控件的其他字段）
}

/** 携带自定义数据的 React Flow 节点 */
export type CustomNode = Node<CustomNodeData>;

/** React Flow 边（使用原始 Edge 类型） */
export type CustomEdge = Edge;