# Mod API 参考手册（供 AI 使用）

此文档提供开发自定义 Mod 所需的所有接口、类型、事件和工具函数。  
每个 Mod 都是一个实现 `EditorMod` 接口的模块，可在 `custom-mods/` 中创建并通过 `custom-mods/index.ts` 注册。

---

## 1. 核心接口

### EditorMod
```typescript
interface EditorMod {
    id: string;                                      // 全局唯一的 Mod 标识
    init: (bus: EditorBus) => (() => void) | void;   // 初始化函数，接收总线实例，可返回清理函数
    destroy?: () => void;                            // 可选的销毁函数（通常不用）
}
```

### EditorBus
```typescript
interface EditorBus {
    getState(): EditorState;                      // 同步获取当前完整状态
    dispatch(event: EditorEvent): void;           // 派发事件，触发状态变更
    subscribe(listener: Listener): () => void;    // 订阅所有事件，返回取消订阅函数
}
```

### Listener
```typescript
type Listener = (payload: { event: EditorEvent; state: EditorState }) => void;
```

---

## 2. 核心状态（EditorState）

```typescript
interface EditorState {
    nodes: CustomNode[];   // 所有节点
    edges: CustomEdge[];   // 所有边
    selection: string[];   // 当前选中的节点 ID 列表
    mode: EditorMode;      // 编辑器模式：'default' | 'batch-connect' | 'reconnect'
}
```

---

## 3. 完整事件列表（EditorEvent）

所有事件均为 `{ type: string, ... }` 的可辨识联合类型。

### 节点操作
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `NODE_ADDED` | 添加单个节点（自动去重） | `{ node: CustomNode }` |
| `NODES_ADDED` | 批量添加节点 | `{ nodes: CustomNode[] }` |
| `NODE_DELETED` | 删除节点（同时删除关联边） | `{ nodeIds: string[] }` |
| `NODE_DATA_CHANGED` | 修改节点数据（可传播 value 到下游） | `{ nodeId: string; data: Record<string, unknown>; propagate?: boolean }` |
| `NODE_LOCK_TOGGLED` | 锁定/解锁节点 | `{ nodeId: string }` |
| `NODE_POSITIONS_CHANGED` | 节点位置变更（拖拽结束） | `{ updates: { id: string; position: { x: number; y: number } }[] }` |

### 边操作
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `EDGE_ADDED` | 添加边 | `{ edge: CustomEdge }` |
| `EDGE_DELETED` | 删除边 | `{ edgeId: string }` |
| `EDGE_RECONNECTED` | 重连边 | `{ oldEdgeId: string; newConnection: Connection }` |

### 选择与模式
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `SELECTION_CHANGED` | 选中节点变化 | `{ nodeIds: string[] }` |
| `MODE_CHANGED` | 编辑器模式变化 | `{ mode: EditorMode; meta?: Record<string, unknown> }` |

### 历史记录
| 事件类型 | 说明 |
|----------|------|
| `HISTORY_UNDO` | 执行撤销 |
| `HISTORY_REDO` | 执行重做 |

### 工作流整体
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `WORKFLOW_LOADED` | 加载/重置整个工作流 | `{ nodes: CustomNode[]; edges: CustomEdge[] }` |

### 批量连线
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `BATCH_CONNECT_START` | 开始批量连线 | `{ sourceNodeIds: string[]; sourceHandleType: string }` |
| `BATCH_CONNECT_EXECUTE` | 执行批量连线 | `{ targetNodeId: string; targetHandleId: string }` |
| `BATCH_CONNECT_CANCEL` | 取消批量连线 | 无 |

### 重连
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `RECONNECT_START` | 开始拖拽重连 | `{ edgeId: string; handleType: 'source' | 'target' }` |
| `RECONNECT_END` | 结束重连 | 无 |

### 对齐与布局
| 事件类型 | 说明 |
|----------|------|
| `ALIGN_LEFT` | 左对齐 |
| `ALIGN_RIGHT` | 右对齐 |
| `ALIGN_TOP` | 顶对齐 |
| `ALIGN_BOTTOM` | 底对齐 |
| `ALIGN_CENTER_X` | 水平居中 |
| `ALIGN_CENTER_Y` | 垂直居中 |
| `DISTRIBUTE_HORIZONTAL` | 水平均分（需 ≥3 个节点） |
| `DISTRIBUTE_VERTICAL` | 垂直均分（需 ≥3 个节点） |
| `AUTO_LAYOUT` | 自动布局 |

### 内部同步
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `APPLY_NODE_CHANGES` | 直接同步节点数组（通常由适配器使用） | `{ nodes: CustomNode[] }` |

