// custom-mods/timestamp-hook-mod.ts
import type { EditorMod } from '../src/bus/types';
import { registerBeforeExportHook, registerAfterImportHook } from '../src/mods/mod-workflow-io';

export const timestampHookMod: EditorMod = {
    id: 'timestamp-hook',
    init() {
        // 导出前钩子：为每个节点添加 _exportedAt 字段
        const unregisterBefore = registerBeforeExportHook(async (data) => {
            const newNodes = data.nodes.map((node: any) => ({
                ...node,
                data: {
                    ...node.data,
                    _exportedAt: Date.now()
                }
            }));
            console.log('[timestamp-hook] 已为节点添加导出时间戳');
            return { nodes: newNodes, edges: data.edges };
        });

        // 导入后钩子：打印导入的节点数量
        const unregisterAfter = registerAfterImportHook((data) => {
            console.log(`[timestamp-hook] 导入了 ${data.nodes.length} 个节点，${data.edges.length} 条边`);
        });

        // 返回同时清理两个钩子的函数
        return () => {
            unregisterBefore();
            unregisterAfter();
        };
    }
};