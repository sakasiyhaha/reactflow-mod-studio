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

所有事件均为 `{ type: string, ... }` 的可辨识联合类型。以下按功能分组列出。

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

### 项目配置
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `PROJECT_CONFIG_TOGGLE_PANEL` | 切换设置面板显示/隐藏 | 无 |
| `PROJECT_CONFIG_CHANGED` | 项目配置已变更 | `{ config: Record<string, unknown> }` |

### 连接菜单
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `CONNECTION_MENU_OPEN` | 打开连接节点菜单 | `{ x: number; y: number; sourceNodeId: string; sourceHandleId: string; availableTypes: NodeTemplate[]; direction: 'forward' | 'reverse' }` |
| `CONNECTION_MENU_CLOSE` | 关闭连接菜单 | 无 |

### 浮动搜索
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `FLOATING_SEARCH_OPEN` | 打开浮动搜索框 | `{ x: number; y: number }` |
| `FLOATING_SEARCH_CLOSE` | 关闭浮动搜索框 | 无 |

### 动态视图控制（新增）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `SET_VIEWPORT_LIMITS` | 动态修改画布缩放范围和平移边界 | `{ minZoom?: number; maxZoom?: number; translateExtent?: [[number,number],[number,number]] }` |
| `SET_PAN_ON_DRAG` | 修改拖拽平移的鼠标按键 | `number[]`（如 `[1]` 左键，`[1,2]` 左键+中键） |
| `SET_BACKGROUND_STYLE` | 动态修改画布背景样式 | `{ variant?: 'dots' \| 'lines' \| 'none'; gap?: number; size?: number; color?: string }` |

### 画布视图（新增）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `VIEWPORT_CHANGED` | 画布缩放/平移时触发 | `{ x: number; y: number; zoom: number }` |

### 对齐辅助线（新增）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `RENDER_GUIDE_LINES` | 绘制辅助线 | `{ lines: Array<{ x1: number; y1: number; x2: number; y2: number; color?: string }> }` |
| `CLEAR_GUIDE_LINES` | 清除所有辅助线 | 无 |

### 主题颜色（新增）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `SET_THEME_COLOR` | 修改单个 CSS 变量 | `{ variable: string; value: string }` |
| `SET_THEME_COLORS` | 批量修改多个 CSS 变量 | `Record<string, string>` |

### 错误处理（新增）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `ERROR_OCCURRED` | 发生错误（显示 Toast） | `{ message: string; type?: 'info' \| 'warning' \| 'error'; details?: any }` |

### 内部同步（通常不直接使用）
| 事件类型 | 说明 | Payload |
|----------|------|---------|
| `APPLY_NODE_CHANGES` | 直接同步节点数组（由适配器使用） | `{ nodes: CustomNode[] }` |

---

## 4. 内置 Mod 列表及其 id

| 内置 Mod | id | 主要功能 |
|----------|-----|----------|
| 历史记录 | `history` | 撤销/重做，监听 Ctrl+Z/Y |
| 批量连线 | `batch-connect` | 多选节点后批量连线 |
| 对齐与自动布局 | `alignment` | 左/右/顶/底对齐，水平/垂直居中，水平/垂直均分，自动布局 |
| 剪贴板 | `clipboard` | 复制/剪切/粘贴（保留连线），全选，Ctrl+C/V/X/A |
| 重连管理 | `reconnect` | 边重连时抑制连接菜单，管理重连状态 |
| 项目配置 | `project-config` | 设置面板开关，配置持久化 |
| 节点生命周期 | `node-lifecycle` | 将 React Flow 回调适配为事件（提供工具函数） |
| 连接菜单 | `connection-menu` | 拖线到空白时弹出节点选择菜单 |
| 画布右键菜单 | `canvas-context-menu` | 节点/画布右键菜单判断逻辑 |
| 浮动搜索 | `floating-search` | 双击画布空白弹出搜索框 |
| 工作流导入导出 | `workflow-io` | JSON 导入/导出，支持替换处理器（YAML 等） |
| 错误处理 | `error-handler` | 捕获错误并派发 `ERROR_OCCURRED` 事件 |
| 默认控件 | `default-controls` | 注册内置的内联控件类型（步进器、开关、下拉） |
| 默认侧边栏按钮 | `default-sidebar-buttons` | 注册默认的侧边栏按钮（自动布局、小地图、保存、加载） |

---

## 5. 节点模板注册 API

