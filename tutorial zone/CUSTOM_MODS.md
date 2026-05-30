# 自定义 Mod 开发指南

本编辑器采用事件总线 + Mod 插件架构。你可以编写自己的 Mod 来添加、覆盖或继承内置功能，完全不需要修改核心源代码。所有自定义 Mod 统一放在 `custom-mods/` 目录中，通过 `custom-mods/index.ts` 注册。

---

## 快速上手

### 1. 创建 Mod 文件

在 `custom-mods/` 目录下新建一个 `.ts` 文件，例如 `my-logger-mod.ts`：

```ts
import type { EditorMod } from '../src/bus/types';

export const myLoggerMod: EditorMod = {
    id: 'my-logger',  // 全局唯一标识
    init(bus) {
        // 订阅所有事件，输出到控制台
        const unsub = bus.subscribe(({ event, state }) => {
            console.log(`[my-logger] 事件: ${event.type}`, event);
        });
        // 返回清理函数，组件卸载时自动调用
        return () => unsub();
    },
};
```

### 2. 注册 Mod

编辑 `custom-mods/index.ts`，导入并添加你的 Mod：

```ts
import { myLoggerMod } from './my-logger-mod';
import type { EditorMod } from '../src/bus/types';

export const customMods: EditorMod[] = [
    myLoggerMod,   // 加入自定义Mod，可同时添加多个
];
```

保存文件，刷新浏览器即可生效。

---

## Mod 核心接口

每个 Mod 必须实现 `EditorMod` 接口：

```ts
export interface EditorMod {
    id: string;                                     // 全局唯一标识
    init: (bus: EditorBus) => (() => void) | void;  // 初始化，可返回清理函数
}
```

- **`id`**：建议使用有意义的英文标识，如 `'my-auto-save'`。如果要覆盖内置 Mod，必须使用与内置 Mod 相同的 `id`（例如 `'history'`、`'workflow-io'`）。
- **`init`**：接收 `EditorBus` 实例，可返回一个清理函数（用于移除事件监听、定时器等）。

---

## EditorBus 提供的 API

通过 `init(bus)` 中的 `bus` 对象，你可以：

- **`bus.getState()`** → 获取当前编辑器状态 `{ nodes, edges, selection, mode }`
- **`bus.dispatch(event)`** → 派发事件，触发状态变更或通知其他 Mod
- **`bus.subscribe(listener)`** → 订阅所有事件，返回取消订阅函数

---

## 常用事件类型

以下是最常用的事件（完整列表见 `src/bus/types.ts`）：

| 事件 | 说明 | 典型用途 |
|------|------|----------|
| `NODE_ADDED` | 添加节点 | 统计节点数量、自动保存 |
| `NODE_DELETED` | 删除节点 | 清理资源、记录日志 |
| `NODE_DATA_CHANGED` | 节点数据变更 | 同步外部系统、自动保存 |
| `EDGE_ADDED` / `EDGE_DELETED` | 边的增删 | 更新依赖图 |
| `SELECTION_CHANGED` | 选中变化 | 更新属性面板 |
| `WORKFLOW_LOADED` | 加载/重置工作流 | 重置历史、同步外部存储 |
| `HISTORY_UNDO` / `HISTORY_REDO` | 撤销/重做 | 自定义撤销行为 |
| `AUTO_LAYOUT` | 自动布局 | 触发自定义布局算法（支持传参） |
| `ALIGN_LEFT` / `ALIGN_RIGHT` … | 对齐操作 | 自定义对齐规则 |
| `BATCH_CONNECT_START` / `EXECUTE` / `CANCEL` | 批量连线 | 扩展批量连线逻辑 |
| `RECONNECT_START` / `END` | 重连开始/结束 | 抑制连接菜单 |
| `CONNECTION_MENU_OPEN` / `CLOSE` | 连接菜单开关 | 自定义菜单内容 |
| `FLOATING_SEARCH_OPEN` / `CLOSE` | 浮动搜索开关 | 自定义搜索行为 |
| `SET_VIEWPORT_LIMITS` | 动态调整画布缩放/平移范围 | 限制用户视图 |
| `SET_PAN_ON_DRAG` | 修改拖拽平移的鼠标按键 | 支持中键拖拽等 |
| `SET_BACKGROUND_STYLE` | 动态切换画布背景样式 | 主题切换 |
| `VIEWPORT_CHANGED` | 画布缩放/平移时触发 | 保存视口位置 |
| `RENDER_GUIDE_LINES` / `CLEAR_GUIDE_LINES` | 显示/清除对齐辅助线 | 拖拽节点时显示辅助线 |
| `SET_THEME_COLOR` / `SET_THEME_COLORS` | 动态修改主题颜色 | 亮色/暗色主题 |
| `ERROR_OCCURRED` | 发生错误 | 显示 Toast 提示 |

