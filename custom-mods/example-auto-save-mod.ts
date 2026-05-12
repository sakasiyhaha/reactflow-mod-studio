// custom-mods/example-auto-save-mod.ts
import type { EditorMod } from '../src/bus/types';

let unsubscribe: (() => void) | undefined;

/**
 * 自动保存 Mod
 * 监听节点/边的增删改事件，自动将工作流保存到 localStorage
 */
export const exampleAutoSaveMod: EditorMod = {
    id: 'example-auto-save',
    init(bus) {
        const save = () => {
            const state = bus.getState();
            try {
                localStorage.setItem('auto-saved-workflow', JSON.stringify({
                    nodes: state.nodes,
                    edges: state.edges,
                }));
                console.log('[example-auto-save] 工作流已自动保存');
            } catch (e) {
                console.warn('[example-auto-save] 保存失败:', e);
            }
        };

        // 订阅所有可能改变工作流的拓扑事件
        unsubscribe = bus.subscribe(({ event }) => {
            if (
                [
                    'NODE_ADDED', 'NODES_ADDED', 'NODE_DELETED',
                    'EDGE_ADDED', 'EDGE_DELETED', 'EDGE_RECONNECTED',
                    'NODE_DATA_CHANGED', 'NODE_POSITIONS_CHANGED',
                ].includes(event.type)
            ) {
                save();
            }
        });

        // 返回清理函数（可选）
        return () => {
            unsubscribe?.();
        };
    },
};