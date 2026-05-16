# 扩展工作流格式：为编辑器添加 YAML 导入/导出支持

本文档将指导你为 `reactflow-mod-studio` 添加 **YAML 格式** 的工作流导入/导出功能，全程**无需修改任何核心源码**，仅通过编写一个自定义 Mod 实现。这充分体现了本项目的“一切皆可替换”架构理念。

## 适用读者

- 希望将工作流保存为 YAML（而非默认 JSON）的开发者。
- 需要理解如何扩展内置 Mod 功能的高级用户。

## 前置条件

- 已成功运行 `reactflow-mod-studio` 项目。
- 熟悉 TypeScript 和 Node.js 开发环境。
- 已阅读项目根目录下的 `tutorial zone/CUSTOM_MODS.md`（Mod 编写指南）。

## 原理简介

内置的 `workflow-io` Mod（位于 `src/mods/mod-workflow-io.ts`）提供了一组可替换的函数句柄：

- `_exportWorkflowData`：负责将 `nodes` 和 `edges` 导出为文件。
- `_importWorkflowData`：负责从文件读取数据并派发 `WORKFLOW_LOADED` 事件。

通过调用 `setWorkflowIOHandlers(exportHandler, importHandler)` 可以动态替换这两个函数的实现。因此，我们只需在自定义 Mod 中调用该 API，即可完全接管工作流的导入/导出逻辑，而无需修改 `App.tsx` 或任何其他核心文件。

## 步骤详解

### 1. 安装 YAML 处理库

在项目**根目录**（即 `package.json` 所在目录）执行：

```bash
npm install js-yaml @types/js-yaml
```

### 2. 创建自定义 Mod 文件

在 `custom-mods/` 目录下新建 `yaml-workflow-mod.ts`，内容如下：

```typescript
// custom-mods/yaml-workflow-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { setWorkflowIOHandlers } from '../src/mods/mod-workflow-io';
import yaml from 'js-yaml';
import { DEBUG } from '../config/debug';

/**
 * 将工作流导出为 YAML 文件并下载
 */
async function exportToYaml(nodes: any[], edges: any[]): Promise<void> {
  const data = {
    nodes,
    edges,
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  const yamlStr = yaml.dump(data, { indent: 2 });
  const blob = new Blob([yamlStr], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflow-${Date.now()}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (DEBUG) console.log('[yaml-workflow] 已导出 YAML 文件');
}

/**
 * 从 YAML 文件导入工作流并恢复
 */
async function importFromYaml(bus: EditorBus): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }
      const text = await file.text();
      try {
        const data = yaml.load(text) as any;
        if (data?.nodes && data?.edges) {
          bus.dispatch({ type: 'WORKFLOW_LOADED', nodes: data.nodes, edges: data.edges });
          if (DEBUG) console.log('[yaml-workflow] 已导入 YAML 文件');
          resolve();
        } else {
          reject(new Error('无效的 YAML 工作流文件：缺少 nodes 或 edges 字段'));
        }
      } catch (err) {
        reject(new Error(`YAML 解析失败: ${err}`));
      }
    };
    input.click();
  });
}

/**
 * 覆盖内置 workflow-io Mod，提供 YAML 格式支持
 */
export const yamlWorkflowMod: EditorMod = {
  id: 'workflow-io',   // 与内置 Mod 相同的 id，实现覆盖
  init(bus: EditorBus) {
    if (DEBUG) console.log('[yaml-workflow] 正在安装 YAML 处理器...');
    // 替换核心模块中的函数句柄
    setWorkflowIOHandlers(exportToYaml, (b) => importFromYaml(b));
    // 可选：返回清理函数，用于恢复默认 JSON 处理器（刷新页面后自动重置，此处留空即可）
    return () => {
      if (DEBUG) console.log('[yaml-workflow] 已卸载 YAML 处理器');
    };
  },
};
```

### 3. 注册自定义 Mod

编辑 `custom-mods/index.ts`，导入并添加 `yamlWorkflowMod`（确保它出现在数组前面以覆盖内置版本）：

```typescript
// custom-mods/index.ts
import type { EditorMod } from '../src/bus/types';
import { yamlWorkflowMod } from './yaml-workflow-mod';
// 可能还有其他自定义 Mod...

export const customMods: EditorMod[] = [
  yamlWorkflowMod,   // 覆盖内置 workflow-io
  // ... 其他 Mod
];
```

### 4. 验证效果

启动开发服务器：

```bash
npm run dev
```

打开浏览器控制台（F12），你应该看到类似输出：

```
[initMods] 准备覆盖内置 Mod: workflow-io -> 使用自定义版本
[yaml-workflow] 正在安装 YAML 处理器...
[workflow-io] 已替换导入/导出处理器
```

现在，点击左侧边栏的 **保存工作流** 按钮，下载的文件扩展名应为 `.yaml`，内容为 YAML 格式。点击 **加载工作流** 按钮，选择一个之前保存的 `.yaml` 文件，工作流应正确恢复。

## 扩展：同时支持 JSON 和 YAML

若希望保留 JSON 支持，同时增加 YAML 格式选择，可以进一步修改自定义 Mod：在侧边栏添加一个下拉菜单，通过 `bus.dispatch` 发送带有格式参数的事件，然后在 Mod 内部根据参数调用不同的处理函数。由于本文专注于核心教程，此处不再展开，但原理相同。

## 常见问题

### Q：为什么我保存的文件仍然是 JSON？

- 检查控制台是否有 `[initMods] 准备覆盖内置 Mod: workflow-io` 日志。如果没有，说明自定义 Mod 未被正确注册或 `id` 不匹配。
- 确保 `custom-mods/index.ts` 中导出了 `yamlWorkflowMod` 并放在了数组开头（或至少包含 `id: 'workflow-io'` 的 Mod）。

### Q：导入 YAML 时提示“无效的 YAML 工作流文件”

- 确保 YAML 文件包含 `nodes` 和 `edges` 两个顶级字段。可以使用导出的文件作为模板。
- 检查 YAML 语法是否正确（例如缩进使用空格而非制表符）。

### Q：如何恢复默认的 JSON 行为？

- 只需从 `custom-mods/index.ts` 中移除 `yamlWorkflowMod`（或注释掉），刷新页面即可。内置的 JSON 处理器会自动生效。

## 总结

通过编写一个简单的覆盖 Mod 并调用 `setWorkflowIOHandlers` API，我们成功地将工作流格式从 JSON 切换为 YAML，且**无需修改任何核心源码**。同样的方法可以用于支持其他任何格式（如 CSV、XML 或自定义加密格式），为编辑器提供了极大的扩展性。

## 参考

- 项目 Mod 系统文档：`tutorial zone/CUSTOM_MODS.md`
- `js-yaml` 官方文档：[https://github.com/nodeca/js-yaml](https://github.com/nodeca/js-yaml)
- 内置 `workflow-io` Mod 源码：`src/mods/mod-workflow-io.ts`