
# 自定义 Mod 开发指南

本编辑器采用事件总线 + Mod 插件架构。你可以编写自己的 Mod 来添加、覆盖或继承内置功能，完全不需要修改核心源代码。所有自定义 Mod 统一放在 `custom-mods/` 目录中，通过 `custom-mods/index.ts` 注册。

---

## 快速上手

### 1. 创建 Mod 文件

在 `custom-mods/` 目录下新建一个 `.ts` 文件，例如 `my-logger-mod.ts`：

```ts
import type { EditorMod } from '../src/bus/types';

export const myLoggerMod: EditorMod = {
    id: 'my-logger',
    init(bus) {
        const unsub = bus.subscribe(({ event, state }) => {
            console.log(`[my-logger] 事件: ${event.type}`, event);
        });
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
    myLoggerMod,
];
```

保存文件，刷新浏览器即可生效。

---

## 核心概念速查

- **`EditorMod`**：必须包含 `id` 和 `init(bus)` 方法，可返回清理函数。
- **`EditorBus`**：提供 `getState()`、`dispatch(event)`、`subscribe(listener)`。
- **事件类型**：定义在 `src/bus/types.ts`，约 60+ 种事件。
- **注册中心**：用于动态扩展节点模板、UI 组件、菜单项等，所有注册函数均返回清理函数。

---

## 动态端口（Dynamic Ports）

允许节点根据自身数据动态增减输入/输出端口，适用于条件分支、可变参数等场景。

### 在模板中定义

```typescript
const myTemplate: NodeTemplate = {
    // ... 其他字段
    dynamicPorts: (data) => {
        if (data.enableExtra) {
            return {
                outputs: [{ id: 'extra', label: '额外输出', type: 'number', position: 'right' }]
            };
        }
        return {};
    },
    dynamicPortsDeps: (data) => ['enableExtra'], // 仅当 enableExtra 变化时重新计算
};
```

### 注意事项

- 动态端口的 `id` 不能与静态端口重复。
- 使用 `dynamicPortsDeps` 声明依赖字段，避免不必要重算。
- 开发环境下会自动打印端口变化日志。
- 示例 Mod：`dynamic-output-mod.ts`。

---

## 确认辅助函数

对于危险操作（如删除节点），可弹出确认框，用户确认后才执行。

### 使用方法

```typescript
import { dispatchConfirmable } from '../src/bus/confirmable';

await dispatchConfirmable(
    bus,
    { type: 'NODE_DELETED', nodeIds: [nodeId] },
    '确定删除该节点吗？'
);
```

### 在右键菜单中使用

```typescript
registerNodeMenuItem({
    id: 'safe-delete',
    label: '安全删除',
    action: async (bus, nodeId) => {
        await dispatchConfirmable(bus, { type: 'NODE_DELETED', nodeIds: [nodeId] }, '确认删除？');
    },
});
```

示例 Mod：`confirm-delete-mod.ts`。

---

## 资源外部化（ResourceStore）

对于大容量数据（图片、音频、模型），应使用 `ResourceStore` 管理，避免嵌入节点数据导致 JSON 膨胀。

### 基本操作

```typescript
import { ResourceStore } from '../src/store/ResourceStore';

// 注册资源
const blob = await fetch(url).then(r => r.blob());
const resourceId = ResourceStore.register(blob);

// 存储到节点
node.data._resources = [resourceId];

// 释放资源（删除节点时会自动调用，通常无需手动）
ResourceStore.release(resourceId);
```

### 自动集成

- **复制/粘贴**：自动增加引用计数。
- **删除节点**：自动释放资源（需确保已应用 `useEditorBus.ts` 中的修改）。
- **导入/导出**：自动将资源序列化为 base64 嵌入 JSON，导入时恢复为新 Blob 并更新节点引用。

示例 Mod：`resource-node-mod.ts`、`image-node-mod.ts`。

---

## 工作流导入导出钩子

允许在导出前修改数据，或在导入后执行自定义逻辑。

### 注册钩子

