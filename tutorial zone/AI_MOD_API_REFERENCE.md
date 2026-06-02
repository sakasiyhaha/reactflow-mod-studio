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

## 3. 新增功能 API

### 3.1 动态端口

在 `NodeTemplate` 中增加字段：

```typescript
interface NodeTemplate {
    // ... 原有字段
    dynamicPorts?: (data: Record<string, unknown>) => {
        inputs?: PortDefinition[];
        outputs?: PortDefinition[];
    };
    dynamicPortsDeps?: (data: Record<string, unknown>) => string[];
}
```

- `dynamicPorts`：根据节点数据返回动态生成的端口。
- `dynamicPortsDeps`：声明哪些数据字段的变化会触发端口重新计算。若不提供，默认使用 `Object.keys(data)`。

**实现机制**：组件内部使用 `useUpdateNodeInternals` 在端口结构变化时刷新节点布局。开发环境下会打印变化日志。

### 3.2 资源外部化（ResourceStore）

```typescript
import { ResourceStore } from '../src/store/ResourceStore';

// 注册资源，返回唯一 ID
const id = ResourceStore.register(blob: Blob): string;

// 获取资源 Blob
const blob = ResourceStore.get(id: string): Blob | null;

// 增加引用计数（复制节点时自动调用）
ResourceStore.retain(id: string): boolean;

// 减少引用计数，归零时删除资源（删除节点时自动调用）
ResourceStore.release(id: string): boolean;

// 检查资源是否存在
ResourceStore.has(id: string): boolean;

// 获取所有资源的快照（调试用）
ResourceStore.snapshot(): Record<string, { size: number; refCount: number }>;

// 清空所有资源（测试用）
ResourceStore.clear(): void;
```

**自动集成**：
- 节点删除时，`useEditorBus` 会自动释放 `data._resources` 中的资源。
- 复制/粘贴时，`mod-clipboard` 会自动增加引用计数。
- 工作流导出时，资源自动转为 base64 嵌入 JSON。
- 工作流导入时，base64 恢复为 Blob 并重新注册，节点中的资源 ID 自动更新。

### 3.3 导入导出钩子

从 `src/mods/mod-workflow-io` 导入：

```typescript
type BeforeExportHook = (data: { nodes: any[]; edges: any[] }) => 
    { nodes: any[]; edges: any[] } | Promise<{ nodes: any[]; edges: any[] }>;

type AfterImportHook = (data: { nodes: any[]; edges: any[] }) => void | Promise<void>;

// 注册导出前钩子
registerBeforeExportHook(hook: BeforeExportHook): () => void;

// 注册导入后钩子
registerAfterImportHook(hook: AfterImportHook): () => void;
```

钩子按注册顺序执行，支持异步。钩子内部错误不会阻塞流程，仅记录错误。

### 3.4 确认辅助函数

从 `src/bus/confirmable` 导入：

```typescript
async function dispatchConfirmable(
    bus: EditorBus,
    event: EditorEvent,
    message: string
): Promise<void>;
```

- 弹出 `window.confirm`，用户确认后同步派发 `event`，取消则 reject Promise。
- 适用于删除节点等危险操作。

### 3.5 数字配置（消除魔法数字）

所有数字常量集中在 `config/numbers.ts`：

```typescript
import { LAYOUT, TIMEOUTS, HISTORY, NODE, UI, TOOLTIP, WORKFLOW_IO } from '../../config/numbers';
```

常用常量：

| 模块 | 常量 | 默认值 | 说明 |
|------|------|--------|------|
| LAYOUT | `DEFAULT_NODE_WIDTH` | 160 | 默认节点宽度 |
| LAYOUT | `DEFAULT_NODE_HEIGHT` | 60 | 默认节点高度 |
| LAYOUT | `MIN_ALIGN_GAP` | 20 | 对齐分布最小间距 |
| LAYOUT | `AUTO_LAYOUT_HORIZONTAL_SPACING` | 250 | 自动布局水平间距 |
| TIMEOUTS | `FILE_IMPORT_TIMEOUT` | 60000 | 文件导入超时(ms) |
| TIMEOUTS | `CANCEL_DETECTION_DELAY` | 50 | 取消检测延迟(ms) |
| HISTORY | `DEFAULT_MAX_HISTORY` | 50 | 默认最大历史记录数 |
| NODE | `PORT_VERTICAL_SPACING` | 28 | 垂直端口间距 |
| TOOLTIP | `TOOLTIP_DELAY` | 300 | 普通提示延迟 |
| TOOLTIP | `TOPBAR_TOOLTIP_DELAY` | 500 | 顶部栏提示延迟 |

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
  获取当前所有节点模板（内置 + 自定义）。
- **`registerNodeTemplates(templates: NodeTemplate[]): () => void`**  
  注册自定义节点模板，返回清理函数。
- **`setBuiltInTemplates(templates: NodeTemplate[]): void`**  
  完全替换内置模板。
- **`resetBuiltInTemplates(): void`**  
  恢复默认内置模板。

---

## 6. 边类型注册 API

