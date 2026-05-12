# 图片与图标自定义指南

本指南将告诉你如何快速更换 `reactflow-mod-studio` 中的各种图片资源，包括浏览器标签图标、节点库中的节点图标，以及清理无关的默认图片。

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
`src/nodeTemplates.ts` 中每个 `NodeTemplate` 的 `icon` 字段使用 **emoji 字符**，例如 `'🔢'`。

**替换为图片**  
1. 将你想要的图标文件（如 SVG、PNG）放入 `public/icons/` 目录（需自行创建该目录）。  
2. 修改 `icon` 字段为图片的 URL（例如 `'/icons/number-input.svg'`）。  
3. 更新 `src/components/GenericNode.tsx` 中渲染图标的逻辑，让它既支持 emoji 又支持图片。找到原本直接输出 `{icon}` 的位置，替换为：

```tsx
{icon.startsWith('http') || icon.startsWith('/') ? (
  <img src={icon} alt="" style={{ width: 18, height: 18, marginRight: 4 }} />
) : (
  <span>{icon}</span>
)}
```

**完整体现代码**（在 `GenericNode.tsx` 的标题行中）：

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

从此以后，`icon` 可以填写本地图片路径或网络图片 URL，节点库和节点标题都会正确显示图标。

---

## 3. 删除无用的默认图片

项目模板生成时携带了以下图片，目前均未使用，可以安全删除：

- `src/assets/react.svg`
- `src/assets/vite.svg`
- `src/assets/hero.png`

如果你的`public/`目录下也有类似的遗留文件，按需清理即可。

---

## 4. 画布引导图（空状态提示）

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

## 5. 快速总结

| 要修改的内容 | 文件位置 | 操作 |
|-------------|----------|------|
| 网页图标 | `index.html` + 根目录文件 | 替换 `favicon.svg` 并修改 `<link>` |
| 节点图标 | `src/nodeTemplates.ts` + `GenericNode.tsx` | 修改 `icon` 字段并更新渲染逻辑 |
| 删除默认图片 | `src/assets/react.svg`, `vite.svg`, `hero.png` | 直接删除 |
| 画布空状态图片 | `FlowCanvas.tsx` | 修改 JSX 空状态块 |

以上所有操作都不会影响编辑器的核心功能，可以放心修改。

---

> 如果要永久改变图片，建议将新图片放入 `public/` 目录，并通过 `/` 开头的绝对路径引用。