# 自定义 Mod 开发指南

本编辑器采用事件总线 + Mod 插件架构。你可以编写自己的 Mod 来添加功能，完全不需要修改核心源代码，实现功能扩展与核心代码的解耦，提升开发效率与可维护性。

---

## 快速上手

### 1. 创建 Mod 文件

在 `custom-mods/` 目录下新建一个 `.ts` 文件，例如 `my-logger-mod.ts`，内容如下：

```ts
import type { EditorMod } from '../src/bus/types';

export const myLoggerMod: EditorMod = {
    id: 'my-logger',  // 必须唯一，用于标识当前Mod，避免与其他Mod冲突
    init(bus) {
        // 订阅所有事件，监听编辑器的各类操作
        const unsub = bus.subscribe(({ event, state }) => {
            console.log(`[my-logger] 事件: ${event.type}`, event);
        });

        // 返回取消订阅函数，组件卸载时自动调用，避免内存泄漏
        return () => {
            unsub();
        };
    },
};
```

### 2. 注册 Mod

打开 `custom-mods/index.ts`，导入并添加你的 Mod，注册完成后即可被编辑器识别：

```ts
import { myLoggerMod } from './my-logger-mod';
import type { EditorMod } from '../src/bus/types';

export const customMods: EditorMod[] = [
    myLoggerMod,  // 加入自定义Mod，可同时添加多个
];
```

保存文件，刷新浏览器即可生效，无需重启开发服务器。

## Mod 接口说明

每个 Mod 必须符合 `EditorMod` 接口规范，确保能被编辑器正确加载和执行，接口定义如下：

```ts
export interface EditorMod {
    id: string;                                     // 唯一标识，全局不可重复
    init: (bus: EditorBus) => (() => void) | void;  // 初始化方法，可返回清理函数（用于组件卸载时释放资源）
}
```

## EditorBus 提供的能力

通过 `init(bus)` 中的 `bus` 对象（事件总线核心实例），你可以实现对编辑器的各类操作，核心能力如下：

- `bus.getState()` → 获取当前编辑器状态，包含 `{ nodes, edges, selection, mode }` 四个核心属性
- `bus.dispatch(event)` → 派发事件，触发编辑器状态变更（如添加节点、切换模式等）
- `bus.subscribe(listener)` → 订阅所有编辑器事件，返回取消订阅的函数，用于停止监听事件

## 常用事件类型

编辑器会在各类操作时触发对应事件，Mod 可通过订阅事件实现功能扩展，常用事件如下表所示：

| 事件 | 何时触发 |
|------|----------|
| `NODE_ADDED` | 添加节点 |
| `NODES_ADDED` | 批量添加节点 |
| `NODE_DELETED` | 删除节点 |
| `NODE_DATA_CHANGED` | 节点数据变更 |
| `NODE_POSITIONS_CHANGED` | 节点位置变化 |
| `EDGE_ADDED` | 添加边 |
| `EDGE_DELETED` | 删除边 |
| `EDGE_RECONNECTED` | 边重连 |
| `SELECTION_CHANGED` | 选中状态变化 |
| `MODE_CHANGED` | 编辑器模式变化 |
| `WORKFLOW_LOADED` | 工作流导入或重置 |
| `HISTORY_UNDO` / `HISTORY_REDO` | 撤销/重做 |
| `BATCH_CONNECT_START` / `EXECUTE` / `CANCEL` | 批量连线 |
| `ALIGN_LEFT` / `ALIGN_RIGHT` / … | 对齐操作 |
| `AUTO_LAYOUT` | 自动布局 |

完整事件列表请参考 `src/bus/types.ts` 文件。

## 示例：自动保存 Mod

编辑器已提供示例 Mod 文件 `custom-mods/example-auto-save-mod.ts`，无需编写额外代码，将其注册到 `index.ts` 即可使用：

```ts
import { exampleAutoSaveMod } from './example-auto-save-mod';

export const customMods: EditorMod[] = [
    exampleAutoSaveMod,  // 注册自动保存Mod
];
```

该 Mod 会在每次工作流变更时（如节点添加、删除、数据修改等），自动将工作流数据保存到 `localStorage` 的 `auto-saved-workflow` 键中，防止数据丢失。

## 注意事项

- 请不要修改 `src/bus/`、`src/mods/`、`src/components/` 等核心目录，除非你完全明白修改带来的潜在影响，避免破坏编辑器原有功能。
- Mod 的 `id` 应保持全局唯一，避免与其他 Mod 冲突，建议采用“功能描述+标识”的命名方式（如 `my-logger`、`auto-save`）。
- 所有自定义 Mod 统一放在 `custom-mods/` 目录下，通过 `custom-mods/index.ts` 集中管理，便于后续维护和扩展。
- 如果遇到开发问题，请查阅 `src/mods/` 下的内置 Mod 源码作为参考，内置 Mod 遵循相同的开发规范，可快速借鉴实现思路。

## 更多可能

借助事件总线的灵活性，你可以发挥创意，实现各类个性化功能，例如：

- 撤销/重做按钮（通过派发 `HISTORY_UNDO` / `HISTORY_REDO` 事件）
- 自定义导出格式（监听 `WORKFLOW_LOADED` 事件后，转换工作流数据为指定格式）
- 快捷键增强（如绑定 `Ctrl+S` 触发保存操作，`Ctrl+Z` 触发撤销操作）
- 统计分析（订阅节点相关事件，记录节点数量变化、操作频率等数据）

只要能通过事件总线监听或派发事件，均可实现对应的功能扩展，无需修改核心代码。

---

## 最终验证

Mod 开发完成后，可通过以下步骤验证功能是否正常，确保可插拔性和稳定性：

1. 确保已创建 `custom-mods/` 文件夹，内含 `index.ts` 和 `example-auto-save-mod.ts`（示例 Mod）。
2. 确认 `src/mods/index.ts` 和 `src/App.tsx` 已按上述修改更新，确保 Mod 能被编辑器正确加载。
3. 运行 `npm run typecheck` 命令，检查代码类型是否正确，应无任何错误提示。
4. 启动开发服务器，打开浏览器控制台，应看到示例 Mod 的自动保存日志，说明 Mod 已成功生效。
5. 在 `custom-mods/index.ts` 中注释掉示例 Mod，刷新浏览器后，自动保存功能消失，说明 Mod 具备良好的可插拔性。

这套方案零侵入原有代码（只有两个小改动且完全向后兼容），其他人可以直接克隆项目，然后在 `custom-mods/` 中开发自己的插件，无需关注核心代码的实现细节，大幅提升协作开发效率。
```