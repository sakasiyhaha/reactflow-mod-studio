# reactflow-mod-studio

一个基于 React Flow (@xyflow/react) 的**可扩展节点编辑器**，采用 **事件总线 + Mod 插件** 架构。  
不仅提供了完整的节点编辑功能，更允许你通过编写 Mod 自由扩展，**无需改动核心源代码**。

## 核心特点

- 🧩 **事件总线核心**：所有状态变更通过 `EditorEvent` 派发，单向数据流，易于调试。
- 🔌 **Mod 插件化**：编写 Mod 即可添加新功能（自动保存、加载、自定义快捷键、数据校验等）。
- 🧱 **节点模板可定制**：通过注册中心动态添加、覆盖、重置节点模板，可完全替换内置节点库。
- ✂️ **剪贴板保留连线**：复制 / 粘贴节点时会自动保留节点之间的边。
- 🎯 **批量连线、对齐分布**：多选节点后一键批量连线，左 / 右 / 顶 / 底对齐及水平 / 垂直均分。
- ↩️ **撤销 / 重做**：基于快照的历史记录，支持 Ctrl+Z / Ctrl+Y。
- 💾 **自动保存 / 加载**：内置示例 Mod 可将工作流自动保存到 localStorage，刷新后恢复。
- 🖱️ **拖拽 / 搜索添加节点**：从侧边栏拖拽或双击画布搜索节点。
- ⌨️ **快捷键**：Ctrl+C / V / X / A 等常用操作，以及 Delete / Backspace 删除。

## 快速开始

```bash
git clone <你的仓库地址> reactflow-mod-studio
cd reactflow-mod-studio
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

## 项目结构

```
reactflow-mod-studio/
├── custom-mods/          # 你的自定义 Mod（完全独立，无需改动核心代码）
├── src/
│   ├── bus/              # 事件总线：类型定义、Hook、Context
│   ├── mods/             # 内置 Mod（历史记录、剪贴板、对齐、重连等）
│   ├── adapters/         # React Flow 回调适配器
│   ├── components/       # UI 组件
│   ├── hooks/            # 自定义 Hook
│   ├── registry/         # 节点模板注册中心（支持动态添加/替换模板）
│   └── utils/            # 工具函数、类型定义
├── config/               # 调试开关、编辑器配置
├── constants/            # 常量（如最大历史记录数）
├── package.json
└── vite.config.js
```

## 如何编写自定义 Mod

详细教程见 **[CUSTOM_MODS.md](./CUSTOM_MODS.md)**，涵盖：

- 创建第一个 Mod（事件日志）
- 编辑器总线 API（`getState`, `dispatch`, `subscribe`）
- 完整事件列表
- 示例：自动保存、启动加载、注册自定义节点模板、覆盖内置模板

**极简三步**（详细说明请阅读教程）：

1. 在 `custom-mods/` 下新建 `.ts` 文件，实现 `EditorMod` 接口。
2. 在 `custom-mods/index.ts` 中导入并加入 `customMods` 数组。
3. 刷新页面，Mod 自动生效。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建（输出到 `dist/`） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览生产构建 |

## 许可证

MIT
```

---

## 更新后的 CUSTOM_MODS.md

```markdown
# 自定义 Mod 开发指南

本编辑器采用**事件总线 + Mod 插件**架构。  
你可以编写自己的 Mod 来扩展功能，**完全无需改动 `src/` 下的核心代码**。

---

## 快速上手

### 第一步：创建 Mod 文件

在 `custom-mods/` 目录下新建一个 `.ts` 文件，例如 `my-logger-mod.ts`，内容如下：

```ts
// custom-mods/my-logger-mod.ts
import type { EditorMod } from '../src/bus/types';

export const myLoggerMod: EditorMod = {
    id: 'my-logger',   // 必须唯一
    init(bus) {
        // 订阅所有事件，打印到控制台
        const unsub = bus.subscribe(({ event, state }) => {
            console.log(`[my-logger] 事件: ${event.type}`, event);
        });

        // 返回取消订阅的函数（组件卸载时自动调用）
        return () => {
            unsub();
        };
    },
};
```

### 第二步：注册 Mod

打开 `custom-mods/index.ts`，导入并添加你的 Mod：

```ts
import { myLoggerMod } from './my-logger-mod';
import type { EditorMod } from '../src/bus/types';