从 `src/registry/nodeTemplateRegistry` 导入：

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
    icon: string;                                        // 表情符号或图片路径
    color: string;                                       // 主题色
    styleClass?: string;                                 // 额外 CSS 类名
    inputs?: PortDefinition[];                           // 输入端口
    outputs?: PortDefinition[];                          // 输出端口
    handles?: { sources?: PortDefinition[]; targets?: PortDefinition[] }; // 等效写法
    defaultData: Record<string, unknown>;                // 新节点的默认数据
    properties: Record<string, { type: string; default: unknown }>; // 可编辑属性
    inlineControls?: InlineControl[];                    // 内联控件（步进器、开关等）
    defaultWidth?: number;                               // 节点默认宽度（像素）
    defaultHeight?: number;                              // 节点默认高度（像素）
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

## 6. 边类型注册 API

从 `src/registry/edgeTemplateRegistry` 导入：

- **`registerEdgeType(type: string, component: React.ComponentType<EdgeProps>): void`**  
  注册自定义边组件。之后在添加边时，可通过 `type: 'your-type'` 使用该组件。

- **`getEdgeTypeMap(): Record<string, React.ComponentType<EdgeProps>>`**  
  获取当前所有边类型映射。

示例：
```typescript
import { registerEdgeType } from '../src/registry/edgeTemplateRegistry';
import type { EdgeProps } from '@xyflow/react';

const DashedEdge = (props: EdgeProps) => (
  <path className="react-flow__edge-path" strokeDasharray="6,4" {...props} />
);

registerEdgeType('dashed', DashedEdge);
```

---

## 7. 内联控件注册 API

从 `src/registry/controlComponentRegistry` 导入：

- **`registerControlType(type: string, component: React.ComponentType<ControlComponentProps>): void`**  
  注册自定义内联控件类型（如颜色选择器、滑块）。

- **`getControlComponent(type: string): React.ComponentType<ControlComponentProps> | undefined`**  

控件组件 Props：
```typescript
interface ControlComponentProps {
  value: any;                                    // 当前值
  onChange: (newValue: any) => void;             // 值变更回调
  label?: string;                                // 可选标签
  [key: string]: any;                            // 其他配置（如 min, max, step）
}
```

示例：
```typescript
import { registerControlType } from '../src/registry/controlComponentRegistry';

const ColorPicker = ({ value, onChange }) => (
  <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
);

registerControlType('color-picker', ColorPicker);
```

---

## 8. UI 扩展注册中心

以下注册中心允许 Mod 动态扩展界面，无需修改核心组件。

### 8.1 项目设置面板配置项
从 `src/registry/projectConfigRegistry` 导入：
- `registerProjectConfigField(field: ConfigField)`
- `getRegisteredConfigFields()`

### 8.2 侧边栏按钮
从 `src/registry/sidebarRegistry` 导入：
- `registerSidebarButton(button: SidebarButton)`
- `getSidebarButtons()`

### 8.3 右键菜单项
从 `src/registry/contextMenuRegistry` 导入：
- `registerNodeMenuItem(item: MenuItem)`
- `registerPaneMenuItem(item: MenuItem)`

### 8.4 属性面板扩展槽
从 `src/registry/propsPanelRegistry` 导入：
- `registerPropsPanelExtension(extension: PropsPanelExtension)`

### 8.5 浮动搜索过滤器
从 `src/utils/searchExtensions` 导入：
- `registerSearchFilter(filter: SearchFilter)`

### 8.6 批量连线端口匹配策略
从 `src/registry/batchConnectStrategyRegistry` 导入：
- `registerBatchConnectStrategy(strategy: BatchConnectStrategy, priority?: number)`

### 8.7 历史记录忽略事件
从 `src/registry/historyIgnoreRegistry` 导入：
- `registerHistoryIgnoredEventType(eventType: string)`

具体参数类型请参考源代码或 `CUSTOM_MODS.md` 中的示例。

---

## 9. 常用工具函数

从 `src/utils` 导入：

- **`generateNodeId(): string`**  
  生成全局唯一节点 ID（格式 `node_1`, `node_2` ...）。

- **`generateEdgeId(): string`**  
  生成全局唯一边 ID。

- **`createNode(type: string, position?: { x: number; y: number }): CustomNode`**  
  根据模板类型和坐标创建一个新节点（返回完整节点对象）。

- **`syncIdCounter(nodes: { id: string }[]): void`**  
  根据现有节点 ID 同步全局 ID 计数器，防止新建节点冲突。

- **`exportWorkflow(nodes: any[], edges: any[]): void`**  
  将工作流导出为 JSON 文件下载（底层函数，通常使用 `mod-workflow-io` 更灵活）。

- **`importWorkflow(): Promise<{ nodes: any[]; edges: any[] }>`**  
  从 JSON 文件导入工作流（底层函数）。

---

## 10. 可扩展的工具函数（供继承使用）

以下内置 Mod 导出了可复用的函数，你可以在自己的 Mod 中直接调用或包装它们：

