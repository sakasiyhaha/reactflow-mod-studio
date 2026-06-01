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

（此部分与之前版本相同，为节省篇幅不再重复，请参考原文件）

---

## 4. 内置 Mod 列表及其 id

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

---

## 5. 节点模板注册 API

从 `src/registry/nodeTemplateRegistry` 导入：

- **`getAllTemplates(): NodeTemplate[]`**  
  获取当前所有节点模板（内置 + 自定义，自定义覆盖同类型内置模板）。

- **`registerNodeTemplates(templates: NodeTemplate[]): () => void`**  
  注册自定义节点模板（自动去重）。**返回清理函数**，调用后可移除本次注册的模板。

- **`setBuiltInTemplates(templates: NodeTemplate[]): void`**  
  完全替换内置模板，可用于打造专属节点库。

- **`resetBuiltInTemplates(): void`**  
  恢复内置模板为默认值（通常作为 Mod 清理函数的一部分）。

- **`resetTemplates(): void`**  
  重置自定义模板列表，恢复到仅内置模板。

### 模板类型定义

```typescript
interface NodeTemplate {
    type: string;
    title: string;
    category: string;
    icon: string;
    color: string;
    styleClass?: string;
    inputs?: PortDefinition[];
    outputs?: PortDefinition[];
    handles?: { sources?: PortDefinition[]; targets?: PortDefinition[] };
    defaultData: Record<string, unknown>;
    properties: Record<string, { type: string; default: unknown }>;
    inlineControls?: InlineControl[];
    defaultWidth?: number;
    defaultHeight?: number;
    // 动态端口（高级）
    dynamicPorts?: (data: Record<string, unknown>) => { inputs?: PortDefinition[]; outputs?: PortDefinition[] };
}

interface PortDefinition {
    id: string;
    label: string;
    type: 'number' | 'boolean' | 'exec' | '*';
    position: 'left' | 'right' | 'top' | 'bottom';
    style?: Record<string, unknown>;
}
```

---

## 6. 边类型注册 API

从 `src/registry/edgeTemplateRegistry` 导入：

- **`registerEdgeType(type: string, component: React.ComponentType<EdgeProps>): () => void`**  
  注册自定义边组件，返回清理函数。

- **`getEdgeTypeMap(): Record<string, React.ComponentType<EdgeProps>>`**  
  获取所有边类型映射。

- **`setDefaultEdgeComponent(component: React.ComponentType<EdgeProps>): void`**  
  设置默认边组件。

---

## 7. 内联控件注册 API

从 `src/registry/controlComponentRegistry` 导入：

- **`registerControlType(type: string, component: React.ComponentType<ControlComponentProps>): () => void`**  
  注册自定义内联控件类型，返回清理函数。

- **`getControlComponent(type: string): React.ComponentType<ControlComponentProps> | undefined`**  

控件组件 Props：
```typescript
interface ControlComponentProps {
  value: any;
  onChange: (newValue: any) => void;
  label?: string;
  [key: string]: any;
}
```

---

## 8. UI 扩展注册中心

以下注册中心允许 Mod 动态扩展界面。**所有注册函数均返回一个清理函数，调用后可移除注册项。**

### 8.1 项目设置面板配置项
从 `src/registry/projectConfigRegistry` 导入：
- `registerProjectConfigField(field: ConfigField): () => void`
- `getRegisteredConfigFields(): ConfigField[]`
- `getDefaultConfigValues(): Record<string, any>`
- `validateConfigValue(key: string, value: any): boolean`

### 8.2 侧边栏
从 `src/registry/sidebarRegistry` 导入：
- `registerSidebarComponent(component: SidebarComponent): () => void`
- `registerSidebarButton(button: SidebarButton): () => void`
- `getSidebarComponents(): SidebarComponent[]`
- `getSidebarButtons(): SidebarButton[]`
- `updateComponentOrder(id: string, newOrder: number): void`（拖拽排序后调用）
- `loadOrderFromLocalStorage(): void`（加载保存的顺序）

### 8.3 顶部栏
从 `src/registry/topBarRegistry` 导入：
- `registerTopBarLeft(item: TopBarItem): () => void`
- `registerTopBarCenter(item: TopBarItem): () => void`
- `registerTopBarRight(item: TopBarItem): () => void`

### 8.4 底部栏
从 `src/registry/bottomBarRegistry` 导入：
- `registerBottomBarLeft(item: BottomBarItem): () => void`
- `registerBottomBarCenter(item: BottomBarItem): () => void`
- `registerBottomBarRight(item: BottomBarItem): () => void`

