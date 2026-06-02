# 扩展工作流格式：为编辑器添加 YAML 导入/导出支持

本文档指导你为 `reactflow-mod-studio` 添加 **YAML 格式** 的工作流导入/导出功能，全程**无需修改任何核心源码**，通过编写一个自定义 Mod 实现。这充分体现了本项目的“一切皆可替换”架构理念。

**新特性**：支持资源外部化（`_resources`），YAML 格式同样会自动处理 Blob 资源。

---

## 适用读者

- 希望将工作流保存为 YAML（而非默认 JSON）的开发者。
- 需要理解如何扩展内置 Mod 功能的高级用户。

---

## 前置条件

- 已成功运行 `reactflow-mod-studio` 项目。
- 熟悉 TypeScript 和 Node.js 开发环境。
- 已阅读 `tutorial zone/CUSTOM_MODS.md`（Mod 编写指南）。

---

## 原理简介

内置的 `workflow-io` Mod（位于 `src/mods/mod-workflow-io.ts`）提供了一组可替换的函数句柄：

- `_exportWorkflowData`：负责将 `nodes` 和 `edges` 导出为文件。
- `_importWorkflowData`：负责从文件读取数据并派发 `WORKFLOW_LOADED` 事件。

通过调用 `setWorkflowIOHandlers(exportHandler, importHandler)` 可以动态替换这两个函数的实现。因此，我们只需在自定义 Mod 中调用该 API，即可完全接管工作流的导入/导出逻辑，而无需修改 `App.tsx` 或任何其他核心文件。

**替代方案**：使用 `registerBeforeExportHook` 和 `registerAfterImportHook` 在现有 JSON 基础上增加处理，而不是完全替换。本教程演示完整替换，以展示最大灵活性。

---

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
import { ResourceStore } from '../src/store/ResourceStore';

/**
 * 将 Blob 转换为 base64（复用 workflowIO 中的函数，但这里简化演示）
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * 将 base64 转换为 Blob
 */
