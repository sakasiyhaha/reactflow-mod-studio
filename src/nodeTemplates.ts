// src/nodeTemplates.ts
// 节点模板类型定义（纯类型文件）
// 实际的内置模板数据已移至 nodeTemplateRegistry.ts

export type BuiltInPortType = 'number' | 'boolean' | 'exec' | '*';
export type PortType = BuiltInPortType | string;  // 允许任意自定义类型

export interface PortDefinition {
    id: string;
    label: string;
    type: PortType;
    position: string;
    style?: Record<string, unknown>;
}

export interface InlineControl {
    key: string;
    type: 'number-stepper' | 'boolean-toggle' | 'select-dropdown';
    label: string;
    min?: number;
    max?: number;
    step?: number;
    default?: unknown;
    options?: string[];
}

export interface NodeTemplate {
    type: string;
    title: string;
    category: string;
    icon: string;
    color: string;
    styleClass?: string;
    inputs?: PortDefinition[];
    outputs?: PortDefinition[];
    handles?: {
        sources?: PortDefinition[];
        targets?: PortDefinition[];
    };
    defaultData: Record<string, unknown>;
    properties: Record<string, { type: string; default: unknown }>;
    inlineControls?: InlineControl[];
    defaultWidth?: number;
    defaultHeight?: number;
}

// 可选：提供一个类型守卫函数
export function isBuiltInPortType(type: string): type is BuiltInPortType {
    return ['number', 'boolean', 'exec', '*'].includes(type);
}