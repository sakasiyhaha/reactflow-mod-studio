// src/utils/searchExtensions.ts
// 浮动搜索过滤器注册中心
// 允许 Mod 修改搜索结果列表

import type { NodeTemplate } from '../nodeTemplates';

/**
 * 搜索过滤器函数类型
 * @param templates 原始模板列表（经过内置过滤）
 * @param query 用户输入的搜索关键词
 * @returns 修改后的模板列表
 */
export type SearchFilter = (templates: NodeTemplate[], query: string) => NodeTemplate[];

// 存储所有注册的过滤器
let filters: SearchFilter[] = [];

/**
 * 注册搜索过滤器
 * @param filter 过滤器函数，按注册顺序依次调用
 */
export function registerSearchFilter(filter: SearchFilter): void {
  filters.push(filter);
  console.log(`[searchExtensions] 已注册搜索过滤器，当前共 ${filters.length} 个`);
}

/**
 * 清空所有过滤器（用于测试或重置）
 */
export function clearSearchFilters(): void {
  filters = [];
  console.log('[searchExtensions] 已清空所有搜索过滤器');
}

/**
 * 应用所有过滤器，返回最终结果
 * @param templates 原始模板列表
 * @param query 搜索关键词
 * @returns 过滤后的模板列表
 */
export function applySearchFilters(templates: NodeTemplate[], query: string): NodeTemplate[] {
  let result = templates;
  for (const filter of filters) {
    result = filter(result, query);
  }
  return result;
}