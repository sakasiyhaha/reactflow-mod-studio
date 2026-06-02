// src/mods/mod-workflow-io.ts
// 工作流导入导出 Mod - 支持可替换处理器（JSON / YAML / 其他格式）
// 提供 setWorkflowIOHandlers API，允许自定义 Mod 在不修改核心代码的情况下替换导入/导出逻辑
// 默认实现为 JSON 格式
// 新增：beforeExport 和 afterImport 钩子，允许其他 Mod 在导出前修改数据，在导入后执行自定义逻辑
// 异步导出支持（由于 exportWorkflow 现在是异步的）
// 导入超时时显示 Toast 提示

import type { EditorMod, EditorBus } from '../bus/types';
import { exportWorkflow, importWorkflow } from '../utils/workflowIO';
import { DEBUG } from '../../config/debug';

// ==================== 钩子类型定义 ====================
export type BeforeExportHook = (
    data: { nodes: any[]; edges: any[] }
) => { nodes: any[]; edges: any[] } | Promise<{ nodes: any[]; edges: any[] }>;

export type AfterImportHook = (
    data: { nodes: any[]; edges: any[] }
) => void | Promise<void>;

// 钩子存储
let beforeExportHooks: BeforeExportHook[] = [];
let afterImportHooks: AfterImportHook[] = [];

// ==================== 钩子注册 API ====================
/**
 * 注册导出前钩子
 * 钩子按注册顺序依次执行，可以修改导出数据
 * @param hook 钩子函数
 * @returns 取消注册的函数
 */
export function registerBeforeExportHook(hook: BeforeExportHook): () => void {
    beforeExportHooks.push(hook);
    if (DEBUG) console.log(`[workflow-io] 注册 beforeExport 钩子，当前共 ${beforeExportHooks.length} 个`);
    return () => {
        beforeExportHooks = beforeExportHooks.filter(h => h !== hook);
        if (DEBUG) console.log('[workflow-io] 卸载 beforeExport 钩子');
    };
}

/**
 * 注册导入后钩子
 * 钩子按注册顺序依次执行，可以执行额外逻辑（如缩放视图、校验数据等）
 * @param hook 钩子函数
 * @returns 取消注册的函数
 */
export function registerAfterImportHook(hook: AfterImportHook): () => void {
    afterImportHooks.push(hook);
    if (DEBUG) console.log(`[workflow-io] 注册 afterImport 钩子，当前共 ${afterImportHooks.length} 个`);
    return () => {
        afterImportHooks = afterImportHooks.filter(h => h !== hook);
        if (DEBUG) console.log('[workflow-io] 卸载 afterImport 钩子');
    };
}

// ==================== 可替换的函数句柄 ====================
// 默认导出处理器（JSON） - 异步
let _exportWorkflowData: (nodes: any[], edges: any[]) => Promise<void> = async (nodes, edges) => {
    await exportWorkflow(nodes, edges);
    if (DEBUG) console.log('[workflow-io] 默认 JSON 导出（异步）');
};

// 默认导入处理器（JSON） - 返回 Promise<{ nodes, edges }>
let _importWorkflowData: (bus: EditorBus) => Promise<{ nodes: any[]; edges: any[] }> = async (bus) => {
    try {
        const { nodes, edges } = await importWorkflow();
        if (DEBUG) console.log('[workflow-io] 默认 JSON 导入');
        return { nodes, edges };
    } catch (err) {
        // 如果是超时错误，显示 Toast 提示
        if (err instanceof Error && err.message === '未选择文件（超时）') {
            bus.dispatch({
                type: 'ERROR_OCCURRED',
                error: {
                    message: '选择文件超时（60秒），请重新尝试',
                    type: 'warning',
                    details: err,
                },
            });
        } else if (err instanceof Error && err.message !== '未选择文件') {
            console.error('[workflow-io] 导入失败:', err);
            bus.dispatch({
                type: 'ERROR_OCCURRED',
                error: {
                    message: `导入失败: ${err.message}`,
                    type: 'error',
                    details: err,
                },
            });
        }
        throw err;
    }
};

// ==================== 对外暴露的替换 API ====================
/**
 * 替换导入/导出处理器（完全替换默认实现）
 * @param exportHandler 导出函数（异步）
 * @param importHandler 导入函数，应返回 Promise<{ nodes, edges }>
 */
export function setWorkflowIOHandlers(
    exportHandler: (nodes: any[], edges: any[]) => Promise<void>,
    importHandler: (bus: EditorBus) => Promise<{ nodes: any[]; edges: any[] }>
) {
    _exportWorkflowData = exportHandler;
    _importWorkflowData = importHandler;
    if (DEBUG) console.log('[workflow-io] 已替换导入/导出处理器');
}

// ==================== 供 App.tsx 调用的包装函数（集成钩子） ====================
export async function exportWorkflowData(nodes: any[], edges: any[]): Promise<void> {
    // 执行 beforeExport 钩子（支持异步，顺序执行）
    let exportData = { nodes, edges };
    for (const hook of beforeExportHooks) {
        try {
            exportData = await hook(exportData);
        } catch (err) {
            console.error('[workflow-io] beforeExport 钩子执行失败:', err);
            // 继续执行后续钩子，不中断导出流程
        }
    }
    // 调用实际导出处理器（异步）
    await _exportWorkflowData(exportData.nodes, exportData.edges);
}

export async function importWorkflowData(bus: EditorBus): Promise<void> {
    // 调用实际导入处理器获取数据
    const { nodes, edges } = await _importWorkflowData(bus);
    // 执行 afterImport 钩子
    for (const hook of afterImportHooks) {
        try {
            await hook({ nodes, edges });
        } catch (err) {
            console.error('[workflow-io] afterImport 钩子执行失败:', err);
            // 继续执行后续钩子，不中断导入流程
        }
    }
    // 派发工作流加载事件
    bus.dispatch({ type: 'WORKFLOW_LOADED', nodes, edges });
}

// ==================== Mod 定义 ====================
export const modWorkflowIO: EditorMod = {
    id: 'workflow-io',
    init() {
        if (DEBUG) console.log('[mod-workflow-io] 初始化（默认 JSON 处理器，异步支持）');
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