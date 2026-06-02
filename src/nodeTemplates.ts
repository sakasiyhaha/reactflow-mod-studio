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

    /**
     * 动态端口生成函数
     * 根据节点数据动态返回额外的输入/输出端口。
     * 返回的端口会与静态端口（inputs/outputs）合并。
     * 注意：动态端口的 id 不应与静态端口重复，否则静态端口会被覆盖。
     */
    dynamicPorts?: (data: Record<string, unknown>) => {
        inputs?: PortDefinition[];
        outputs?: PortDefinition[];
    };

    /**
     * 动态端口依赖字段声明
     * 返回一个字符串数组，表示哪些数据字段的变化会触发动态端口的重新计算。
     * 若不提供，默认使用 Object.keys(data) 作为依赖（监听所有顶层字段变化）。
     * 优化性能：仅声明真正影响端口结构的字段，避免不必要的重算。
     */
    dynamicPortsDeps?: (data: Record<string, unknown>) => string[];
}

// 可选：提供一个类型守卫函数
export function isBuiltInPortType(type: string): type is BuiltInPortType {
    return ['number', 'boolean', 'exec', '*'].includes(type);
}