```typescript
import { registerBeforeExportHook, registerAfterImportHook } from '../src/mods/mod-workflow-io';

// 导出前添加时间戳
registerBeforeExportHook(async (data) => {
    const newNodes = data.nodes.map(node => ({
        ...node,
        data: { ...node.data, _exportedAt: Date.now() }
    }));
    return { nodes: newNodes, edges: data.edges };
});

// 导入后自动居中
registerAfterImportHook(() => {
    bus.dispatch({ type: 'FIT_VIEW' });
});
```

钩子按注册顺序执行，支持异步。错误不会阻塞流程。

示例 Mod：`timestamp-hook-mod.ts`。

---

## 数字配置化

所有魔法数字（超时、布局尺寸、动画时长等）已集中到 `config/numbers.ts`。你可以修改该文件来全局调整。

```typescript
// config/numbers.ts
export const TIMEOUTS = {
    FILE_IMPORT_TIMEOUT: 60000,
    CANCEL_DETECTION_DELAY: 50,
} as const;

export const LAYOUT = {
    DEFAULT_NODE_WIDTH: 160,
    DEFAULT_NODE_HEIGHT: 60,
    // ...
};
```

在代码中导入使用：

```typescript
import { LAYOUT } from '../../config/numbers';
const width = LAYOUT.DEFAULT_NODE_WIDTH;
```

---

## 内置 Mod 覆盖与继承

| 内置 Mod | id | 可覆盖 |
|----------|-----|--------|
| 历史记录 | `history` | ✅ |
| 批量连线 | `batch-connect` | ✅ |
| 工作流导入导出 | `workflow-io` | ✅ |
| 默认 UI | `default-ui` | ✅ |
| ... | ... | ... |

要覆盖内置 Mod，只需创建 `id` 相同的自定义 Mod。若初始化失败，会自动降级到内置版本。

---

## 示例 Mod 清单（位于 `custom-mods/`）

| 文件名 | 功能 |
|--------|------|
| `logger-node-mod.ts` | 添加“日志记录器”节点（模板 + 内联控件） |
| `export-svg-mod.ts` | 画布右键菜单“导出为 SVG”（演示菜单注册） |
| `timestamp-hook-mod.ts` | 导入导出钩子：添加时间戳 + 打印统计 |
| `confirm-delete-mod.ts` | 安全删除节点（使用确认框） |
| `dynamic-output-mod.ts` | 动态端口示例（根据开关显示额外输出） |
| `image-node-mod.ts` | 图片资源节点（演示 ResourceStore 用法） |

---

## 调试技巧

- 设置 `config/debug.ts` 中 `DEBUG = true` 开启详细日志。
- 开发环境下动态端口变化会打印日志。
- 使用 `bus.subscribe` 监听特定事件并输出状态。

---

## 常见问题

**Q: 动态端口导致节点不停闪烁？**  
A: 检查 `dynamicPortsDeps` 是否声明了正确的依赖字段，避免每次渲染都重新计算。

**Q: 导入工作流后资源不显示？**  
A: 导入后资源 ID 会变化，需要从节点 `data._resources` 获取新 ID，再通过 `ResourceStore.get()` 获取 Blob。若节点组件依赖 `imageUrl`，需在 `afterImport` 钩子中重新生成 ObjectURL。

**Q: 如何替换默认的 JSON 导入导出为 YAML？**  
A: 使用 `setWorkflowIOHandlers` 替换处理器，参考 `EXTEND_WORKFLOW_FORMAT.md`。

**Q: 我的 Mod 初始化失败怎么办？**  
A: 系统会自动降级到同名的内置 Mod（如果存在），并输出彩色错误日志。修复 Mod 后刷新页面即可。

---

## 总结

- 所有自定义代码放在 `custom-mods/`，无需修改核心。
- 利用事件总线通信，利用注册中心扩展 UI 和模板。
- 使用 `ResourceStore` 管理大容量数据。
- 使用钩子扩展导入导出流程。
- 统一配置 `config/numbers.ts` 消除魔法数字。

更多 API 细节请参考 `AI_MOD_API_REFERENCE.md`，节点模板定义请参考 `NODE_TEMPLATE_API.md`。