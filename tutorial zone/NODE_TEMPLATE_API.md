# 节点模板与端口 API 指南

本文档详细说明节点模板（`NodeTemplate`）的输入 / 输出端口定义方式、如何通过注册中心动态添加或修改模板、端口在组件中的渲染逻辑，以及连接校验和反向连接菜单的工作原理。

---

## 1. 端口数据结构

所有端口（输入 / 输出）均使用 `PortDefinition` 接口描述：

```typescript
// src/nodeTemplates.ts
export interface PortDefinition {
    id: string;          // 端口唯一标识（如 'input', 'a', 'execIn'）
    label: string;       // 端口的鼠标悬浮提示文字
    type: PortType;      // 数据类型：'number' | 'boolean' | 'exec' | '*'
    position: string;    // 端口位置：'left' | 'right' | 'top' | 'bottom'
    style?: Record<string, unknown>; // 可选的自定义样式
}

export type PortType = 'number' | 'boolean' | 'exec' | '*';
```

- `type` 决定了该端口能连接哪些其他端口（参见 `connectionRules.ts`）。  
- `'*'` 为通配符，表示可接受 / 输出任意类型。

---

## 2. 在模板中定义端口

每个 `NodeTemplate` 可以包含 `inputs`（输入）和 `outputs`（输出），也可以使用兼容的 `handles` 字段（`handles.targets` 与 `handles.sources`）。推荐直接使用 `inputs` / `outputs`。

**示例：带有两个数字输入和一个数字输出的加法器**

```typescript
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
    outputs: [
        { id: 'sum', label: '和', position: 'right', type: 'number' }
    ],
    defaultData: { value: 0, label: '加法器' },
    properties: { value: { type: 'number', default: 0 } }
}
```

**字段说明**：
- `inputs` / `outputs` 均为 `PortDefinition` 数组。
- 端口位置 `position` 支持 `'left'`, `'right'`, `'top'`, `'bottom'`（将渲染在节点的对应边缘）。
- `type` 决定连接兼容性。

---

## 3. 动态注册自定义模板

通过 `src/registry/nodeTemplateRegistry.ts` 提供的 API，你可以在 Mod 中动态添加或替换节点模板。

### 3.1 注册新模板（不影响内置模板）

```typescript
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';

registerNodeTemplates([
    {
        type: 'customConstant',
        title: '自定义常量',
        category: '自定义',
        icon: '🔧',
        color: '#FF6B6B',
        outputs: [{ id: 'output', label: '输出', type: 'number', position: 'right' }],
        defaultData: { value: 999, label: '常量' },
        properties: { value: { type: 'number', default: 999 }, label: { type: 'string', default: '常量' } }
    }
]);
```

### 3.2 完全替换内置模板

```typescript
import { setBuiltInTemplates, resetBuiltInTemplates } from '../src/registry/nodeTemplateRegistry';

// 替换内置模板
setBuiltInTemplates([
    {
        type: 'myInput',
        title: '我的输入',
        category: '自定义',
        icon: '📥',
        color: '#8E44AD',
        outputs: [{ id: 'out', label: '数据', type: 'number', position: 'right' }],
        defaultData: { value: 0, label: '输入' },
        properties: { value: { type: 'number', default: 0 } }
    }
]);

// 在 Mod 卸载时恢复默认内置模板
return () => {
    resetBuiltInTemplates();
};
```

---

## 4. 端口在组件中的渲染

所有节点都使用通用组件 `GenericNode`（`src/components/GenericNode.tsx`）渲染。它会遍历模板的输入 / 输出端口，生成对应的 React Flow `Handle`。

**输入端口渲染片段**：

```typescript
const targets = template.handles?.targets ?? template.inputs ?? [];
targets.map((t, idx) => (
    <Handle
        key={`target-${t.id}`}
        type="target"             // React Flow 中 target 表示输入
        position={Position.Left}  // 默认左侧，也会根据 positionMap 匹配
        id={t.id}                 // 端口 ID，连线时需要
        style={{ background: color, ...t.style }}
        title={t.label}           // 悬浮提示
    />
))
```

