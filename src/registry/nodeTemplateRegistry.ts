// src/registry/nodeTemplateRegistry.ts
// 节点模板注册中心 —— 管理内置和自定义节点模板
// 支持覆盖内置模板（如通过 Mod 完全替换节点库）

import type { NodeTemplate } from '../nodeTemplates';

// 内置模板原始数据（私有，外部不可见，但可通过 setBuiltInTemplates 修改）
let builtInTemplates: NodeTemplate[] = [
    {
        type: 'numberInput',
        title: '数值输入',
        category: '通用',
        icon: '🔢',
        color: 'var(--primary)',
        styleClass: 'node-input',
        outputs: [{ id: 'output', label: '输出', type: 'number', position: 'right' }],
        defaultData: { value: 42, label: '数值输入' },
        properties: {
            value: { type: 'number', default: 42 },
            label: { type: 'string', default: '数值输入' },
        },
        inlineControls: [
            { key: 'value', type: 'number-stepper', label: '数值', min: -100, max: 100, step: 1 },
            { key: 'enable', type: 'boolean-toggle', label: '启用', default: true },
        ],
    },
    {
        type: 'displayOutput',
        title: '显示输出',
        category: '通用',
        icon: '📺',
        color: 'var(--secondary)',
        styleClass: 'node-output',
        inputs: [{ id: 'input', label: '输入', type: '*', position: 'left' }],
        defaultData: { value: 0, label: '显示输出' },
        properties: { value: { type: 'number', default: 0 }, label: { type: 'string', default: '显示输出' } },
    },
    {
        type: 'adder',
        title: '加法器',
        category: '运算',
        icon: '➕',
        color: '#E63946',
        inputs: [
            { id: 'a', label: 'A', position: 'left', type: 'number' },
            { id: 'b', label: 'B', position: 'left', type: 'number' }
        ],
        outputs: [{ id: 'sum', label: '和', position: 'right', type: 'number' }],
        defaultData: { value: 0, label: '加法器' },
        properties: { value: { type: 'number', default: 0 } },
        inlineControls: [
            { key: 'mode', type: 'select-dropdown', label: '模式', options: ['A+B', 'A-B'], default: 'A+B' },
            { key: 'value', type: 'number-stepper', label: '初始', min: 0, max: 100, step: 5 },
        ],
    },
    {
        type: 'tripleAdder',
        title: '三数加法器',
        category: '运算',
        icon: '🧮',
        color: '#E76F51',
        inputs: [
            { id: 'a', label: 'A', position: 'left', type: 'number' },
            { id: 'b', label: 'B', position: 'left', type: 'number' },
            { id: 'c', label: 'C', position: 'left', type: 'number' }
        ],
        outputs: [{ id: 'sum', label: '和', position: 'right', type: 'number' }],
        defaultData: { value: 0, label: '三数加法器' },
        properties: { value: { type: 'number', default: 0 } }
    },
    {
        type: 'splitter',
        title: '数值分流器',
        category: '数据',
        icon: '🔀',
        color: '#F4A261',
        inputs: [{ id: 'input', label: '输入', position: 'left', type: 'number' }],
        outputs: [
            { id: 'out1', label: '分支1', position: 'right', type: 'number' },
            { id: 'out2', label: '分支2', position: 'right', type: 'number' }
        ],
        defaultData: { value: 0, label: '分流器' },
        properties: { value: { type: 'number', default: 0 } }
    },
    {
        type: 'dualOutput',
        title: '双输出常量',
        category: '常量',
        icon: '📌',
        color: '#2A9D8F',
        outputs: [
            { id: 'out1', label: '输出A', position: 'right', type: 'number' },
            { id: 'out2', label: '输出B', position: 'right', type: 'number' }
        ],
        defaultData: { value: 100, label: '双输出' },
        properties: { value: { type: 'number', default: 100 } }
    },
    {
        type: 'mux2',
        title: '二选一开关',
        category: '逻辑',
        icon: '🎚️',
        color: '#9C89B8',
        inputs: [
            { id: 'sel', label: '选择', position: 'top', type: 'boolean' },
            { id: 'in0', label: '输入0', position: 'left', type: 'number' },
            { id: 'in1', label: '输入1', position: 'left', type: 'number' }
        ],
        outputs: [{ id: 'out', label: '输出', position: 'right', type: 'number' }],
        defaultData: { value: 0, label: '开关' },
        properties: { value: { type: 'number', default: 0 } }
    },
    {
        type: 'compare',
        title: '比较器',
        category: '逻辑',
        icon: '⚖️',
        color: '#B5838D',
        inputs: [
            { id: 'a', label: 'A', position: 'left', type: 'number' },
            { id: 'b', label: 'B', position: 'left', type: 'number' }
        ],
        outputs: [
            { id: 'greater', label: 'A>B', position: 'right', type: 'boolean' },
            { id: 'equal', label: 'A=B', position: 'right', type: 'boolean' },
            { id: 'less', label: 'A<B', position: 'right', type: 'boolean' }
        ],
        defaultData: { value: 0, label: '比较器' },
        properties: { value: { type: 'number', default: 0 } }
    },
    {
        type: 'sequence',
        title: '序列节点',
        category: '控制流',
        icon: '▶️',
        color: '#6D597A',
        inputs: [{ id: 'execIn', label: '执行输入', position: 'top', type: 'exec' }],
        outputs: [
            { id: 'execOut1', label: '下一步1', position: 'bottom', type: 'exec' },
            { id: 'execOut2', label: '下一步2', position: 'bottom', type: 'exec' }
        ],
        defaultData: { label: '序列' },
        properties: { label: { type: 'string', default: '序列' } }
    }
];

