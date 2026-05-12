// src/nodeTemplates.ts
// 节点模板类型定义（纯类型文件）
// 实际的内置模板数据已移至 nodeTemplateRegistry.ts

export type PortType = 'number' | 'boolean' | 'exec' | '*';

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
}