### `mod-node-lifecycle`
```typescript
export function createOnNodesChange(bus: EditorBus): (changes: any[]) => void;
export function createOnEdgesChange(bus: EditorBus): (changes: any[]) => void;
export function createOnConnect(bus: EditorBus): (connection: any) => void;
export function createOnReconnect(bus: EditorBus): (oldEdge: any, newConnection: any) => void;
```

### `mod-connection-menu`
```typescript
export function createConnectionEndHandler(bus: EditorBus): (event: any, connectionState: any) => void;
export function showConnectionMenu(bus: EditorBus, params: {...}): void;
export function hideConnectionMenu(bus: EditorBus): void;
```

### `mod-canvas-context-menu`
```typescript
export function getContextMenuTarget(
    screenX: number,
    screenY: number,
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
    getIntersectingNodes: (rect: { x: number; y: number; width: number; height: number }) => Node[],
    nodes: Node[]
): ContextMenuTarget;
```

### `mod-floating-search`
```typescript
export function openSearch(bus: EditorBus, x: number, y: number): void;
export function closeSearch(bus: EditorBus): void;
```

### `mod-workflow-io`
```typescript
export function setWorkflowIOHandlers(
    exportHandler: (nodes: any[], edges: any[]) => void | Promise<void>,
    importHandler: (bus: EditorBus) => void | Promise<void>
): void;
export function exportWorkflowData(nodes: any[], edges: any[]): Promise<void>;
export function importWorkflowData(bus: EditorBus): Promise<void>;
```

---

## 11. Mod 编写模式示例

### 11.1 订阅事件并执行副作用
```typescript
export const myMod: EditorMod = {
    id: 'my-mod',
    init(bus) {
        const unsub = bus.subscribe(({ event, state }) => {
            if (event.type === 'NODE_ADDED') {
                console.log('新节点：', event.node.id);
            }
        });
        return () => unsub();
    }
};
```

### 11.2 主动派发事件
```typescript
bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: ['node_1', 'node_2'] });
bus.dispatch({ type: 'AUTO_LAYOUT' });
```

### 11.3 注册自定义节点模板
```typescript
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';

export const myTemplateMod: EditorMod = {
    id: 'my-templates',
    init() {
        registerNodeTemplates([/* NodeTemplate 数组 */]);
        return () => {};
    }
};
```

### 11.4 注册自定义边类型
```typescript
import { registerEdgeType } from '../src/registry/edgeTemplateRegistry';

export const myEdgeMod: EditorMod = {
    id: 'my-edges',
    init() {
        registerEdgeType('dashed', (props) => <path className="react-flow__edge-path" strokeDasharray="6,4" {...props} />);
        return () => {};
    }
};
```

### 11.5 动态调整画布视图
```typescript
bus.dispatch({
    type: 'SET_VIEWPORT_LIMITS',
    payload: { minZoom: 0.5, maxZoom: 2 }
});
```

### 11.6 动态切换主题
```typescript
bus.dispatch({
    type: 'SET_THEME_COLORS',
    payload: { '--primary': '#ff6b6b', '--bg-canvas': '#1e1e2e' }
});
```

---

## 12. 防御降级机制

当自定义 Mod 在 `init` 中抛出异常时，系统会：
- 输出红色错误日志。
- 如果存在同名的内置 Mod，自动回退并初始化内置版本（输出黄色警告）。
- 继续初始化其他 Mod，不影响整体功能。

因此，即使你编写的 Mod 有 bug，编辑器依然可运行。

---

## 13. 重要注意事项

- Mod 的 `id` 必须全局唯一，建议使用命名空间（如 `'my-plugin-logger'`）。
- `init` 函数中返回的清理函数用于移除事件监听、定时器等，避免内存泄漏。
- 事件驱动是核心，尽量通过 `dispatch` 改变状态，不要直接操作 DOM 或 React 状态。
- 节点模板注册中心会自动去重，多次注册同类型模板不会重复。
- 若要覆盖内置模板，使用 `setBuiltInTemplates` 并记得在清理时恢复。
- 所有事件定义见 `src/bus/types.ts`，可随时查阅最新完整列表。

---

## 附录：常用 NodeTemplate 示例

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
    outputs: [{ id: 'sum', label: '和', position: 'right', type: 'number' }],
    defaultData: { value: 0, label: '加法器' },
    properties: { value: { type: 'number', default: 0 } },
    inlineControls: [
        { key: 'mode', type: 'select-dropdown', label: '模式', options: ['A+B', 'A-B'], default: 'A+B' }
    ]
}
```

更多端口定义和控件配置请参考 `NODE_TEMPLATE_API.md`。