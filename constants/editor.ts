// constants/editor.ts

// 默认最大历史记录数
const DEFAULT_MAX_HISTORY = 50;

/**
 * 获取当前最大历史记录数（优先使用 localStorage 中存储的值）
 */
export function getMaxHistory(): number {
  try {
    const saved = localStorage.getItem('editor_max_history');
    if (saved !== null) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 1 && num <= 200) {
        return num;
      }
    }
  } catch (e) {
    console.warn('[editor] 读取历史记录配置失败，使用默认值');
  }
  return DEFAULT_MAX_HISTORY;
}

/**
 * 设置最大历史记录数（并保存到 localStorage）
 * 可用于 Mod 或设置面板动态修改
 */
export function setMaxHistory(value: number): void {
  if (value >= 1 && value <= 200) {
    localStorage.setItem('editor_max_history', String(value));
  } else {
    console.warn('[editor] 历史记录数超出范围 (1-200)，未保存');
  }
}