### 8.5 右键菜单项
从 `src/registry/contextMenuRegistry` 导入：
- `registerNodeMenuItem(item: MenuItem): () => void`
- `registerPaneMenuItem(item: MenuItem): () => void`

### 8.6 属性面板
从 `src/registry/propsPanelRegistry` 导入：
- `registerPropsPanelExtension(extension: PropsPanelExtension): () => void`
- `registerPropsPanelComponent(component: PropsPanelComponent): () => void`

### 8.7 浮动搜索过滤器
从 `src/utils/searchExtensions` 导入：
- `registerSearchFilter(filter: SearchFilter): () => void`

### 8.8 批量连线端口匹配策略
从 `src/registry/batchConnectStrategyRegistry` 导入：
- `registerBatchConnectStrategy(strategy: BatchConnectStrategy, priority?: number): () => void`

### 8.9 历史记录忽略事件
从 `src/registry/historyIgnoreRegistry` 导入：
- `registerHistoryIgnoredEventType(eventType: string): () => void`
- `resetHistoryIgnoreRegistry(): void`

---

## 9. 扩展点管理器（ExtensionPoint）

为统一所有注册中心的行为，项目提供了 `ExtensionManager` 类（`src/registry/ExtensionPoint.ts`）。

```typescript
export interface ExtensionPoint<T = any> {
  id: string;
  dependencies?: string[];
  priority?: number;
  activate: (context?: any) => T | void;
  deactivate?: () => void;
}

export class ExtensionManager {
  register(ext: ExtensionPoint): () => void;
  getExtension(id: string): ExtensionPoint | undefined;
  updatePriority(id: string, newPriority: number): boolean;
  resolveOrder(): ExtensionPoint[];   // 拓扑排序 + 优先级排序
  clear(): void;
}
```

大多数注册中心内部已使用 `ExtensionManager`，你通常不需要直接操作它，但了解其机制有助于理解扩展点的依赖和优先级。

---

## 10. 资源管理器（ResourceStore）

用于管理节点中的大容量数据（纹理、音频、模型等），支持引用计数。

从 `src/store/ResourceStore` 导入：

```typescript
export const ResourceStore: {
  register(blob: Blob): string;                    // 注册资源，返回 ID
  get(id: string): Blob | null;                    // 获取资源
  retain(id: string): boolean;                     // 增加引用计数
  release(id: string): boolean;                    // 减少引用计数，归零时删除
  has(id: string): boolean;                        // 检查资源是否存在
  snapshot(): Record<string, { size: number; refCount: number }>;
  clear(): void;
};
```

### 使用示例

```typescript
// 注册资源
const blob = await fetch('/image.png').then(r => r.blob());
const resId = ResourceStore.register(blob);

// 在节点数据中存储资源 ID
node.data._resources = [resId];

// 获取资源并显示
const imgBlob = ResourceStore.get(resId);
const url = URL.createObjectURL(imgBlob);
```

**注意**：当节点被复制粘贴时，编辑器会自动调用 `retain`；当节点被删除时，会自动调用 `release`。你无需手动管理，除非直接操作资源。

---

## 11. 历史记录存储接口（IHistoryStore）

允许替换默认的历史记录实现。

从 `src/history/HistoryStore` 导入：

```typescript
export interface IHistoryStore {
  canUndo(): boolean;
  canRedo(): boolean;
  getPastCount(): number;
  getFutureCount(): number;
  recordState(state: EditorState): void;
  undo(currentState: EditorState): EditorState | null;
  redo(currentState: EditorState): EditorState | null;
  clear(): void;
}

export class DefaultHistoryStore implements IHistoryStore {
  constructor(maxHistory?: number);
}

// 替换历史存储
import { setHistoryStore } from '../src/mods/mod-history';
setHistoryStore(new DefaultHistoryStore(100));
```

---

## 12. 常用工具函数

从 `src/utils` 导入：

- **`generateNodeId(): string`**  
  生成唯一节点 ID（格式 `node_1`, `node_2` ...）。

- **`generateEdgeId(): string`**  
  生成唯一边 ID。

- **`createNode(type: string, position?: { x: number; y: number }): CustomNode`**  
  根据模板类型和坐标创建新节点。

- **`syncIdCounter(nodes: { id: string }[]): void`**  
  同步 ID 计数器，防止新建节点冲突。

