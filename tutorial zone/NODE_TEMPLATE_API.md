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

export type PortType = BuiltInPortType | string;  // 支持任意自定义类型
export type BuiltInPortType = 'number' | 'boolean' | 'exec' | '*';
```

- `type` 决定了该端口能连接哪些其他端口（参见 `connectionRules.ts`）。  
- `'*'` 为通配符，表示可接受 / 输出任意类型。
- 你可以使用任何字符串作为自定义类型（如 `'item_ref'`、`'entity'`），并通过连接规则注册中心定义兼容性。

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

## 3. 资源外部化与 `_resources` 字段

当节点需要引用外部资源（如纹理图片、音频文件、模型数据）时，应通过 `ResourceStore` 管理资源，并在节点数据中存储资源 ID 列表，而不是将资源数据直接存储在节点中。

### 在模板中声明资源引用

节点数据中的 `_resources` 字段用于存储资源 ID 列表（字符串数组）。你可以在模板的 `defaultData` 中初始化为空数组：

```typescript
{
    type: 'imageNode',
    title: '图片节点',
    category: '媒体',
    icon: '🖼️',
    color: '#48BB78',
    defaultData: {
        _resources: [],      // 资源 ID 列表
        url: '',
        label: '图片'
    },
    properties: {
        url: { type: 'string', default: '' },
        label: { type: 'string', default: '图片' }
    }
}
```

### 在 Mod 中使用资源

```typescript
import { ResourceStore } from '../src/store/ResourceStore';

// 注册资源
const blob = await fetch(imageUrl).then(r => r.blob());
const resourceId = ResourceStore.register(blob);

// 创建节点时关联资源
const newNode = createNode('imageNode', position);
newNode.data._resources = [resourceId];
newNode.data.url = URL.createObjectURL(ResourceStore.get(resourceId));
```

**注意**：
- 复制/粘贴节点时，编辑器会自动增加资源的引用计数（`retain`）。
- 删除节点时，编辑器会自动减少资源的引用计数（`release`），引用计数归零时资源会被自动释放。
- 工作流导入/导出时，资源会自动序列化为 base64 并恢复，无需额外处理。

---

## 4. 动态端口（根据节点数据动态增减端口）

模板中可以定义 `dynamicPorts` 函数，根据节点数据动态生成端口列表。这对于条件分支、可变参数等场景非常有用。

### 定义动态端口

```typescript
{
    type: 'if',
    title: '条件分支',
    category: '逻辑',
    icon: '🔀',
    color: '#9C89B8',
    inputs: [
        { id: 'cond', label: '条件', type: 'boolean', position: 'left' }
    ],
    outputs: [], // 静态端口为空，动态提供
    defaultData: { condition: false },
    properties: { condition: { type: 'boolean', default: false } },
    inlineControls: [
        { key: 'condition', type: 'boolean-toggle', label: '条件' }
    ],
    dynamicPorts: (data) => ({
        outputs: [
            { id: 'true', label: 'True', type: 'exec', position: 'right' },
            { id: 'false', label: 'False', type: 'exec', position: 'right' }
        ]
    })
}
```

### 动态端口与静态端口合并

`dynamicPorts` 返回的端口会与模板中静态定义的 `inputs`/`outputs` 合并。如果动态端口返回的端口 ID 与静态端口冲突，静态端口会被覆盖（不推荐）。

### 注意事项

- `dynamicPorts` 函数会在节点数据变化时重新调用，因此应避免在其中执行昂贵计算。
- 端口数量变化时，React Flow 会自动重新计算节点布局。
- 动态端口目前需要谨慎使用（避免无限循环），建议只依赖节点数据中的关键字段变化来触发端口更新。

---

## 5. 端口在组件中的渲染

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
        style={{
            background: portColor,
            ...(t.style ?? {}),
            ...handleStyle,       // 动态样式（偏移、位置百分比等）
        }}
        data-tooltip={tooltipText}
    />
))
```

**输出端口同理**，将 `type` 设为 `"source"`，并根据端口位置动态分配到对应边缘。

节点还会自动根据端口数量计算最小高度 / 宽度，确保所有端口都能均匀分布在对应边缘上。

---

## 6. 端口偏移配置（动态可调）

端口相对于节点边缘的偏移距离可通过 CSS 变量 `--handle-offset-distance` 动态调整。默认值为 `7px`，你可以通过派发 `SET_THEME_COLOR` 事件来修改：

```typescript
bus.dispatch({
    type: 'SET_THEME_COLOR',
    payload: { variable: '--handle-offset-distance', value: '12px' }
});
```

偏移方向：
- `top` 端口向上偏移（负 Y）
- `bottom` 端口向下偏移（正 Y）
- `left` 端口向左偏移（负 X）
- `right` 端口向右偏移（正 X）

偏移距离独立于缩放，保持视觉一致性。

---

## 7. 连接校验中的端口类型获取

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

## 8. 自定义端口类型连接规则

