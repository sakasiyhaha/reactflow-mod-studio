// custom-mods/test-guide-lines.ts
import type { EditorMod, EditorBus } from '../src/bus/types';

export const testGuideLinesMod: EditorMod = {
  id: 'test-guide-lines',
  init(bus: EditorBus) {
    // 示例：5秒后显示一条测试辅助线
    setTimeout(() => {
      bus.dispatch({
        type: 'RENDER_GUIDE_LINES',
        payload: {
          lines: [
            { x1: 100, y1: 200, x2: 500, y2: 200, color: '#ff6b6b' },
            { x1: 300, y1: 100, x2: 300, y2: 400, color: '#4d9eff' },
          ],
        },
      });
    }, 2000);
    setTimeout(() => {
      bus.dispatch({ type: 'CLEAR_GUIDE_LINES' });
    }, 5000);
    return () => {};
  },
};