---

## 示例：自动保存 Mod

编辑器已提供示例 `custom-mods/example-auto-save-mod.ts`，将其注册即可工作：

```ts
import { exampleAutoSaveMod } from './example-auto-save-mod';

export const customMods: EditorMod[] = [
    exampleAutoSaveMod,
];
```

该 Mod 会在节点/边增删改、数据变化时防抖保存到 `localStorage`，并在页面关闭前强制保存。

---

## 覆盖内置 Mod

如果你想**完全替换**某个内置功能（比如用自定义历史记录替换默认历史记录），只需创建一个 Mod，`id` 与内置 Mod 相同即可。内置 Mod 的 `id` 列表如下：

| 内置 Mod | id |
|----------|-----|
| 历史记录 | `history` |
| 批量连线 | `batch-connect` |
| 对齐与自动布局 | `alignment` |
| 剪贴板 | `clipboard` |
| 重连管理 | `reconnect` |
| 项目配置 | `project-config` |
| 节点生命周期 | `node-lifecycle` |
| 连接菜单 | `connection-menu` |
| 画布右键菜单 | `canvas-context-menu` |
| 浮动搜索 | `floating-search` |
| 工作流导入导出 | `workflow-io` |
| 错误处理 | `error-handler` |
| 默认控件 | `default-controls` |
| 默认侧边栏按钮 | `default-sidebar-buttons` |
| 默认 UI | `default-ui` |

例如，覆盖历史记录：

```ts
export const myHistoryMod: EditorMod = {
    id: 'history',   // 相同的 id
    init(bus) {
        console.log('自定义历史记录已启动');
        // 你的实现...
        return () => {};
    },
};
```

注册后，你的 Mod 会完全取代内置版本，且不会被初始化失败影响（有防御降级机制，但建议确保健壮性）。

---

## 继承内置 Mod（增强）

某些内置 Mod 导出了可复用的工具函数，允许你在不改动原逻辑的基础上增加功能。例如：

- `mod-node-lifecycle` 导出 `createOnNodesChange`, `createOnEdgesChange`, `createOnConnect`, `createOnReconnect`。
- `mod-connection-menu` 导出 `createConnectionEndHandler`, `showConnectionMenu`, `hideConnectionMenu`。
- `mod-workflow-io` 导出 `setWorkflowIOHandlers` 用于替换导入/导出格式。
- `mod-reconnect` 导出 `isReconnecting` 和 `validateReconnectConnection`。

**继承示例**：在不修改内置连接菜单逻辑的前提下，增加日志记录。

```ts
import { createConnectionEndHandler, showConnectionMenu } from '../src/mods/mod-connection-menu';
import type { EditorMod } from '../src/bus/types';

export const loggingConnectionMenuMod: EditorMod = {
    id: 'connection-menu',   // 覆盖内置 id
    init(bus) {
        // 包装原始处理器
        const originalHandler = createConnectionEndHandler(bus);
        const wrappedHandler = (event: any, connectionState: any) => {
            console.log('[enhanced] 拖线结束，即将判断是否弹出菜单');
            originalHandler(event, connectionState);
        };
        // 替换 FlowCanvas 中的 onConnectEnd 需要修改 App.tsx，但更简单的方式是直接监听事件
        // 这里演示订阅 CONNECTION_MENU_OPEN 事件来增加日志
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'CONNECTION_MENU_OPEN') {
                console.log('[enhanced] 连接菜单已打开', event.payload);
            }
        });
        return () => unsub();
    },
};
```