---

## 4. 节点模板注册 API

提供以下函数（从 `../src/registry/nodeTemplateRegistry` 导入）：

- **`getAllTemplates(): NodeTemplate[]`**  
  获取当前所有节点模板（内置 + 自定义，自定义覆盖同类型内置模板）。

- **`registerNodeTemplates(templates: NodeTemplate[]): void`**  
  注册自定义节点模板（自动去重）。通常在 Mod 的 `init()` 中调用。

- **`setBuiltInTemplates(templates: NodeTemplate[]): void`**  
  完全替换内置模板，可用于打造专属节点库。

- **`resetBuiltInTemplates(): void`**  
  恢复内置模板为默认值（通常作为 Mod 清理函数的一部分）。

### 模板类型定义

```typescript
interface NodeTemplate {
    type: string;                                        // 模板唯一标识（如 'numberInput'）
    title: string;                                       // 显示名称
    category: string;                                    // 分类（中文）
    icon: string;                                        // 表情符号
    color: string;                                       // 主题色
    styleClass?: string;                                 // 额外 CSS 类名
    inputs?: PortDefinition[];                           // 输入端口
    outputs?: PortDefinition[];                          // 输出端口
    handles?: { sources?: PortDefinition[]; targets?: PortDefinition[] }; // 等效写法
    defaultData: Record<string, unknown>;                // 新节点的默认数据
    properties: Record<string, { type: string; default: unknown }>; // 可编辑属性
    inlineControls?: InlineControl[];                    // 内联控件（步进器、开关等）
}

interface PortDefinition {
    id: string;                  // 端口 ID（如 'a', 'output'）
    label: string;               // 鼠标悬浮提示
    type: 'number' | 'boolean' | 'exec' | '*';   // 数据类型，'*' 为通配符
    position: 'left' | 'right' | 'top' | 'bottom';
    style?: Record<string, unknown>;
}
```

---

## 5. 常用工具函数

从 `../src/utils` 导入：

- **`generateNodeId(): string`**  
  生成全局唯一节点 ID（格式 `node_1`, `node_2` ...）。

- **`generateEdgeId(): string`**  
  生成全局唯一边 ID。

- **`createNode(type: string, position?: { x: number; y: number }): CustomNode`**  
  根据模板类型和坐标创建一个新节点（返回完整节点对象）。

- **`syncIdCounter(nodes: { id: string }[]): void`**  
  根据现有节点 ID 同步全局 ID 计数器，防止新建节点冲突。

---

## 6. Mod 编写模式

### 6.1 订阅事件并执行副作用

```typescript
import type { EditorMod } from '../src/bus/types';

export const myMod: EditorMod = {
    id: 'my-mod',
    init(bus) {
        const unsub = bus.subscribe(({ event, state }) => {
            if (event.type === 'NODE_ADDED') {
                console.log('新节点：', event.node.id);
            }
            // 也可以根据其他事件类型处理
        });
        return () => unsub();  // 清理订阅
    }
};
```

### 6.2 主动派发事件

```typescript
bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: ['node_1', 'node_2'] });
bus.dispatch({ type: 'AUTO_LAYOUT' });
```

### 6.3 注册自定义节点模板

```typescript
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';

export const myTemplateMod: EditorMod = {
    id: 'my-templates',
    init() {
        registerNodeTemplates([
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
        return () => {}; // 无需清理或调用 resetTemplates
    }
};
```

### 6.4 完全替换内置模板

```typescript
import { setBuiltInTemplates, resetBuiltInTemplates } from '../src/registry/nodeTemplateRegistry';

export const replaceTemplatesMod: EditorMod = {
    id: 'replace-builtin',
    init() {
        setBuiltInTemplates([ /* 全新的 NodeTemplate 数组 */ ]);
        return () => resetBuiltInTemplates(); // 卸载时恢复默认
    }
};

## 7. 重要注意事项

- Mod 的 `id` 必须全局唯一，建议使用带有命名空间的标识（如 `'my-plugin-logger'`）。
- `init` 函数中返回的清理函数用于移除事件监听、定时器等，避免内存泄漏。
- 事件驱动是核心，尽量通过 `dispatch` 改变状态，不要直接操作 DOM 或 React 状态（除非有特殊需求）。
- 节点模板注册中心会自动去重，多次注册同类型模板不会产生重复条目。
- 若要覆盖内置模板，使用 `setBuiltInTemplates` 并记得在清理时恢复。
- 所有事件定义见 `src/bus/types.ts`，可随时查阅最新完整列表。