当你使用自定义端口类型（如 `item_ref`）时，需要通过注册中心告诉编辑器该类型可以连接哪些其他类型。

### 注册连接规则

```typescript
import { registerConnectionRule } from '../src/registry/connectionRuleRegistry';

registerConnectionRule('item_ref', ['item_ref', '*']);
```

注册后，`item_ref` 类型的端口可以连接到 `item_ref` 或任意类型（`*`）。

### 覆盖或移除规则

```typescript
import { setConnectionRule, removeConnectionRule } from '../src/registry/connectionRuleRegistry';

// 完全覆盖规则（只允许连接到自身）
setConnectionRule('item_ref', ['item_ref']);

// 移除特定目标类型
removeConnectionRule('item_ref', '*');
```

---

## 9. 从输入端口拖线（反向连接）

当你从输入端口拖线到空白区域时，系统会弹出反向连接菜单，帮助你快速创建能连接到该输入端口的节点。

在 `mod-connection-menu.ts` 中：

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

## 10. 内联控件（Inline Controls）

模板中可以定义 `inlineControls` 数组，用于在节点内部直接渲染可交互控件（步进器、开关、下拉选择），无需打开属性面板。

```typescript
inlineControls: [
    { key: 'value', type: 'number-stepper', label: '数值', min: -100, max: 100, step: 1 },
    { key: 'enable', type: 'boolean-toggle', label: '启用', default: true },
    { key: 'mode', type: 'select-dropdown', label: '模式', options: ['A+B', 'A-B'], default: 'A+B' }
]
```

每个控件对应节点数据中的一个字段（`key`），修改时自动派发 `NODE_DATA_CHANGED` 事件并传播 `value` 到下游（如果 `propagate` 未禁用）。

### 注册自定义控件类型

通过 `src/registry/controlComponentRegistry.ts` 可以注册新的控件类型，例如滑块、颜色选择器等：

```typescript
import { registerControlType } from '../src/registry/controlComponentRegistry';
import type { ControlComponentProps } from '../src/registry/controlComponentRegistry';

const Slider: React.FC<ControlComponentProps> = ({ value, onChange, min, max }) => (
    <input
        type="range"
        min={min ?? 0}
        max={max ?? 100}
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
    />
);

registerControlType('slider', Slider);
```

之后即可在模板中使用 `{ key: 'volume', type: 'slider', label: '音量', min: 0, max: 100 }`。

---

## 11. 端口样式高级定制

每个端口可以单独设置 `style` 字段（CSS 样式对象）。例如，改变特定端口的颜色或形状：

```typescript
inputs: [
    {
        id: 'control',
        label: '控制',
        type: 'boolean',
        position: 'left',
        style: { background: '#ff9900', borderRadius: '2px' }
    }
]
```

注意：`style` 会与默认样式合并，优先级高于默认样式。

---

## 12. 节点尺寸与端口位置自适应

节点会测量自身的实际宽高（通过 `measured` 属性），并根据端口数量动态调整最小高度/宽度，确保所有端口都能均匀分布在对应边缘上。这一逻辑在 `GenericNode.tsx` 中实现：

```typescript
const maxVerticalHandles = Math.max(
    leftSidePortsCount,
    rightSidePortsCount
);
const minHeight = maxVerticalHandles > 1 ? maxVerticalHandles * 28 + 40 : undefined;
```

你可以通过在模板中指定 `defaultWidth` 和 `defaultHeight` 来建议节点的初始大小，这些值会存储在节点 `data.__templateDefaultWidth` 中，供对齐和布局算法使用。

---

## 13. 完整示例：自定义节点模板 Mod

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
        const unregister = registerNodeTemplates(myTemplates);
        // 可选：返回清理函数，在 Mod 卸载时移除自定义模板
        return unregister;
    }
};
```

注册后，左侧节点库“自定义”分类下会出现**我的处理器**节点，它有两个输入端口和两个输出端口，可以在画布上正常连接、移动、编辑属性。

---

## 14. 总结

- 节点端口的全部信息均来自 `NodeTemplate` 的 `inputs` / `outputs` 或 `handles` 字段。
- 通过 `registerNodeTemplates` 可轻松添加自定义端口配置，该函数返回清理函数，便于 Mod 卸载时移除模板。
- `GenericNode` 会自动渲染这些端口，无需修改渲染代码。
- 连接校验和反向连接菜单均依赖端口类型进行过滤。
- 充分利用 `'*'` 通配符可以创建灵活的通用端口。
- 内联控件提供了更便捷的交互方式，且支持扩展新控件类型。
- 端口偏移距离可通过 CSS 变量动态调整，实现主题自定义。
- 大容量资源应通过 `ResourceStore` 管理，存储在节点 `_resources` 字段中。
- 动态端口可根据节点数据动态增减端口，实现条件分支等高级功能。

> 更多信息可参阅 `src/nodeTemplates.ts`（类型定义）、`src/registry/nodeTemplateRegistry.ts`（注册中心）以及 `CUSTOM_MODS.md`（Mod 开发指南）。
```