注意：继承往往需要配合事件监听，而不是直接修改函数调用。

---

## 动态扩展画布行为

你可以通过派发事件来动态控制画布的视图、背景、辅助线和主题。

### 1. 动态调整视图限制

```typescript
bus.dispatch({
  type: 'SET_VIEWPORT_LIMITS',
  payload: { minZoom: 0.5, maxZoom: 2, translateExtent: [[-1000, -1000], [1000, 1000]] }
});
```

### 2. 切换画布背景

```typescript
bus.dispatch({
  type: 'SET_BACKGROUND_STYLE',
  payload: { variant: 'dots', gap: 30, size: 2, color: '#aaa' }
});
```

### 3. 显示对齐辅助线

在拖拽节点时，你可以计算辅助线并派发事件：

```typescript
// 假设 lines 是计算好的线条数组
bus.dispatch({ type: 'RENDER_GUIDE_LINES', payload: { lines } });
// 拖拽结束时清除
bus.dispatch({ type: 'CLEAR_GUIDE_LINES' });
```

### 4. 动态切换主题

```typescript
bus.dispatch({
  type: 'SET_THEME_COLORS',
  payload: {
    '--primary': '#ff6b6b',
    '--bg-canvas': '#1e1e2e',
  }
});
```

### 5. 修改端口偏移距离

```typescript
bus.dispatch({
    type: 'SET_THEME_COLOR',
    payload: { variable: '--handle-offset-distance', value: '12px' }
});
```

---

## UI 扩展注册中心

以下注册中心允许 Mod 动态扩展界面，无需修改核心组件。**所有注册函数均返回一个清理函数，在 Mod 卸载时调用可移除注册项**。

### 1. 项目设置面板配置项

使用 `src/registry/projectConfigRegistry.ts`：

```typescript
import { registerProjectConfigField } from '../src/registry/projectConfigRegistry';

const unregister = registerProjectConfigField({
  key: 'modId',
  label: '模组 ID',
  type: 'string',
  defaultValue: 'examplemod',
  validate: (val) => /^[a-z][a-z0-9_]*$/.test(val),
  order: 10,
});

// 在 Mod 清理时调用
unregister();
```

支持的类型：`'string'`, `'number'`, `'boolean'`, `'color'`, `'select'`。

### 2. 侧边栏组件和按钮

使用 `src/registry/sidebarRegistry.ts`：

```typescript
import { registerSidebarComponent, registerSidebarButton } from '../src/registry/sidebarRegistry';

// 注册组件区块
const unregisterComp = registerSidebarComponent({
  id: 'my-widget',
  order: 20,
  component: MyWidget,
});

// 注册按钮
const unregisterBtn = registerSidebarButton({
  id: 'export-image',
  label: '📸 导出图片',
  onClick: (bus) => {
    console.log('导出图片', bus.getState());
  },
  order: 10,
});

// 清理时调用
unregisterComp();
unregisterBtn();
```

### 3. 右键菜单项

使用 `src/registry/contextMenuRegistry.ts`：

```typescript
import { registerNodeMenuItem, registerPaneMenuItem } from '../src/registry/contextMenuRegistry';

// 节点右键菜单
const unregisterNode = registerNodeMenuItem({
  id: 'log-node',
  label: '📋 输出节点信息',
  action: (bus, nodeId) => {
    if (nodeId) console.log(bus.getState().nodes.find(n => n.id === nodeId));
  },
  condition: (state, nodeId) => true,
});

// 画布右键菜单
const unregisterPane = registerPaneMenuItem({
  id: 'clear-canvas',
  label: '🧹 清空画布',
  action: (bus) => {
    bus.dispatch({ type: 'NODE_DELETED', nodeIds: bus.getState().nodes.map(n => n.id) });
  },
});

unregisterNode();
unregisterPane();
```

