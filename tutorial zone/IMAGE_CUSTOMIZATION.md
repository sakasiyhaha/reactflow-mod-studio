# 图片与图标自定义指南

本指南将告诉你如何快速更换 `reactflow-mod-studio` 中的各种图片资源，包括浏览器标签图标、节点库中的节点图标，以及清理无关的默认图片。同时涵盖资源外部化（ResourceStore）后图片节点的新用法。

---

## 1. 浏览器标签图标（favicon）

**当前状态**  
项目根目录下的 `favicon.svg` 被 `index.html` 引用为网页图标。

**替换方法**  
- 用你自己的 `favicon.svg` 文件**覆盖**项目根目录下的 `favicon.svg`（文件名可以不同，但需同步更新 `index.html`）。  
- 如果想使用 `.ico` 或 `.png` 格式，修改 `index.html` 中的 `<link>` 标签，例如：

```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

**注意**：文件必须放在 `public/` 目录中，或者直接用根目录路径（`/` 代表 `public/`）。

---

## 2. 节点模板的图标

**当前状态**  
每个 `NodeTemplate` 的 `icon` 字段默认使用 **emoji 字符**（例如 `'🔢'`），也支持图片 URL 或 Font Awesome 类名。

**替换为图片**  
1. 将你想要的图标文件（如 SVG、PNG）放入 `public/icons/` 目录（需自行创建该目录）。  
2. 修改模板定义中的 `icon` 字段为图片的 URL（例如 `'/icons/number-input.svg'`）。  
3. 更新 `src/components/GenericNode.tsx` 中渲染图标的逻辑，让它既支持 emoji 又支持图片。找到原本直接输出 `{icon}` 的位置（标题行），替换为：

```tsx
<strong className="node-title">
    {isLocked && <span style={{ marginRight: 4 }}>🔒</span>}
    {icon.startsWith('http') || icon.startsWith('/') ? (
        <img src={icon} alt="" style={{ width: 18, height: 18, marginRight: 4 }} />
    ) : (
        <span>{icon}</span>
    )} {titleText}
</strong>
```

**注意**：如果你的图标来自 Font Awesome 或其他图标库，可以安装对应依赖并在模板的 `icon` 字段中存储标识符，然后在 `GenericNode` 中根据标识符渲染图标组件。示例代码可根据项目需求自行扩展。

---

## 3. 资源外部化后的图片节点

当使用 `ResourceStore` 管理图片资源时（例如 `image-node-mod.ts` 示例），节点数据中不直接存储图片 Blob，而是存储资源 ID（`_resources` 数组）。此时需要自定义节点组件来显示图片。

### 3.1 修改 `GenericNode` 支持显示图片

在 `GenericNode.tsx` 中增加对 `data.imageUrl` 的渲染（如果节点模板配置了 `imageUrl` 字段）：

```tsx
// 在节点内容区域，显示图片预览
{data.imageUrl && (
    <div className="node-preview">
        <img src={data.imageUrl} alt="预览" style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }} />
    </div>
)}
```

### 3.2 在导入后自动重建 `imageUrl`

由于导入后资源 ID 会变化，原 `imageUrl`（blob URL）会失效。你可以在 `afterImport` 钩子中遍历图片节点，重新生成 `imageUrl`：

```typescript
// custom-mods/image-restore-hook.ts
import { registerAfterImportHook } from '../src/mods/mod-workflow-io';
import { ResourceStore } from '../src/store/ResourceStore';

