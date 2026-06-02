// custom-mods/logger-node-mod.ts
import type { EditorMod } from '../src/bus/types';
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

const loggerNodeTemplate: NodeTemplate = {
    type: 'logger',
    title: '日志记录器',
    category: '调试工具',
    icon: '📝',
    color: '#F59E0B',
    inputs: [{ id: 'input', label: '输入', type: '*', position: 'left' }],
    outputs: [{ id: 'output', label: '输出', type: '*', position: 'right' }],
    defaultData: {
        prefix: '[LOG]',
        value: '',
        label: '日志记录器'
    },
    properties: {
        prefix: { type: 'string', default: '[LOG]' },
        value: { type: 'string', default: '' },
        label: { type: 'string', default: '日志记录器' }
    },
    inlineControls: [
        {
            key: 'prefix',
            type: 'select-dropdown',
            label: '前缀',
            options: ['[LOG]', '[INFO]', '[WARN]', '[ERROR]'],
            default: '[LOG]'
        }
    ]
};

export const loggerNodeMod: EditorMod = {
    id: 'logger-node',
    init() {
        const unregister = registerNodeTemplates([loggerNodeTemplate]);
        console.log('[logger-node] 已注册“日志记录器”节点');
        return unregister; // 卸载时自动移除模板
    }
};