### 4. 属性面板扩展槽

使用 `src/registry/propsPanelRegistry.ts`：

```tsx
import { registerPropsPanelExtension } from '../src/registry/propsPanelRegistry';
import React from 'react';

const MyExtension = ({ selectedNode, bus }) => {
  if (!selectedNode) return null;
  return <div>当前节点类型: {selectedNode.type}</div>;
};

const unregister = registerPropsPanelExtension({
  id: 'my-extension',
  slot: 'top',   // 或 'bottom'
  component: MyExtension,
  condition: (node) => node !== null,
});
```

### 5. 浮动搜索过滤器

使用 `src/utils/searchExtensions.ts`：

```typescript
import { registerSearchFilter } from '../src/utils/searchExtensions';

const unregister = registerSearchFilter((templates, query) => {
  // 将“最近使用”的节点置顶（示例）
  if (!query.trim()) {
    const recent = ['numberInput', 'adder'];
    const recentNodes = recent.map(type => templates.find(t => t.type === type)).filter(Boolean);
    const others = templates.filter(t => !recent.includes(t.type));
    return [...recentNodes, ...others];
  }
  return templates;
});

// 清理
unregister();
```

### 6. 边类型注册中心

使用 `src/registry/edgeTemplateRegistry.ts`：

```typescript
import { registerEdgeType } from '../src/registry/edgeTemplateRegistry';
import type { EdgeProps } from '@xyflow/react';

const DashedEdge = (props: EdgeProps) => (
  <path className="react-flow__edge-path" strokeDasharray="6,4" {...props} />
);

registerEdgeType('dashed', DashedEdge);
```

之后在添加边时，指定 `type: 'dashed'` 即可使用该边样式。

### 7. 内联控件类型注册中心

使用 `src/registry/controlComponentRegistry.ts`：

```typescript
import { registerControlType } from '../src/registry/controlComponentRegistry';
import type { ControlComponentProps } from '../src/registry/controlComponentRegistry';

const ColorPicker: React.FC<ControlComponentProps> = ({ value, onChange }) => (
  <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
);

registerControlType('color-picker', ColorPicker);
```

然后在节点模板的 `inlineControls` 中使用 `type: 'color-picker'`。

### 8. 顶部栏和底部栏

顶部栏 (`topBarRegistry`) 和底部栏 (`bottomBarRegistry`) 的注册方式类似，均返回清理函数。例如：

```typescript
import { registerTopBarCenter } from '../src/registry/topBarRegistry';

const unregister = registerTopBarCenter({
  id: 'my-button',
  order: 100,
  icon: <MyIcon />,
  onClick: () => console.log('clicked'),
});
```

---

## 动态添加自定义端口类型规则

当你在节点模板中使用了非内置的端口类型（如 `item_ref`、`entity`、`vector3`）时，需要通过注册中心告诉编辑器该类型可以连接哪些其他类型。

### 步骤

1. 在你的自定义 Mod 中导入 `registerConnectionRule`（来自 `src/registry/connectionRuleRegistry`）。
2. 在 `init` 函数中调用，注册你的类型规则。

### 示例：为 `item_ref` 类型添加连接规则

```typescript
import type { EditorMod } from '../src/bus/types';
import { registerConnectionRule } from '../src/registry/connectionRuleRegistry';

export const myTypeRuleMod: EditorMod = {
    id: 'my-type-rules',
    init() {
        // 允许 item_ref 连接到自身或通配符
        registerConnectionRule('item_ref', ['item_ref', '*']);
        // 如果需要更严格的限制，可以只允许连接到特定类型
        // registerConnectionRule('item_ref', ['item_ref']);
    },
};
```

### 注意事项

- 规则注册应在 Mod 初始化时完成，建议尽早注册（例如放在 `customMods` 数组靠前的位置）。
- 如果多个 Mod 注册同一源类型的规则，默认是**合并**（除非使用 `setConnectionRule` 覆盖）。
- 移除规则可以使用 `removeConnectionRule`，但通常不需要（因为页面刷新后规则会重置）。

