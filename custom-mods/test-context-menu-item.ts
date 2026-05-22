import type { EditorMod, EditorBus } from '../src/bus/types';

export const testContextMenuItemMod: EditorMod = {
  id: 'test-context-menu-item',
  init(bus: EditorBus) {
    import('../src/registry/contextMenuRegistry').then(({ registerPaneMenuItem }) => {
      registerPaneMenuItem({
        id: 'test-count-nodes',
        label: '📊 统计节点数量',
        action: (b) => {
          const count = b.getState().nodes.length;
          alert(`当前画布共有 ${count} 个节点`);
        },
        order: 10,
      });
      console.log('[test-context-menu-item] 已添加“统计节点数量”菜单项');
    });
    return () => {};
  },
};