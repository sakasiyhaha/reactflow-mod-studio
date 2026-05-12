// src/utils/nodeFactory.ts
// 节点创建工厂函数 —— 统一生成新节点，避免在多处重复 ID 和默认数据逻辑

import { generateNodeId, getNodeDefaultConfig } from './index';
import type { CustomNode } from './types';

/**
 * 创建一个新的编辑器节点
 * @param type     - 节点模板类型（如 'numberInput', 'adder'）
 * @param position - 节点的画布坐标，默认 (250, 200)
 * @returns 完整的 CustomNode 对象，可直接用于 bus.dispatch({ type: 'NODE_ADDED', node })
 */
export function createNode(
  type: string,
  position: { x: number; y: number } = { x: 250, y: 200 }
): CustomNode {
  const id = generateNodeId();                     // 生成唯一 ID
  const defaultData = getNodeDefaultConfig(type);  // 从模板获取默认数据
  return {
    id,
    type,
    position,
    data: { _nodeType: type, ...defaultData },
  };
}