---

## 节点模板注册中心

如果你需要动态添加或替换节点模板，可以使用 `src/registry/nodeTemplateRegistry.ts` 提供的函数：

- `registerNodeTemplates(templates)`：添加自定义模板（与内置模板不重复时有效）。
- `setBuiltInTemplates(templates)`：完全替换内置模板。
- `resetBuiltInTemplates()`：恢复默认内置模板。
- `getAllTemplates()`：获取当前所有模板（自定义覆盖内置）。

示例 Mod：

```ts
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

const myNode: NodeTemplate = { /* ... */ };

export const myNodeMod: EditorMod = {
    id: 'my-nodes',
    init() {
        registerNodeTemplates([myNode]);
        return () => {}; // 无需清理，不影响下次加载
    },
};
```

---

## 工具函数辅助

从 `src/utils` 导入常用工具：

- `generateNodeId()`：生成唯一节点 ID。
- `createNode(type, position)`：根据模板类型创建完整节点对象。
- `syncIdCounter(nodes)`：同步 ID 计数器，避免冲突。
- `exportWorkflow(nodes, edges)`、`importWorkflow()`：JSON 导入导出（通常使用 `mod-workflow-io` 更灵活）。

---

## 防御降级机制

当你的自定义 Mod 在 `init` 中抛出错误时，系统会自动尝试回退到同名的内置 Mod（如果存在），并输出彩色错误日志和降级警告。因此，即使你的 Mod 有 bug，也不会导致整个编辑器无法使用。

你可以故意制造错误来测试：

```ts
export const brokenMod: EditorMod = {
    id: 'history',
    init() {
        throw new Error('测试降级');
    },
};
```

控制台会显示红色错误和黄色降级提示，而历史记录功能依然正常（内置版本接管）。

---

## 常见问题

### Q：如何调试 Mod？
- 打开浏览器控制台，设置 `DEBUG = true`（在 `config/debug.ts` 中）。
- 在 `init` 中使用 `console.log` 输出信息。
- 订阅事件并打印。

### Q：我的 Mod 没有生效？
- 检查 `custom-mods/index.ts` 是否正确导入并添加到数组中。
- 检查 Mod 的 `id` 是否与内置 Mod 冲突但无意覆盖（如果不是故意的）。
- 刷新页面，观察控制台是否有 `[initMods]` 相关日志。

### Q：如何让 Mod 只在特定条件下运行？
- 在 `init` 中根据 `bus.getState().mode` 或其他条件决定是否订阅事件即可。

### Q：可以同时注册多个 Mod 吗？
- 可以，它们按数组顺序初始化。顺序一般不影响功能，除非有依赖关系（依赖其他 Mod 的副作用）。

---

## 完整示例：快捷键保存 Mod

下面是一个独立 Mod，按下 `Ctrl+S` 时触发保存工作流（利用内置 `mod-workflow-io` 的导出函数）：

```ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { exportWorkflowData } from '../src/mods/mod-workflow-io';

export const saveShortcutMod: EditorMod = {
    id: 'save-shortcut',
    init(bus: EditorBus) {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const { nodes, edges } = bus.getState();
                exportWorkflowData(nodes, edges);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    },
};
```

注册后，用户即可用 `Ctrl+S` 导出工作流 JSON 文件（或 YAML，如果已覆盖 `workflow-io`）。

---

## 总结

- 所有自定义代码放在 `custom-mods/`，无需修改核心。
- Mod 可以添加新功能、覆盖内置功能、或继承并增强。
- 利用事件总线进行通信，利用注册中心扩展 UI 和节点模板。
- 防御降级机制保证即使 Mod 出错，编辑器也能正常工作。
- 所有注册中心均提供清理函数，便于 Mod 卸载时释放资源。
- 端口类型规则可通过注册中心动态添加，支持任意自定义类型。

更多 API 细节请参考 `AI_MOD_API_REFERENCE.md`，节点模板定义请参考 `NODE_TEMPLATE_API.md`。
```