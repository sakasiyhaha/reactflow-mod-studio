# 节点模板与端口 API 指南

本文档详细说明节点模板（`NodeTemplate`）的输入 / 输出端口定义方式、如何通过注册中心动态添加或修改模板、端口在组件中的渲染逻辑，以及连接校验和反向连接菜单的工作原理。

**最新更新**：动态端口（Dynamic Ports）、资源外部化（`_resources`）、端口偏移可调、自定义端口类型规则。

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

## 3. 动态端口（Dynamic Ports）

允许节点根据自身数据动态增减输入/输出端口，适用于条件分支、可变参数等场景。

### 定义动态端口

在模板中添加 `dynamicPorts` 和可选的 `dynamicPortsDeps`：

```typescript
{
    type: 'dynamicOutput',
    title: '动态输出',
    category: '演示',
    icon: '🔌',
    color: '#8B5CF6',
    inputs: [],
    outputs: [ /* 静态输出 */ ],
    defaultData: { enableExtra: false },
    inlineControls: [
        { key: 'enableExtra', type: 'boolean-toggle', label: '启用额外输出' }
    ],
    dynamicPorts: (data) => {
        if (data.enableExtra) {
            return {
                outputs: [{ id: 'extra_out', label: '额外输出', type: 'number', position: 'right' }]
            };
        }
        return {};
    },
    dynamicPortsDeps: (data) => ['enableExtra']  // 仅当 enableExtra 变化时重新计算
}
```

### 注意事项

- 动态端口与静态端口合并（`[...staticInputs, ...dynamicInputs]`）。若 `id` 冲突，动态端口会覆盖静态端口。
- `dynamicPortsDeps` 若不提供，默认使用 `Object.keys(data)` 作为依赖（监听所有顶层字段），可能导致性能问题。建议精确声明。
- 开发环境下，端口变化时会打印日志，便于调试。
- 动态端口变化时，组件会自动调用 `updateNodeInternals` 刷新 React Flow 布局。

---

## 4. 资源外部化与 `_resources` 字段

当节点需要引用外部资源（如纹理图片、音频文件、模型数据）时，应通过 `ResourceStore` 管理资源，并在节点数据中存储资源 ID 列表，而不是将资源数据直接存储在节点中。

### 在模板中声明资源引用

节点数据中的 `_resources` 字段用于存储资源 ID 列表（字符串数组）。可以在 `defaultData` 中初始化为空数组：

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

## 5. 端口偏移配置（动态可调）

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

## 6. 自定义端口类型连接规则

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

## 7. 内联控件（Inline Controls）

模板中可以定义 `inlineControls` 数组，用于在节点内部直接渲染可交互控件（步进器、开关、下拉选择），无需打开属性面板。

```typescript
inlineControls: [
    { key: 'value', type: 'number-stepper', label: '数值', min: -100, max: 100, step: 1 },
    { key: 'enable', type: 'boolean-toggle', label: '启用', default: true },
    { key: 'mode', type: 'select-dropdown', label: '模式', options: ['A+B', 'A-B'], default: 'A+B' }
]
```

每个控件对应节点数据中的一个字段（`key`），修改时自动派发 `NODE_DATA_CHANGED` 事件。

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

## 8. 端口样式高级定制

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

## 9. 节点尺寸与端口位置自适应

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

## 10. 完整示例：动态端口节点（从模板到注册）

**步骤 1：定义模板**

```typescript
// custom-mods/my-dynamic-node.ts
const myDynamicNode: NodeTemplate = {
    type: 'myDynamic',
    title: '动态端口示例',
    category: '演示',
    icon: '🔧',
    color: '#10B981',
    inputs: [{ id: 'in', label: '输入', type: 'number', position: 'left' }],
    outputs: [{ id: 'out', label: '主输出', type: 'number', position: 'right' }],
    defaultData: { extra: false },
    properties: { extra: { type: 'boolean', default: false } },
    inlineControls: [
        { key: 'extra', type: 'boolean-toggle', label: '启用额外输出' }
    ],
    dynamicPorts: (data) => {
        if (data.extra) {
            return {
                outputs: [{ id: 'extra_out', label: '额外输出', type: 'number', position: 'right' }]
            };
        }
        return {};
    },
    dynamicPortsDeps: (data) => ['extra']
};
```

**步骤 2：注册模板**

```typescript
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';

export const myDynamicNodeMod: EditorMod = {
    id: 'my-dynamic-node',
    init() {
        const unregister = registerNodeTemplates([myDynamicNode]);
        return unregister;
    }
};
```

**步骤 3：测试**
- 拖入节点，默认只有“主输出”。
- 点击内联开关“启用额外输出”，节点应动态增加“额外输出”端口，无卡死。

---

## 11. 常见问题

**Q: 动态端口导致节点频繁闪烁？**  
A: 检查 `dynamicPortsDeps` 是否声明了正确的依赖字段。若未声明，则每次 `data` 的任何变化都会重新计算端口。

**Q: 资源节点导出后导入不显示图片？**  
A: 导入后资源 ID 会变化，节点中的 `imageUrl` 可能仍是旧的 ObjectURL。解决方法：在 `afterImport` 钩子中遍历资源节点，使用新的资源 ID 重新生成 ObjectURL 并更新节点数据。

**Q: 端口偏移距离不起作用？**  
A: 确认是否通过 `bus.dispatch` 设置了 `--handle-offset-distance` 变量，且值有效（如 `12px`）。也可在 CSS 中直接覆盖。

**Q: 如何让节点支持动态增减输入端口？**  
A: 方法与输出端口相同，只需在 `dynamicPorts` 返回 `inputs` 数组即可。

---

## 12. 总结

- 节点端口的全部信息来自 `NodeTemplate` 的 `inputs` / `outputs` 及 `dynamicPorts`。
- 通过 `registerNodeTemplates` 可添加自定义模板，返回清理函数。
- `GenericNode` 自动渲染端口，支持静态+动态合并。
- 使用 `dynamicPortsDeps` 精确控制依赖，避免性能问题。
- 大容量资源通过 `ResourceStore` 管理，存储在 `_resources` 中。
- 端口偏移距离可通过 CSS 变量动态调整。
- 自定义端口类型需注册连接规则。

更多信息可参阅 `src/nodeTemplates.ts`（类型定义）、`src/registry/nodeTemplateRegistry.ts`（注册中心）以及 `CUSTOM_MODS.md`（Mod 开发指南）。