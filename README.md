# reactflow-mod-studio

一个基于 React Flow 的可扩展节点编辑器。核心思路很简单：**事件总线 + Mod 插件**。  
你在编辑器里的每一步操作都会变成事件向外派发，而所有功能（包括自动保存、撤销、快捷键、自定义节点）都以 Mod 的形式挂载，**完全不用改核心代码**。

---

## 能做什么

- **事件驱动，透明可控**  
  节点的增删、连线、选中、模式切换…… 全部以事件的形式抛出。你可以监听这些事件来调试、统计，或者触发自己的逻辑。

- **Mod 即插件**  
  想加自动保存？写个 Mod。想覆盖默认的节点库？写个 Mod。想给某个快捷键绑一个新行为？还是 Mod。  
  修改只发生在 `custom-mods/` 目录里，核心源码保持干净。

- **节点模板可定制**  
  内置的节点类型不喜欢？通过注册中心可以动态添加、替换或重置节点模板，完全换成你自己的那套。

- **UI 扩展点丰富**  
  通过内置的注册中心，你可以动态添加侧边栏按钮、右键菜单项、属性面板扩展槽、浮动搜索过滤器、自定义边类型、内联控件等，无需修改任何核心组件。所有注册 API 均返回清理函数，Mod 卸载时自动移除注册项。

- **剪贴板保留连线**  
  复制 / 粘贴节点时，它们之间的边也会原样保留，不是只复制一堆孤零零的节点。

- **批量操作**  
  多选节点后一键批量连线，还有左 / 右 / 顶 / 底对齐和水平 / 垂直均分，不用一个一个拖。

- **撤销 / 重做**  
  基于历史快照，支持 `Ctrl+Z` / `Ctrl+Y`，改坏了随时回去。

- **自动保存 / 恢复**  
  项目自带了示例 Mod，能自动把工作流存进 `localStorage`，刷新页面后还能恢复回来。

- **拖拽 / 搜索添加节点**  
  从左侧栏拖入，或者双击画布直接搜索节点名字。

- **端口偏移可调**  
  通过 CSS 变量 `--handle-offset-distance` 可动态调整端口相对于节点的偏移距离，适应不同主题或缩放需求。

- **自动布局参数可配置**  
  `AUTO_LAYOUT` 事件支持传入 `horizontalSpacing`、`verticalSpacing` 等参数，布局密度随意控制。

---

## 快速开始

把仓库拉到本地，装好依赖，然后启动开发服务器：

```bash
git clone <你的仓库地址> reactflow-mod-studio
cd reactflow-mod-studio
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 就能看到编辑器了。

---

## 项目里都有什么

只看核心目录，更多细节可以直接翻源码。

```
reactflow-mod-studio/
├── config/               # 调试开关、编辑器参数、全局默认尺寸
├── constants/            # 常量（最大历史记录数、注册中心优先级常量等）
├── custom-mods/          # 你的自定义 Mod（唯一需要常改的地方）
├── public/               # 静态资源
├── src/
│   ├── bus/              # 事件总线，整个编辑器的通信中枢
│   ├── mods/             # 内置 Mod（历史记录、剪贴板、对齐、UI 布局等）
│   ├── components/       # UI 组件（全部通过注册中心可扩展）
│   ├── hooks/            # 自定义 Hook（布局、项目配置、端口样式）
│   ├── registry/         # 扩展注册中心（侧边栏、右键菜单、属性面板、控件类型等）
│   └── utils/            # 工具函数、类型定义、对齐/布局算法
├── tutorial zone/        # 📘 所有教程文档（AI Mod API、配对编程指南、自定义 Mod 等）
├── .gitignore
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.js
```

> **关于 `tutorial zone`**：这个目录里放着开发过程中沉淀下来的各种指南和参考文档，比如 `CUSTOM_MODS.md`（自定义 Mod 教程）、`AI_MOD_API_REFERENCE.md`（完整 API 参考）、`NODE_TEMPLATE_API.md`（节点模板与端口指南）等。如果你想深入了解某一块功能，可以从这里开始。

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 本地预览生产构建 |

---

## 怎么写一个自己的 Mod

详细教程在 `tutorial zone/CUSTOM_MODS.md` 里，这里只说最核心的三步：

1. 在 `custom-mods/` 下新建一个 `.ts` 文件，实现 `EditorMod` 接口。
2. 在 `custom-mods/index.ts` 里 import 并加入数组。
3. 刷新浏览器，Mod 生效。

你可以参考 `custom-mods/` 下已经写好的几个例子（自动保存、自动加载、自定义节点模板等）。

---

## 内置 Mod 一览

| Mod 名称 | id | 说明 |
|----------|-----|------|
| 历史记录 | `history` | 撤销/重做，支持动态最大步数 |
| 批量连线 | `batch-connect` | 多选节点后一键连接 |
| 对齐与自动布局 | `alignment` | 对齐、均分、自动布局（支持参数） |
| 剪贴板 | `clipboard` | Ctrl+C/V/X/A，保留连线 |
| 重连管理 | `reconnect` | 边重连逻辑，抑制连接菜单干扰 |
| 项目配置 | `project-config` | 设置面板，配置持久化 |
| 节点生命周期 | `node-lifecycle` | React Flow 回调适配为事件 |
| 连接菜单 | `connection-menu` | 拖线到空白弹出节点选择菜单 |
| 画布右键菜单 | `canvas-context-menu` | 右键菜单判断逻辑 |
| 浮动搜索 | `floating-search` | 双击画布弹出节点搜索框 |
| 工作流导入导出 | `workflow-io` | JSON 导入导出，可替换为 YAML 等 |
| 错误处理 | `error-handler` | 统一错误 Toast 提示 |
| 默认控件 | `default-controls` | 注册步进器、开关、下拉等控件 |
| 默认侧边栏按钮 | `default-sidebar-buttons` | 自动布局、小地图、保存/加载按钮 |
| 默认 UI | `default-ui` | 顶部栏、底部栏、左侧栏、右侧栏默认布局 |

---

## 扩展能力亮点

- **端口偏移距离**：通过 CSS 变量 `--handle-offset-distance` 动态修改，支持运行时调整。
- **自动布局参数**：派发 `AUTO_LAYOUT` 时可传入 `horizontalSpacing`, `verticalSpacing`, `startX`, `startY`，灵活控制布局密度。
- **批量连线策略优先级**：使用 `BATCH_CONNECT_STRATEGY_PRIORITY` 常量，便于自定义策略优先级。
- **注册中心清理机制**：所有注册 API 均返回 `unregister` 函数，Mod 卸载时自动清理，无内存泄漏。
- **精确的节点尺寸订阅**：`GenericNode` 使用 `nodeLookup.get(id)` 精确订阅，避免全量遍历，性能优异。
- **取消文件选择不卡死**：导入工作流时取消选择会正确关闭加载遮罩，体验流畅。
- **动态端口类型规则**：通过 `registerConnectionRule` API 可随时添加自定义端口类型的连接规则，无需修改核心。
---

## 许可证

MIT