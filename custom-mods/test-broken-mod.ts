// custom-mods/test-broken-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';

export const testBrokenMod: EditorMod = {
  id: 'history',   // 与内置历史记录 Mod 相同 ID，意图覆盖
  init(bus: EditorBus) {
    console.log('[test-broken] 自定义历史记录 Mod 开始初始化...');
    // 故意抛出错误，模拟初始化失败
    throw new Error('模拟初始化失败：测试防御降级机制');
  },
};