从 `src/registry/edgeTemplateRegistry` 导入：

- **`registerEdgeType(type: string, component: React.ComponentType<EdgeProps>): () => void`**
- **`getEdgeTypeMap(): Record<string, React.ComponentType<EdgeProps>>`**
- **`setDefaultEdgeComponent(component: React.ComponentType<EdgeProps>): void`**

---

## 7. 内联控件注册 API

从 `src/registry/controlComponentRegistry` 导入：

- **`registerControlType(type: string, component: React.ComponentType<ControlComponentProps>): () => void`**
- **`getControlComponent(type: string): React.ComponentType<ControlComponentProps> | undefined`**

---

## 8. UI 扩展注册中心

所有注册中心均位于 `src/registry/`，每个注册函数返回清理函数。

| 注册中心 | 主要函数 | 说明 |
|----------|----------|------|
| `sidebarRegistry` | `registerSidebarComponent`, `registerSidebarButton` | 左侧栏组件/按钮 |
| `topBarRegistry` | `registerTopBarLeft/Center/Right` | 顶部栏 |
| `bottomBarRegistry` | `registerBottomBarLeft/Center/Right` | 底部栏 |
| `contextMenuRegistry` | `registerNodeMenuItem`, `registerPaneMenuItem` | 右键菜单 |
| `propsPanelRegistry` | `registerPropsPanelExtension`, `registerPropsPanelComponent` | 属性面板 |
| `projectConfigRegistry` | `registerProjectConfigField` | 项目设置面板 |
| `batchConnectStrategyRegistry` | `registerBatchConnectStrategy` | 批量连线端口匹配策略 |
| `historyIgnoreRegistry` | `registerHistoryIgnoredEventType` | 历史记录忽略事件 |
| `connectionRuleRegistry` | `registerConnectionRule`, `setConnectionRule` | 端口类型连接规则 |

---

## 9. 常用工具函数

从 `src/utils` 导入：

- **`generateNodeId(): string`**  
- **`generateEdgeId(): string`**  
- **`createNode(type: string, position?: { x: number; y: number }): CustomNode`**  
- **`syncIdCounter(nodes: { id: string }[]): void`**  
- **`exportWorkflow(nodes: any[], edges: any[]): Promise<void>`**（异步）  
- **`importWorkflow(): Promise<{ nodes: any[]; edges: any[] }>`**  

---

## 10. 可扩展的工具函数（供继承使用）

| Mod | 导出函数 |
|-----|----------|
| `mod-node-lifecycle` | `createOnNodesChange`, `createOnEdgesChange`, `createOnConnect`, `createOnReconnect` |
| `mod-connection-menu` | `createConnectionEndHandler`, `showConnectionMenu`, `hideConnectionMenu` |
| `mod-canvas-context-menu` | `getContextMenuTarget` |
| `mod-floating-search` | `openSearch`, `closeSearch` |
| `mod-workflow-io` | `setWorkflowIOHandlers`, `exportWorkflowData`, `importWorkflowData` |
| `mod-reconnect` | `isReconnecting`, `validateReconnectConnection` |
| `mod-history` | `setHistoryStore` |

---

## 11. 端口类型连接规则 API

从 `src/registry/connectionRuleRegistry` 导入：

```typescript
registerConnectionRule(sourceType: string, allowedTargetTypes: string[]): void;
setConnectionRule(sourceType: string, allowedTargetTypes: string[]): void;
removeConnectionRule(sourceType: string, targetType?: string): void;
getAllowedTargets(sourceType: string): ReadonlySet<string>;
isValidConnectionType(sourceType: string, targetType: string): boolean;
clearConnectionRules(): void;
```

---

## 12. 重要注意事项

- **动态端口**：端口 ID 不能与静态端口重复；`dynamicPortsDeps` 应精确声明依赖，避免性能问题。
- **资源管理**：不要将 Blob 直接存入 `data`，应使用 `ResourceStore`。粘贴和删除会自动管理引用计数，无需手动处理。
- **导入导出钩子**：钩子顺序执行，建议保持轻量，避免长时间阻塞。
- **确认辅助函数**：使用 `window.confirm` 会阻塞 UI，适合简单确认；如需自定义模态框，可自行实现。
- **数字配置**：修改 `config/numbers.ts` 后需重启开发服务器。

---

## 附录：示例 Mod 快速参考

| 示例 Mod | 关键 API 演示 |
|----------|---------------|
| `logger-node-mod.ts` | `registerNodeTemplates`, 内联控件 |
| `dynamic-output-mod.ts` | `dynamicPorts`, `dynamicPortsDeps` |
| `confirm-delete-mod.ts` | `dispatchConfirmable`, `registerNodeMenuItem` |
| `timestamp-hook-mod.ts` | `registerBeforeExportHook`, `registerAfterImportHook` |
| `image-node-mod.ts` | `ResourceStore`, 节点添加监听 |
| `export-svg-mod.ts` | `registerPaneMenuItem`, 自定义事件 |

完整代码见 `custom-mods/` 目录。