registerAfterImportHook(async (data) => {
    for (const node of data.nodes) {
        if (node.type === 'imageNode' && node.data?._resources?.length) {
            const resourceId = node.data._resources[0];
            const blob = ResourceStore.get(resourceId);
            if (blob) {
                node.data.imageUrl = URL.createObjectURL(blob);
            }
        }
    }
});
```

这样导入后图片节点能正确显示。

---

## 4. 删除无用的默认图片

项目模板生成时携带了以下图片，目前均未使用，可以安全删除：

- `src/assets/react.svg`
- `src/assets/vite.svg`
- `src/assets/hero.png`

如果你的 `public/` 目录下也有类似的遗留文件，按需清理即可。

---

## 5. 画布引导图（空状态提示）

当画布上没有节点时，`FlowCanvas.tsx` 会显示一段文字提示。如果你希望换成自定义图片，可以直接修改空状态部分的 JSX。

**所在位置**：`src/components/FlowCanvas.tsx` 中 `{nodes.length === 0 && ( ... )}` 代码块。  
**修改示例**：

```tsx
{nodes.length === 0 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    textAlign: 'center'
  }}>
    <img src="/images/empty-canvas.png" alt="提示" style={{ width: 200, opacity: 0.6 }} />
    <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 16 }}>
      拖拽左侧节点或点击添加，开始构建流程
    </p>
  </div>
)}
```

确保图片文件已放入 `public/images/` 目录。

---

## 6. 侧边栏按钮图标

左侧边栏（`Sidebar.tsx`）和节点库（`NodeLibrary.tsx`）中的按钮目前使用文字 + emoji。如果你想为这些按钮添加自定义图标（例如用 Font Awesome 或本地 SVG），可以修改相应 JSX。

**示例**（在 `Sidebar.tsx` 的按钮中）：

```tsx
<button className="sidebar-action-btn" onClick={onAutoLayout}>
    <img src="/icons/layout.svg" alt="布局" style={{ width: 16, marginRight: 8 }} />
    自动布局
</button>
```

但需要注意引入图标库或确保图片路径正确。

---

## 7. 动态端口节点的图标

动态端口节点（如 `dynamic-output-mod.ts`）同样可以自定义图标。只需在模板定义中设置 `icon` 字段即可，支持 emoji、图片 URL 或图标库组件。

```typescript
{
    type: 'dynamicOutput',
    title: '动态输出',
    icon: '/icons/dynamic.svg',  // 使用自定义图片
    // 或 icon: '🔌',   // 使用 emoji
    // ...
}
```

---

## 8. 快速总结

| 要修改的内容 | 文件位置 | 操作 |
|-------------|----------|------|
| 网页图标 | `index.html` + 根目录文件 | 替换 `favicon.svg` 并修改 `<link>` |
| 节点图标 | `src/registry/nodeTemplateRegistry.ts` (内置模板) 或 `custom-mods` 中的模板定义 + `GenericNode.tsx` | 修改 `icon` 字段并更新渲染逻辑 |
| 删除默认图片 | `src/assets/react.svg`, `vite.svg`, `hero.png` | 直接删除 |
| 画布空状态图片 | `FlowCanvas.tsx` | 修改 JSX 空状态块 |
| 侧边栏按钮图标 | `Sidebar.tsx`, `NodeLibrary.tsx` | 添加 `<img>` 或使用图标库 |
| 资源节点图片显示 | `GenericNode.tsx` + 钩子 | 增加图片渲染代码，导入后重建 URL |

以上所有操作都不会影响编辑器的核心功能，可以放心修改。

---

## 9. 高级：使用图标库（如 Font Awesome）

如果你想使用 Font Awesome 等图标库，可以安装依赖并在组件中直接使用图标组件，而不是图片或 emoji。

1. 安装 `@fortawesome/react-fontawesome` 和对应图标包。
2. 在 `GenericNode.tsx` 中根据 `icon` 字段的内容（例如 `'fa-solid fa-calculator'`）渲染 `<FontAwesomeIcon>`。
3. 修改模板定义，将 `icon` 字段改为 Font Awesome 的类名或标识。

由于这需要额外的依赖和配置，本文档不再展开，但原理与使用图片类似。

---

## 10. 图片资源与 ResourceStore 配合的最佳实践

- **注册**：使用 `ResourceStore.register(blob)` 获得资源 ID。
- **存储**：在节点 `data._resources` 中保存 ID，同时可生成 `data.imageUrl = URL.createObjectURL(blob)` 用于显示。
- **清理**：节点删除时，`ResourceStore.release` 会自动被调用（依赖 `useEditorBus` 中的修改）。但你需在组件卸载时手动 `revokeObjectURL`（可选，不影响资源释放）。
- **导出/导入**：已自动处理资源序列化，无需额外代码。
- **性能**：避免在 `dynamicPorts` 中频繁创建 `imageUrl`，因为每次重新计算端口都会重新创建 URL，可能导致内存泄漏。建议将 `imageUrl` 放在节点普通数据中，只由 `NODE_DATA_CHANGED` 更新。

---

> 如果要永久改变图片，建议将新图片放入 `public/` 目录，并通过 `/` 开头的绝对路径引用。
```