- **`exportWorkflow(nodes: any[], edges: any[]): void`**  
  导出工作流为 JSON（底层函数）。

- **`importWorkflow(): Promise<{ nodes: any[]; edges: any[] }>`**  
  导入工作流（底层函数）。

---

## 13. 可扩展的工具函数（供继承使用）

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

### `mod-reconnect`
```typescript
export function isReconnecting(): boolean;
export function validateReconnectConnection(connection: Connection, edges: Edge[], nodes: Node[]): boolean;
```

### `mod-history`
```typescript
export function setHistoryStore(store: IHistoryStore): void;
```

---

## 14. 端口类型兼容规则注册中心 API

从 `src/registry/connectionRuleRegistry` 导入：

```typescript
export function registerConnectionRule(sourceType: string, allowedTargetTypes: string[]): void;
export function setConnectionRule(sourceType: string, allowedTargetTypes: string[]): void;
export function removeConnectionRule(sourceType: string, targetType?: string): void;
export function getAllowedTargets(sourceType: string): ReadonlySet<string>;
export function isValidConnectionType(sourceType: string, targetType: string): boolean;
export function clearConnectionRules(): void;
export function getConnectionRulesSnapshot(): Record<string, string[]>;
```

默认规则自动初始化：
- `number` → `['number', 'boolean', '*']`
- `boolean` → `['boolean', 'number', '*']`
- `exec` → `['exec', '*']`
- `*` → `['number', 'boolean', 'exec', '*']`

---

## 15. Mod 编写模式示例

### 15.1 订阅事件并执行副作用
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

### 15.2 主动派发事件
```typescript
bus.dispatch({ type: 'SELECTION_CHANGED', nodeIds: ['node_1', 'node_2'] });
bus.dispatch({ type: 'AUTO_LAYOUT', options: { horizontalSpacing: 300, verticalSpacing: 180 } });
bus.dispatch({ type: 'FIT_VIEW', options: { padding: 0.1, duration: 300 } });
```

### 15.3 注册自定义节点模板（带清理）
```typescript
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';

export const myTemplateMod: EditorMod = {
    id: 'my-templates',
    init() {
        const unregister = registerNodeTemplates([myNodeTemplate]);
        return unregister;   // Mod 卸载时自动移除模板
    }
};
```

### 15.4 注册自定义边类型
```typescript
import { registerEdgeType } from '../src/registry/edgeTemplateRegistry';

export const myEdgeMod: EditorMod = {
    id: 'my-edges',
    init() {
        const unregister = registerEdgeType('dashed', DashedEdge);
        return unregister;
    }
};
```

### 15.5 使用资源管理器
```typescript
import { ResourceStore } from '../src/store/ResourceStore';

const blob = await fetch('/texture.png').then(r => r.blob());
const resId = ResourceStore.register(blob);
// 将 resId 存储到节点 data._resources
```

### 15.6 替换历史记录实现
```typescript
import { setHistoryStore } from '../src/mods/mod-history';
import { DefaultHistoryStore } from '../src/history';

setHistoryStore(new DefaultHistoryStore(200));
```

---

## 16. 防御降级机制

当自定义 Mod 在 `init` 中抛出异常时，系统会：
- 输出红色错误日志。
- 如果存在同名的内置 Mod，自动回退并初始化内置版本（输出黄色警告）。
- 继续初始化其他 Mod，不影响整体功能。

因此，即使你编写的 Mod 有 bug，编辑器依然可运行。

---

## 17. 重要注意事项

- Mod 的 `id` 必须全局唯一，建议使用命名空间（如 `'my-plugin-logger'`）。
- `init` 函数中返回的清理函数用于移除事件监听、定时器等，避免内存泄漏。
- 事件驱动是核心，尽量通过 `dispatch` 改变状态，不要直接操作 DOM 或 React 状态。
- 节点模板注册中心会自动去重，多次注册同类型模板不会重复。
- 若要覆盖内置模板，使用 `setBuiltInTemplates` 并记得在清理时恢复。
- 所有事件定义见 `src/bus/types.ts`，可随时查阅最新完整列表。
- 注册中心注册的函数建议保存返回的清理函数，在 Mod 卸载时调用，避免内存泄漏。
- 对于大容量数据，使用 `ResourceStore` 管理，不要直接嵌入节点数据。
- 如需自定义历史记录行为，可使用 `setHistoryStore` 替换实现。

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
```