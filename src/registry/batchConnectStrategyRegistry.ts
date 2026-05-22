// src/registry/batchConnectStrategyRegistry.ts
// 批量连线端口匹配策略注册中心
// 允许 Mod 注册自定义的端口匹配逻辑

import type { Node, Edge } from '@xyflow/react';
import type { NodeTemplate } from '../nodeTemplates';

/**
 * 策略函数参数
 * @param sourceNode 源节点对象
 * @param sourceHandleType 源端口类型（如 'number', 'boolean', '*'）
 * @param targetNode 目标节点对象
 * @param targetTemplate 目标节点的模板
 * @param edges 当前所有边（用于防重复等）
 * @returns 匹配的目标端口 ID，若返回 null 则继续下一个策略
 */
export type BatchConnectStrategy = (
  sourceNode: Node,
  sourceHandleType: string,
  targetNode: Node,
  targetTemplate: NodeTemplate,
  edges: Edge[]
) => string | null;

// 内部存储项
interface StrategyItem {
  strategy: BatchConnectStrategy;
  priority: number;
}

let strategies: StrategyItem[] = [];

/**
 * 注册批量连线端口匹配策略
 * @param strategy 策略函数
 * @param priority 优先级（越小越先执行），默认 100
 */
export function registerBatchConnectStrategy(
  strategy: BatchConnectStrategy,
  priority: number = 100
): void {
  strategies.push({ strategy, priority });
  // 按优先级排序
  strategies.sort((a, b) => a.priority - b.priority);
  console.log(`[batchConnectStrategy] 已注册新策略，当前共 ${strategies.length} 个`);
}

/**
 * 获取匹配的目标端口 ID
 * @returns 匹配的端口 ID，若没有匹配则返回 null
 */
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

/**
 * 清空所有策略（用于测试）
 */
export function clearBatchConnectStrategies(): void {
  strategies = [];
}

// ==================== 内置默认策略 ====================
// 默认策略：匹配与源端口类型相同的输入端口，若无则取第一个输入端口
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
  // fallback: 第一个输入端口
  return targetTemplate.inputs?.[0]?.id ?? null;
};

// 注册默认策略（最低优先级，作为最后保底）
registerBatchConnectStrategy(defaultStrategy, 999);