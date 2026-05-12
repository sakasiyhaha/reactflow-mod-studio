// src/utils/index.ts
// 全局唯一 ID 生成器 + 节点默认配置获取 + 计数器同步

import { getAllTemplates } from '../registry/nodeTemplateRegistry';

let idCounter = 0;

/** 生成全局唯一的节点 ID，格式为 `node_1`, `node_2`, ... */
export const generateNodeId = () => `node_${++idCounter}`;

/** 生成全局唯一的边 ID */
export const generateEdgeId = () => `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * 同步 ID 计数器，使其值至少等于所有已存在节点 ID 中的最大数字
 * 在加载工作流或恢复自动保存后调用，避免新节点 ID 与已有节点冲突
 */
export const syncIdCounter = (nodes: { id: string }[]) => {
  let max = 0;
  nodes.forEach(node => {
    const match = node.id.match(/^node_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  });
  if (max > idCounter) {
    idCounter = max;
  }
};

/**
 * 根据节点类型获取模板中的默认配置数据
 * @param type - 节点模板类型（如 'numberInput'）
 * @returns 默认数据对象，至少包含 `{ label, value: 0 }`
 */
export const getNodeDefaultConfig = (type: string) => {
  const template = getAllTemplates().find(item => item.type === type);
  return template?.defaultData || { label: type, value: 0 };
};