// custom-mods/confirm-delete-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { registerNodeMenuItem } from '../src/registry/contextMenuRegistry';
import { dispatchConfirmable } from '../src/bus/confirmable';

export const confirmDeleteMod: EditorMod = {
    id: 'confirm-delete',
    init(bus: EditorBus) {
        const unregister = registerNodeMenuItem({
            id: 'safe-delete',
            label: '⚠️ 安全删除',
            icon: '🗑️',
            condition: (state, nodeId) => nodeId !== null,
            action: async (b, nodeId) => {
                if (!nodeId) return;
                const node = b.getState().nodes.find(n => n.id === nodeId);
                const nodeName = node?.data?.label || node?.type || '节点';
                try {
                    await dispatchConfirmable(
                        b,
                        { type: 'NODE_DELETED', nodeIds: [nodeId] },
                        `确定要删除“${nodeName}”吗？`
                    );
                    console.log(`[confirm-delete] 已删除节点 ${nodeId}`);
                } catch {
                    console.log('[confirm-delete] 用户取消删除');
                }
            },
            order: 5,
        });
        return unregister;
    }
};