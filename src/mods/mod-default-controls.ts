// src/mods/mod-default-controls.ts
import React from 'react';
import type { EditorMod } from '../bus/types';
import { registerControlType } from '../registry/controlComponentRegistry';
import type { ControlComponentProps } from '../registry/controlComponentRegistry';

// 数字步进器组件
const NumberStepper: React.FC<ControlComponentProps> = (props) => {
  const { value, onChange, min, max, step } = props;
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
  return React.createElement(
    'div',
    { className: 'stepper-row' } as any,
    React.createElement('button', { className: 'stepper-btn', onClick: handleDecrement } as any, '-'),
    React.createElement('span', { className: 'stepper-value' } as any, String(value ?? 0)),
    React.createElement('button', { className: 'stepper-btn', onClick: handleIncrement } as any, '+')
  );
};

// 布尔开关组件
const BooleanToggle: React.FC<ControlComponentProps> = (props) => {
  const { value, onChange } = props;
  return React.createElement(
    'div',
    { className: 'toggle-row' } as any,
    React.createElement(
      'button',
      {
        className: 'toggle-btn',
        style: {
          background: value ? 'var(--primary)' : 'var(--bg-canvas)',
          color: value ? '#fff' : 'var(--text-primary)',
        },
        onClick: () => onChange(!value),
      } as any,
      value ? 'ON' : 'OFF'
    )
  );
};

// 下拉选择组件
const SelectDropdown: React.FC<ControlComponentProps & { options?: string[] }> = (props) => {
  const { value, onChange, options } = props;
  return React.createElement(
    'div',
    { className: 'select-row' } as any,
    React.createElement(
      'select',
      {
        className: 'select-dropdown',
        value: String(value ?? ''),
        onChange: (e) => onChange(e.target.value),
        onClick: (e) => e.stopPropagation(),
      } as any,
      options?.map((opt) => React.createElement('option', { key: opt, value: opt } as any, opt))
    )
  );
};

export const modDefaultControls: EditorMod = {
  id: 'default-controls',
  init() {
    registerControlType('number-stepper', NumberStepper);
    registerControlType('boolean-toggle', BooleanToggle);
    registerControlType('select-dropdown', SelectDropdown);
    console.log('[mod-default-controls] 已注册默认控件类型');
    return () => {};
  },
};