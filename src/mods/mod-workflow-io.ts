// src/mods/mod-workflow-io.ts
// 工作流导入导出 Mod - 支持可替换处理器（JSON / YAML / 其他格式）
// 提供 setWorkflowIOHandlers API，允许自定义 Mod 在不修改核心代码的情况下替换导入/导出逻辑
// 默认实现为 JSON 格式

import type { EditorMod, EditorBus } from '../bus/types';
import { exportWorkflow, importWorkflow } from '../utils/workflowIO';
import { DEBUG } from '../../config/debug';

// ==================== 可替换的函数句柄 ====================
// 默认导出处理器（JSON）
let _exportWorkflowData: (nodes: any[], edges: any[]) => void | Promise<void> = async (nodes, edges) => {
  exportWorkflow(nodes, edges);
  if (DEBUG) console.log('[workflow-io] 默认 JSON 导出');
};

// 默认导入处理器（JSON）
let _importWorkflowData: (bus: EditorBus) => void | Promise<void> = async (bus) => {
  try {
    const { nodes, edges } = await importWorkflow();
    bus.dispatch({ type: 'WORKFLOW_LOADED', nodes, edges });
    if (DEBUG) console.log('[workflow-io] 默认 JSON 导入');
  } catch (err) {
    if (err instanceof Error && err.message !== '未选择文件') {
      console.error('[workflow-io] 导入失败:', err);
    }
  }
};

// ==================== 对外暴露的替换 API ====================
export function setWorkflowIOHandlers(
  exportHandler: (nodes: any[], edges: any[]) => void | Promise<void>,
  importHandler: (bus: EditorBus) => void | Promise<void>
) {
  _exportWorkflowData = exportHandler;
  _importWorkflowData = importHandler;
  if (DEBUG) console.log('[workflow-io] 已替换导入/导出处理器');
}

// ==================== 供 App.tsx 调用的包装函数 ====================
export async function exportWorkflowData(nodes: any[], edges: any[]): Promise<void> {
  await _exportWorkflowData(nodes, edges);
}

export async function importWorkflowData(bus: EditorBus): Promise<void> {
  await _importWorkflowData(bus);
}

// ==================== Mod 定义 ====================
export const modWorkflowIO: EditorMod = {
  id: 'workflow-io',
  init() {
    if (DEBUG) console.log('[mod-workflow-io] 初始化（默认 JSON 处理器）');
    return () => {
      if (DEBUG) console.log('[mod-workflow-io] 已卸载');
    };
  },
};

export function getWorkflowIOUtils(bus: EditorBus) {
  return {
    exportWorkflow: (nodes: any[], edges: any[]) => exportWorkflowData(nodes, edges),
    importWorkflow: () => importWorkflowData(bus),
  };
}