// 自定义模板数组，初始为空
let customTemplates: NodeTemplate[] = [];

/**
 * 获取当前所有可用的节点模板（内置 + 自定义）
 * 自定义模板的 type 若与内置重复，则覆盖内置模板
 */
export function getAllTemplates(): NodeTemplate[] {
  const customTypeSet = new Set(customTemplates.map(t => t.type));
  const filteredBuiltIn = builtInTemplates.filter(t => !customTypeSet.has(t.type));
  return [...filteredBuiltIn, ...customTemplates];
}

/**
 * 注册一个或多个自定义节点模板（自动去重）
 */
export function registerNodeTemplates(templates: NodeTemplate[]): void {
  const existingTypes = new Set(customTemplates.map(t => t.type));
  const newTemplates = templates.filter(t => !existingTypes.has(t.type));
  if (newTemplates.length > 0) {
    customTemplates.push(...newTemplates);
    console.log(`[templateRegistry] 注册了 ${newTemplates.length} 个自定义模板`);
  } else {
    console.log('[templateRegistry] 没有新的自定义模板需要注册（可能已被注册）');
  }
}

/**
 * 重置自定义模板列表，恢复到仅内置模板
 */
export function resetTemplates(): void {
  customTemplates = [];
  console.log('[templateRegistry] 已重置为内置模板');
}

/**
 * 完全替换内置模板列表（覆盖默认节点）
 * 注意：这会移除所有原有的内置节点类型
 */
export function setBuiltInTemplates(templates: NodeTemplate[]): void {
  builtInTemplates = [...templates];
  console.log(`[templateRegistry] 已替换内置模板，当前内置节点数: ${builtInTemplates.length}`);
}

/**
 * 恢复内置模板为原始默认值
 */
export function resetBuiltInTemplates(): void {
  // 原始默认值直接硬编码恢复，但为了方便，我们可以调用 setBuiltInTemplates 传入原始数据
  // 由于原始数据在文件顶部定义，我们将初始默认值另存一份。
  builtInTemplates = [...DEFAULT_BUILT_IN];
  console.log('[templateRegistry] 已恢复内置模板为默认值');
}

// 保存默认内置模板快照（用于重置）
const DEFAULT_BUILT_IN: NodeTemplate[] = builtInTemplates.map(t => ({...t}));