export const customMods: EditorMod[] = [
    myLoggerMod,
];
```

保存文件并刷新浏览器，你将在控制台看到所有事件的日志输出。

---

## Mod 接口详解

每个 Mod 必须遵循 `EditorMod` 接口：

```ts
export interface EditorMod {
    id: string;                                     // 唯一标识符
    init: (bus: EditorBus) => (() => void) | void;  // 初始化，可返回清理函数
    destroy?: () => void;                           // 可选的销毁函数
}
```

### `EditorBus` 提供的能力

通过 `init(bus)` 的 `bus` 参数，你可以：

- `bus.getState()`  
  获取当前状态 `{ nodes, edges, selection, mode }`。
- `bus.dispatch(event)`  
  派发事件，触发状态变更（添加节点、删除边、切换模式等）。
- `bus.subscribe(listener)`  
  订阅所有事件。`listener` 签名：`(payload: { event: EditorEvent; state: EditorState }) => void`。  
  返回一个取消订阅的函数。

---

## 常用事件类型

所有事件定义在 `src/bus/types.ts` 的 `EditorEvent` 联合类型中。以下为常用事件：

| 事件类型 | 说明 | payload 示例 |
|----------|------|--------------|
| `NODE_ADDED` | 添加单个节点 | `{ node: CustomNode }` |
| `NODES_ADDED` | 批量添加节点 | `{ nodes: CustomNode[] }` |
| `NODE_DELETED` | 删除节点 | `{ nodeIds: string[] }` |
| `NODE_DATA_CHANGED` | 节点数据变更 | `{ nodeId, data, propagate? }` |
| `NODE_POSITIONS_CHANGED` | 节点位置变化（拖拽结束） | `{ updates: { id, position }[] }` |
| `EDGE_ADDED` | 添加边 | `{ edge: CustomEdge }` |
| `EDGE_DELETED` | 删除边 | `{ edgeId: string }` |
| `EDGE_RECONNECTED` | 边重连 | `{ oldEdgeId, newConnection }` |
| `SELECTION_CHANGED` | 选中状态变化 | `{ nodeIds: string[] }` |
| `MODE_CHANGED` | 编辑器模式变化 | `{ mode, meta? }` |
| `WORKFLOW_LOADED` | 工作流加载（导入/重置） | `{ nodes, edges }` |
| `HISTORY_UNDO` | 撤销 | 无额外字段 |
| `HISTORY_REDO` | 重做 | 无额外字段 |
| `BATCH_CONNECT_START` | 批量连线开始 | `{ sourceNodeIds, sourceHandleType }` |
| `BATCH_CONNECT_EXECUTE` | 批量连线执行 | `{ targetNodeId, targetHandleId }` |
| `BATCH_CONNECT_CANCEL` | 取消批量连线 | 无额外字段 |
| `ALIGN_LEFT` / `ALIGN_RIGHT` / … | 对齐操作 | 无额外字段 |
| `AUTO_LAYOUT` | 自动布局 | 无额外字段 |

---

## 示例一：自动保存 Mod

项目已内置 `custom-mods/example-auto-save-mod.ts`，它监听节点/边的变更，自动保存到 `localStorage`。

```ts
import type { EditorMod } from '../src/bus/types';

export const exampleAutoSaveMod: EditorMod = {
    id: 'example-auto-save',
    init(bus) {
        const save = () => {
            const state = bus.getState();
            localStorage.setItem('auto-saved-workflow', JSON.stringify({
                nodes: state.nodes,
                edges: state.edges,
            }));
        };

        const unsub = bus.subscribe(({ event }) => {
            if ([
                'NODE_ADDED','NODES_ADDED','NODE_DELETED',
                'EDGE_ADDED','EDGE_DELETED','EDGE_RECONNECTED',
                'NODE_DATA_CHANGED','NODE_POSITIONS_CHANGED',
            ].includes(event.type)) {
                save();
            }
        });

        return () => unsub();
    },
};
```

---

## 示例二：启动时自动加载保存的工作流

项目已内置 `custom-mods/auto-load-mod.ts`，在启动时从 `localStorage` 恢复工作流。

```ts
import type { EditorMod } from '../src/bus/types';

export const autoLoadMod: EditorMod = {
    id: 'auto-load',
    init(bus) {
        const raw = localStorage.getItem('auto-saved-workflow');
        if (raw) {
            try {
                const { nodes, edges } = JSON.parse(raw);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes, edges });
            } catch (e) {}
        }
    },
};
```

---

## 示例三：添加自定义节点模板

项目支持动态注册自定义节点模板，无需修改 `nodeTemplates.ts` 或其他核心文件。

### 1. 创建 Mod 文件 `custom-mods/example-add-template-mod.ts`

```ts
import type { EditorMod } from '../src/bus/types';
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

