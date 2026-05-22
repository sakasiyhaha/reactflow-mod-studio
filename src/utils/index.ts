// src/utils/index.ts
import { getAllTemplates } from '../registry/nodeTemplateRegistry';

let idCounter = 0;

export const generateNodeId = () => `node_${++idCounter}`;

export const generateEdgeId = () => `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

export const getNodeDefaultConfig = (type: string) => {
  const template = getAllTemplates().find(item => item.type === type);
  return template?.defaultData || { label: type, value: 0 };
};