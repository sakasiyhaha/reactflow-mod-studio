// custom-mods/example-replace-template-mod.ts
// 示例 Mod：演示如何完全替换内置节点模板（覆盖默认节点）
// 使用 setBuiltInTemplates 设置新的内置模板列表，再添加自定义模板

import type { EditorMod } from '../src/bus/types';
import { setBuiltInTemplates, registerNodeTemplates, resetBuiltInTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

// 全新的内置模板集合（覆盖原有默认节点）
const replacementBuiltIn: NodeTemplate[] = [
  {
    type: 'myInput',
    title: '我的输入',
    category: '自定义',
    icon: '📥',
    color: '#8E44AD',
    outputs: [{ id: 'out', label: '数据', type: 'number', position: 'right' }],
    defaultData: { value: 0, label: '输入' },
    properties: {
      value: { type: 'number', default: 0 },
      label: { type: 'string', default: '输入' },
    },
  },
  {
    type: 'myOutput',
    title: '我的输出',
    category: '自定义',
    icon: '📤',
    color: '#1ABC9C',
    inputs: [{ id: 'in', label: '数据', type: 'number', position: 'left' }],
    defaultData: { value: 0, label: '输出' },
    properties: {
      value: { type: 'number', default: 0 },
      label: { type: 'string', default: '输出' },
    },
  },
];

export const exampleReplaceTemplateMod: EditorMod = {
  id: 'example-replace-template',
  init() {
    // 先替换内置模板
    setBuiltInTemplates(replacementBuiltIn);
    console.log('[example-replace-template] 已替换内置模板，节点库中只剩下 myInput 和 myOutput');

    // 清理函数：恢复为默认内置模板
    return () => {
      resetBuiltInTemplates();
      console.log('[example-replace-template] 已恢复默认内置模板');
    };
  },
};