const base64ToBlob = (base64: string, mimeType?: string): Blob => {
    const arr = base64.split(',');
    const mime = mimeType || arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * 将工作流导出为 YAML 文件（支持资源序列化）
 */
async function exportToYaml(nodes: any[], edges: any[]): Promise<void> {
    // 深拷贝节点数据
    const exportNodes = JSON.parse(JSON.stringify(nodes));

    // 收集资源并转为 base64
    const resourceMap = new Map<string, string>();
    for (const node of exportNodes) {
        if (node.data?._resources && Array.isArray(node.data._resources)) {
            for (const resId of node.data._resources) {
                if (!resourceMap.has(resId)) {
                    const blob = ResourceStore.get(resId);
                    if (blob) {
                        const base64 = await blobToBase64(blob);
                        resourceMap.set(resId, base64);
                        console.log(`[yaml-workflow] 序列化资源 ${resId}`);
                    }
                }
            }
        }
    }

    const exportData = {
        nodes: exportNodes,
        edges,
        version: 1,
        resources: Object.fromEntries(resourceMap),
        exportedAt: new Date().toISOString(),
    };

    const yamlStr = yaml.dump(exportData, { indent: 2 });
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
 * 从 YAML 文件导入工作流（支持资源反序列化）
 */
async function importFromYaml(bus: EditorBus): Promise<{ nodes: any[]; edges: any[] }> {
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
                if (!data?.nodes || !data?.edges) {
                    throw new Error('无效的 YAML 工作流文件：缺少 nodes 或 edges 字段');
                }

                // 反序列化资源
                const resourceIdMap = new Map<string, string>();
                if (data.resources && typeof data.resources === 'object') {
                    for (const [oldId, base64] of Object.entries(data.resources)) {
                        if (typeof base64 === 'string') {
                            const blob = base64ToBlob(base64);
                            const newId = ResourceStore.register(blob);
                            resourceIdMap.set(oldId, newId);
                            console.log(`[yaml-workflow] 恢复资源 ${oldId} -> ${newId}`);
                        }
                    }
                }

                // 更新节点中的资源引用
                const newNodes = data.nodes.map((node: any) => {
                    if (node.data?._resources && Array.isArray(node.data._resources)) {
                        const newResources = node.data._resources.map((oldId: string) =>
                            resourceIdMap.get(oldId) || oldId
                        );
                        return {
                            ...node,
                            data: { ...node.data, _resources: newResources }
                        };
                    }
                    return node;
                });

                resolve({ nodes: newNodes, edges: data.edges });
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
        setWorkflowIOHandlers(exportToYaml, importFromYaml);
        return () => {
            if (DEBUG) console.log('[yaml-workflow] 已卸载 YAML 处理器');
        };
    },
};
```

### 3. 注册自定义 Mod

编辑 `custom-mods/index.ts`，导入并添加 `yamlWorkflowMod`（确保它出现在数组前面以覆盖内置版本）：

```typescript
import { yamlWorkflowMod } from './yaml-workflow-mod';

export const customMods: EditorMod[] = [
    yamlWorkflowMod,
    // ... 其他 Mod
];
```

### 4. 验证效果

启动开发服务器：

```bash
npm run dev
```

打开浏览器控制台，你应该看到类似输出：

```
[initMods] 准备覆盖内置 Mod: workflow-io -> 使用自定义版本
[yaml-workflow] 正在安装 YAML 处理器...
[workflow-io] 已替换导入/导出处理器
```

- 点击侧边栏的 **保存工作流** 按钮，下载的文件扩展名应为 `.yaml`，内容为 YAML 格式。
- 如果节点包含资源（如图片），导出文件中会包含 `resources` 字段（base64）。
- 点击 **加载工作流** 按钮，选择一个之前保存的 `.yaml` 文件，工作流应正确恢复，资源被重新注册。

---

## 扩展：同时支持 JSON 和 YAML

若希望保留 JSON 支持，同时增加 YAML 格式选择，可以进一步修改自定义 Mod：在侧边栏添加一个下拉菜单，通过 `bus.dispatch` 发送带有格式参数的事件，然后在 Mod 内部根据参数调用不同的处理函数。由于本文专注于核心教程，此处不再展开，但原理相同。

---

## 常见问题

### Q：为什么我保存的文件仍然是 JSON？

- 检查控制台是否有 `[initMods] 准备覆盖内置 Mod: workflow-io` 日志。如果没有，说明自定义 Mod 未被正确注册或 `id` 不匹配。
- 确保 `custom-mods/index.ts` 中导出了 `yamlWorkflowMod` 并放在了数组开头（或至少包含 `id: 'workflow-io'` 的 Mod）。

### Q：导入 YAML 时提示“无效的 YAML 工作流文件”

- 确保 YAML 文件包含 `nodes` 和 `edges` 两个顶级字段。可以使用导出的文件作为模板。
- 检查 YAML 语法是否正确（例如缩进使用空格而非制表符）。

### Q：资源无法正确恢复？

- 确认 `ResourceStore` 已正确导入，且 `base64ToBlob` 和 `blobToBase64` 函数工作正常。
- 检查导入后节点的 `data._resources` 是否包含新的资源 ID（而不是旧的 ID）。
- 如果节点组件依赖 `imageUrl`，需要在导入后手动重新生成 `URL.createObjectURL`，这可以在 `afterImport` 钩子中完成。

### Q：如何恢复默认的 JSON 行为？

- 只需从 `custom-mods/index.ts` 中移除 `yamlWorkflowMod`（或注释掉），刷新页面即可。内置的 JSON 处理器会自动生效。

---

## 总结

通过编写一个简单的覆盖 Mod 并调用 `setWorkflowIOHandlers` API，我们成功地将工作流格式从 JSON 切换为 YAML，且**无需修改任何核心源码**。同样的方法可以用于支持其他任何格式（如 CSV、XML 或自定义加密格式），并自动处理资源序列化，为编辑器提供了极大的扩展性。

## 参考

- 项目 Mod 系统文档：`tutorial zone/CUSTOM_MODS.md`
- `js-yaml` 官方文档：[https://github.com/nodeca/js-yaml](https://github.com/nodeca/js-yaml)
- 内置 `workflow-io` Mod 源码：`src/mods/mod-workflow-io.ts`
- 资源管理器 API：`src/store/ResourceStore.ts`