**输出端口同理**，将 `type` 设为 `"source"`，并根据端口位置动态分配到对应边缘。

节点还会自动根据端口数量计算最小高度 / 宽度，避免端口重叠。

---

## 5. 连接校验中的端口类型获取

在 `src/mods/mod-reconnect.ts` 中，`getPortType` 函数根据端口 ID 和方向获取端口数据类型，用于校验连接是否合法。

```typescript
function getPortType(nodes, nodeId, handleId, handleKind): string | null {
    const node = nodes.find(n => n.id === nodeId);
    const template = getAllTemplates().find(t => t.type === node.type);
    const ports = handleKind === 'source'
        ? (template.handles?.sources ?? template.outputs ?? [])
        : (template.handles?.targets ?? template.inputs ?? []);
    const port = ports.find(p => p.id === handleId);
    return port?.type ?? null;   // 返回端口数据类型，用于规则匹配
}
```

结合 `connectionRules.ts` 中的兼容表判断连接是否允许。

---

## 6. 从输入端口拖线（反向连接）

当你从输入端口拖线到空白区域时，系统会弹出反向连接菜单，帮助你快速创建能连接到该输入端口的节点。

在 `src/hooks/useConnectionEndHandler.ts` 中：

```typescript
const targetPort = sourceTemplate.inputs?.find(i => i.id === fromHandle.id);
if (targetPort?.type) {
    const available = targetPort.type === '*'
        ? getAllTemplates().filter(t => t.outputs?.length > 0)
        : getAllTemplates().filter(t =>
            t.outputs?.some(o => o.type === targetPort.type || o.type === '*')
        );
    // 显示方向为 'reverse' 的菜单，选择后创建新节点并自动连线
}
```

这样，新节点将作为数据源，其输出端口连向拖拽的输入端口，实现快速搭建工作流。

---

## 7. 完整示例：自定义节点模板 Mod

将以下代码保存为 `custom-mods/my-custom-nodes.ts`，并在 `custom-mods/index.ts` 中注册，即可添加一个具有自定义输入/输出端口的节点。

```typescript
import type { EditorMod } from '../src/bus/types';
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

const myTemplates: NodeTemplate[] = [
    {
        type: 'myProcessor',
        title: '我的处理器',
        category: '自定义',
        icon: '⚙️',
        color: '#2C3E50',
        inputs: [
            { id: 'dataIn', label: '数据输入', type: 'number', position: 'left' },
            { id: 'control', label: '控制信号', type: 'boolean', position: 'top' }
        ],
        outputs: [
            { id: 'result', label: '处理结果', type: 'number', position: 'right' },
            { id: 'status', label: '状态码', type: 'number', position: 'right' }
        ],
        defaultData: { value: 0, label: '处理器' },
        properties: {
            value: { type: 'number', default: 0 },
            label: { type: 'string', default: '处理器' }
        }
    }
];

export const myCustomNodeMod: EditorMod = {
    id: 'my-custom-node',
    init() {
        registerNodeTemplates(myTemplates);
        return () => {};
    }
};
```

注册后，左侧节点库“自定义”分类下会出现**我的处理器**节点，它有两个输入端口和两个输出端口，可以在画布上正常连接、移动、编辑属性。

---

## 8. 总结

- 节点端口的全部信息均来自 `NodeTemplate` 的 `inputs` / `outputs` 或 `handles` 字段。
- 通过 `registerNodeTemplates` 可轻松添加自定义端口配置。
- `GenericNode` 会自动渲染这些端口，无需修改渲染代码。
- 连接校验和反向连接菜单均依赖端口类型进行过滤。
- 充分利用 `'*'` 通配符可以创建灵活的通用端口。

> 更多信息可参阅 `src/nodeTemplates.ts`（类型定义）、`src/registry/nodeTemplateRegistry.ts`（注册中心）以及 `CUSTOM_MODS.md`（Mod 开发指南）。。