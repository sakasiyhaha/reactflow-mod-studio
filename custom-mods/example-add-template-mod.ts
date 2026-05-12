// custom-mods/example-add-template-mod.ts
// 示例 Mod：演示如何添加自定义节点模板
// 初始化时调用 registerNodeTemplates 添加新节点类型
// 卸载时这里不做重置，以免影响其他可能依赖自定义模板的 Mod

import type { EditorMod } from '../src/bus/types';
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

// 自定义模板定义
const customTemplates: NodeTemplate[] = [
  {
    type: 'customConstant',
    title: '自定义常量',
    category: '自定义',
    icon: '🔧',
    color: '#FF6B6B',
    outputs: [{ id: 'output', label: '输出', type: 'number', position: 'right' }],
    defaultData: { value: 999, label: '常量' },
    properties: {
      value: { type: 'number', default: 999 },
      label: { type: 'string', default: '常量' },
    },
  },
  {
    type: 'customDisplay',
    title: '自定义显示器',
    category: '自定义',
    icon: '📟',
    color: '#4ECDC4',
    inputs: [{ id: 'input', label: '输入', type: '*', position: 'left' }],
    defaultData: { value: 0, label: '显示器' },
    properties: {
      value: { type: 'number', default: 0 },
      label: { type: 'string', default: '显示器' },
    },
  },
];

export const exampleAddTemplateMod: EditorMod = {
  id: 'example-add-template',
  init() {
    // 注册模板
    registerNodeTemplates(customTemplates);
    console.log('[example-add-template] 已注册自定义节点模板 (customConstant, customDisplay)');

    // 清理函数留空，或可选择在卸载时重置模板（但一般不应由单个 Mod 决定重置）
    return () => {
      console.log('[example-add-template] Mod 卸载，自定义模板可能仍在列表中');
    };
  },
};