// src/registry/historyIgnoreRegistry.ts
// 历史记录忽略事件注册中心
// 允许 Mod 声明自定义事件类型不应被历史记录捕捉

let ignoredEventTypes: Set<string> = new Set([
  // 内置忽略事件（不可移除）
  'HISTORY_UNDO', 'HISTORY_REDO', 'SELECTION_CHANGED',
  'MODE_CHANGED', 'APPLY_NODE_CHANGES', 'PROJECT_CONFIG_TOGGLE_PANEL'
]);

/**
 * 注册一个不应被历史记录的事件类型
 * @param eventType 事件类型字符串
 */
export function registerHistoryIgnoredEventType(eventType: string): void {
  ignoredEventTypes.add(eventType);
  console.log(`[historyIgnore] 已注册忽略事件类型: ${eventType}`);
}

/**
 * 检查事件类型是否应被历史记录忽略
 */
export function isHistoryIgnoredEventType(eventType: string): boolean {
  return ignoredEventTypes.has(eventType);
}

/**
 * 获取所有忽略的事件类型（只读）
 */
export function getIgnoredEventTypes(): ReadonlySet<string> {
  return ignoredEventTypes;
}