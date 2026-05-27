// src/registry/batchConnectStrategyRegistry.ts
import type { Node, Edge } from '@xyflow/react';
import type { NodeTemplate } from '../nodeTemplates';
import { BATCH_CONNECT_STRATEGY_PRIORITY } from '../constants/registry';

export type BatchConnectStrategy = (
  sourceNode: Node,
  sourceHandleType: string,
  targetNode: Node,
  targetTemplate: NodeTemplate,
  edges: Edge[]
) => string | null;

interface StrategyItem {
  strategy: BatchConnectStrategy;
  priority: number;
}

let strategies: StrategyItem[] = [];

export function registerBatchConnectStrategy(
  strategy: BatchConnectStrategy,
  priority: number = BATCH_CONNECT_STRATEGY_PRIORITY.CUSTOM_MID
): void {
  strategies.push({ strategy, priority });
  strategies.sort((a, b) => a.priority - b.priority);
  console.log(`[batchConnectStrategy] 已注册新策略，优先级=${priority}，当前共 ${strategies.length} 个`);
}

export function getBatchConnectTargetPort(
  sourceNode: Node,
  sourceHandleType: string,
  targetNode: Node,
  targetTemplate: NodeTemplate,
  edges: Edge[]
): string | null {
  for (const item of strategies) {
    const result = item.strategy(sourceNode, sourceHandleType, targetNode, targetTemplate, edges);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

export function clearBatchConnectStrategies(): void {
  strategies = [];
}

// 内置默认策略
const defaultStrategy: BatchConnectStrategy = (
  _sourceNode,
  sourceHandleType,
  _targetNode,
  targetTemplate,
  _edges
) => {
  const matchingInput = targetTemplate.inputs?.find(
    (i) => i.type === sourceHandleType || i.type === '*'
  );
  if (matchingInput) {
    return matchingInput.id;
  }
  return targetTemplate.inputs?.[0]?.id ?? null;
};

// 注册默认策略（使用 DEFAULT 优先级）
registerBatchConnectStrategy(defaultStrategy, BATCH_CONNECT_STRATEGY_PRIORITY.DEFAULT);