const customTemplates: NodeTemplate[] = [
    {
        type: 'customConstant',
        title: '自定义常量',
        category: '自定义',
        icon: '🔧',
        color: '#FF6B6B',
        outputs: [{ id: 'output', label: '输出', type: 'number', position: 'right' }],
        defaultData: { value: 999, label: '常量' },
        properties: {
            value: { type: 'number', default: 999 },
            label: { type: 'string', default: '常量' },
        },
    },
    {
        type: 'customDisplay',
        title: '自定义显示器',
        category: '自定义',
        icon: '📟',
        color: '#4ECDC4',
        inputs: [{ id: 'input', label: '输入', type: '*', position: 'left' }],
        defaultData: { value: 0, label: '显示器' },
        properties: {
            value: { type: 'number', default: 0 },
            label: { type: 'string', default: '显示器' },
        },
    },
];

export const exampleAddTemplateMod: EditorMod = {
    id: 'example-add-template',
    init() {
        registerNodeTemplates(customTemplates);
        return () => {};
    },
};
```

### 2. 注册 Mod

在 `custom-mods/index.ts` 中加入：

```ts
import { exampleAddTemplateMod } from './example-add-template-mod';

export const customMods: EditorMod[] = [
    exampleAutoSaveMod,
    autoLoadMod,
    exampleAddTemplateMod,   // 添加自定义模板
];
```

刷新后，左侧节点库将出现**自定义常量**和**自定义显示器**，与内置节点共存。

---

## 示例四：覆盖 / 替换内置节点模板

若你需要完全替换掉默认的节点库，可以使用 `setBuiltInTemplates`。

### 1. 创建 Mod 文件 `custom-mods/example-replace-template-mod.ts`

```ts
import type { EditorMod } from '../src/bus/types';
import { setBuiltInTemplates, resetBuiltInTemplates } from '../src/registry/nodeTemplateRegistry';
import type { NodeTemplate } from '../src/nodeTemplates';

const replacementBuiltIn: NodeTemplate[] = [
    {
        type: 'myInput',
        title: '我的输入',
        category: '自定义',
        icon: '📥',
        color: '#8E44AD',
        outputs: [{ id: 'out', label: '数据', type: 'number', position: 'right' }],
        defaultData: { value: 0, label: '输入' },
        properties: { value: { type: 'number', default: 0 }, label: { type: 'string', default: '输入' } },
    },
    {
        type: 'myOutput',
        title: '我的输出',
        category: '自定义',
        icon: '📤',
        color: '#1ABC9C',
        inputs: [{ id: 'in', label: '数据', type: 'number', position: 'left' }],
        defaultData: { value: 0, label: '输出' },
        properties: { value: { type: 'number', default: 0 }, label: { type: 'string', default: '输出' } },
    },
];

export const exampleReplaceTemplateMod: EditorMod = {
    id: 'example-replace-template',
    init() {
        setBuiltInTemplates(replacementBuiltIn);
        return () => {
            resetBuiltInTemplates();   // 卸载 Mod 时恢复默认内置模板
        };
    },
};
```

### 2. 注册 Mod

在 `custom-mods/index.ts` 中启用它（可以替代上面的 exampleAddTemplateMod）：

```ts
import { exampleReplaceTemplateMod } from './example-replace-template-mod';

export const customMods: EditorMod[] = [
    exampleAutoSaveMod,
    autoLoadMod,
    exampleReplaceTemplateMod,   // 覆盖默认节点库
];
```

刷新后，节点库将**只剩** `myInput` 和 `myOutput`，原有的内置节点全都消失。  
当 Mod 卸载时，自动恢复原始内置模板。

---

## 典型使用场景

- **自动保存**：监听拓扑变更事件，保存到 `localStorage` 或服务端。
- **日志记录**：订阅所有事件，输出到控制台或发送到分析服务。
- **快捷键扩展**：在 `init` 中通过 `window.addEventListener('keydown', ...)` 添加自定义快捷键，通过 `bus.dispatch` 派发事件。
- **数据校验**：在节点数据变更时检查合理性，必要时派发修正事件或提示。
- **自定义导出**：监听 `WORKFLOW_LOADED` 或手动触发导出为特定格式。
- **节点库定制**：通过注册中心添加 / 替换节点模板，打造专属节点编辑器。

---

## 注意事项

- 不要修改 `src/bus/`、`src/mods/`、`src/components/` 等核心目录。
- 自定义 Mod 务必放在 `custom-mods/` 中，通过 `custom-mods/index.ts` 注册。
- Mod 的 `id` 应保持全局唯一。
- 返回的清理函数用于移除事件监听、定时器等，避免内存泄漏。

---

## 更多参考

- 查看 `src/mods/` 下的内置 Mod 源码（如 `mod-clipboard.ts`、`mod-history.ts`）。
- 查看 `src/bus/types.ts` 了解所有事件的定义。
- 查看 `src/registry/nodeTemplateRegistry.ts` 了解模板注册中心的 API。

## 许可证

reactflow-mod-studio 基于 MIT 许可证发布。详见 [LICENSE](LICENSE) 文件。