// src/registry/batchConnectStrategyRegistry.ts
import type { Node, Edge } from '@xyflow/react';
import type { NodeTemplate } from '../nodeTemplates';
import { ExtensionPoint, ExtensionManager } from './ExtensionPoint';
import { BATCH_CONNECT_STRATEGY_PRIORITY } from '../constants/registry';

export type BatchConnectStrategy = (
  sourceNode: Node,
  sourceHandleType: string,
  targetNode: Node,
  targetTemplate: NodeTemplate,
  edges: Edge[]
) => string | null;

// 使用 ExtensionManager 管理策略
const strategyManager = new ExtensionManager();

/**
 * 注册批量连线端口匹配策略
 * @param strategy 策略函数
 * @param priority 优先级（越小越先执行），默认使用 CUSTOM_MID
 * @returns 取消注册函数
 */
export function registerBatchConnectStrategy(
  strategy: BatchConnectStrategy,
  priority: number = BATCH_CONNECT_STRATEGY_PRIORITY.CUSTOM_MID
): () => void {
  const id = `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext: ExtensionPoint<BatchConnectStrategy> = {
    id,
    priority,
    dependencies: [],
    activate: () => strategy,
    deactivate: () => {},
  };
  const unregister = strategyManager.register(ext);
  console.log(`[batchConnectStrategy] 已注册新策略，优先级=${priority}，当前共 ${strategyManager.resolveOrder().length} 个`);
  return unregister;
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
  const exts = strategyManager.resolveOrder(); // 按优先级升序
  for (const ext of exts) {
    const strategy = ext.activate() as BatchConnectStrategy;
    const result = strategy(sourceNode, sourceHandleType, targetNode, targetTemplate, edges);
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
  strategyManager.clear();
}

// ==================== 内置默认策略 ====================
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