// custom-mods/test-override-history.ts
import type { EditorMod, EditorBus } from '../src/bus/types';

export const testOverrideHistoryMod: EditorMod = {
  id: 'history',  // 与内置历史记录 Mod 相同 ID
  init(bus: EditorBus) {
    console.log('%c[TEST] 自定义历史记录 Mod 已启动，覆盖了内置版本', 'color: #ff6b6b; font-weight: bold');

    // 简单示例：监听撤销/重做事件，输出自定义日志
    const unsubscribe = bus.subscribe(({ event }) => {
      if (event.type === 'HISTORY_UNDO') {
        console.log('[TEST] 自定义历史记录：执行撤销（覆盖版本）');
      } else if (event.type === 'HISTORY_REDO') {
        console.log('[TEST] 自定义历史记录：执行重做（覆盖版本）');
      }
    });

    // 返回清理函数（可选）
    return () => {
      unsubscribe();
      console.log('[TEST] 自定义历史记录 Mod 已卸载');
    };
  },
};