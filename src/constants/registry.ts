// src/constants/registry.ts

/**
 * 批量连线策略优先级常量
 * 数值越小，优先级越高
 */
export const BATCH_CONNECT_STRATEGY_PRIORITY = {
  /** 最高优先级，用于覆盖所有策略 */
  HIGHEST: 0,
  /** 自定义策略起始优先级 */
  CUSTOM_HIGH: 50,
  /** 中等优先级（默认推荐给普通自定义策略） */
  CUSTOM_MID: 100,
  /** 较低优先级 */
  CUSTOM_LOW: 500,
  /** 默认内置策略（保底） */
  DEFAULT: 999,
  /** 最低优先级，最后执行 */
  LAST_RESORT: 1000,
} as const;