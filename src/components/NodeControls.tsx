// src/components/NodeControls.tsx
// 节点内联控件组件 —— 根据模板定义动态渲染控件，支持扩展注册中心
import { DEBUG } from '../../config/debug';
import { useCallback } from 'react';
import type { InlineControl } from '../nodeTemplates';
import {
  getControlComponent,
  type ControlComponentProps,
} from '../registry/controlComponentRegistry';

// 内置控件：数字步进器
const NumberStepper: React.FC<ControlComponentProps> = ({
  value,
  onChange,
  min,
  max,
  step,
}) => {
  const handleDecrement = () => {
    const stepVal = step ?? 1;
    const minVal = min ?? -Infinity;
    onChange(Math.max(minVal, (Number(value) ?? 0) - stepVal));
  };
  const handleIncrement = () => {
    const stepVal = step ?? 1;
    const maxVal = max ?? Infinity;
    onChange(Math.min(maxVal, (Number(value) ?? 0) + stepVal));
  };
  return (
    <div className="stepper-row">
      <span className="stepper-label">{/* label 已在外层显示 */}</span>
      <button className="stepper-btn" onClick={handleDecrement}>
        -
      </button>
      <span className="stepper-value">{String(value ?? 0)}</span>
      <button className="stepper-btn" onClick={handleIncrement}>
        +
      </button>
    </div>
  );
};

// 内置控件：布尔开关
const BooleanToggle: React.FC<ControlComponentProps> = ({ value, onChange }) => {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{/* label 已在外层显示 */}</span>
      <button
        className="toggle-btn"
        style={{
          background: value ? 'var(--primary)' : 'var(--bg-canvas)',
          color: value ? '#fff' : 'var(--text-primary)',
        }}
        onClick={() => onChange(!value)}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};

// 内置控件：下拉选择
const SelectDropdown: React.FC<ControlComponentProps & { options?: string[] }> = ({
  value,
  onChange,
  options,
}) => {
  return (
    <div className="select-row">
      <span className="select-label">{/* label 已在外层显示 */}</span>
      <select
        className="select-dropdown"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      >
        {options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

interface NodeControlsProps {
  controls: InlineControl[]; // 内联控件配置列表（来自模板）
  nodeId: string;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  data: Record<string, unknown>;
}

export default function NodeControls({
  controls,
  nodeId,
  updateNodeData,
  data,
}: NodeControlsProps) {
  const handleControlChange = useCallback(
    (key: string, value: unknown) => {
      console.log(`[NodeControls] 🎛️ 控件值变更: nodeId=${nodeId}, key=${key}, newValue=${JSON.stringify(value)}, oldData=${JSON.stringify(data)}`);
      updateNodeData(nodeId, { ...data, [key]: value });
    },
    [nodeId, data, updateNodeData]
  );


  return (
    <div className="nodrag node-controls">
      {controls.map((ctrl) => {
        const currentValue = data[ctrl.key] ?? ctrl.default;
        const Component = getControlComponent(ctrl.type);
        if (!Component) {
          console.warn(`[NodeControls] 未知控件类型: ${ctrl.type}，将使用文本显示`);
          return (
            <div key={ctrl.key} className="text-control">
              <span className="control-label">{ctrl.label}</span>
              <span className="control-value">{String(currentValue)}</span>
            </div>
          );
          
        }
        console.log(`[NodeControls] 🧩 渲染控件: type=${ctrl.type}, key=${ctrl.key}, value=${currentValue}`);

        // 根据控件类型传递不同的额外 props
        let extraProps = {};
        if (ctrl.type === 'number-stepper') {
          extraProps = { min: ctrl.min, max: ctrl.max, step: ctrl.step };
        } else if (ctrl.type === 'select-dropdown') {
          extraProps = { options: ctrl.options };
        }

        return (
          <div key={ctrl.key} className="control-wrapper">
            <span className="control-label">{ctrl.label}</span>
            <Component
              value={currentValue}
              onChange={(newVal: any) => handleControlChange(ctrl.key, newVal)}
              {...extraProps}
            />
          </div>
        );
      })}
    </div>
  );
}

// 注意：原有的样式类（stepper-row, toggle-row, select-row）保持不变，
// 但为了统一布局，建议在 CSS 中添加 .control-wrapper 和 .control-label 样式。
// 为了不破坏现有样式，这里保持原有类名结构（通过 Component 内部渲染）。
// 如果希望统一，可以后续调整 CSS。