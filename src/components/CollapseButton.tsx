// src/components/CollapseButton.tsx
// 折叠按钮组件 —— 用于左侧节点库和右侧属性面板的展开/折叠

interface CollapseButtonProps {
  collapsed: boolean;      // 当前是否折叠
  onClick: () => void;     // 点击回调
  side: 'left' | 'right';  // 位于左侧还是右侧（决定箭头方向）
}

export default function CollapseButton({ collapsed, onClick, side }: CollapseButtonProps) {
  return (
    <div className="collapse-btn-wrapper">
      <button className="collapse-btn" onClick={onClick} type="button">
        {/* 
          左侧面板：折叠时箭头向右 ▶，展开时箭头向左 ◀
          右侧面板：折叠时箭头向左 ◀，展开时箭头向右 ▶
        */}
        {side === 'left' ? (collapsed ? '▶' : '◀') : (collapsed ? '◀' : '▶')}
      </button>
    </div>
  );
}