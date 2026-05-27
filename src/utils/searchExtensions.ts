// src/utils/searchExtensions.ts
import type { NodeTemplate } from '../nodeTemplates';

export type SearchFilter = (templates: NodeTemplate[], query: string) => NodeTemplate[];

let filters: SearchFilter[] = [];

export function registerSearchFilter(filter: SearchFilter): () => void {
  filters.push(filter);
  console.log(`[searchExtensions] 已注册搜索过滤器，当前共 ${filters.length} 个`);

  return () => {
    const index = filters.indexOf(filter);
    if (index !== -1) {
      filters.splice(index, 1);
      console.log(`[searchExtensions] 已卸载搜索过滤器`);
    }
  };
}

export function clearSearchFilters(): void {
  filters = [];
}

export function applySearchFilters(templates: NodeTemplate[], query: string): NodeTemplate[] {
  let result = templates;
  for (const filter of filters) {
    result = filter(result, query);
  }
  return result;
}