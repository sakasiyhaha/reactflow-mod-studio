// src/utils/nodeFactory.ts
import { generateNodeId, getNodeDefaultConfig } from './index';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
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
  const id = generateNodeId();
  const defaultData = getNodeDefaultConfig(type);
  const template = getAllTemplates().find(t => t.type === type);
  // 将模板的默认宽高注入到节点的 data 中（供对齐/布局使用）
  const extraData: Record<string, unknown> = {};
  if (template?.defaultWidth !== undefined) {
    extraData.__templateDefaultWidth = template.defaultWidth;
  }
  if (template?.defaultHeight !== undefined) {
    extraData.__templateDefaultHeight = template.defaultHeight;
  }
  return {
    id,
    type,
    position,
    data: { _nodeType: type, ...defaultData, ...extraData },
  };
}