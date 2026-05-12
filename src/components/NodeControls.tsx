// src/components/NodeControls.tsx
// 节点内联控件组件 —— 根据模板定义，在节点内部渲染步进器、布尔开关、下拉选择等
// 使用 nodrag 类名禁止拖拽，避免拖动控件时触发节点移动

import { useCallback } from 'react';
import type { InlineControl } from '../nodeTemplates';

interface NodeControlsProps {
    controls: InlineControl[];   // 内联控件配置列表（来自模板）
    nodeId: string;              // 所属节点 ID
    updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;  // 更新节点数据的回调
    data: Record<string, unknown>;  // 节点当前数据
}

export default function NodeControls({ controls, nodeId, updateNodeData, data }: NodeControlsProps) {

    /**
     * 控件值变化时的统一处理函数
     * @param key   控件对应的数据字段名
     * @param value 新值
     */
    const handleControlChange = useCallback(
        (key: string, value: unknown) => {
            updateNodeData(nodeId, { ...data, [key]: value });   // 合并现有数据，更新指定字段
        },
        [nodeId, data, updateNodeData]   // 依赖项：确保回调中的 data 是最新的
    );

    return (
        <div className="nodrag node-controls">
            {controls.map((ctrl) => {
                const currentValue = data[ctrl.key] ?? ctrl.default;  // 获取当前值或默认值

                switch (ctrl.type) {

                    // ---------- 数字步进器 ----------
                    case 'number-stepper':
                        return (
                            <div key={ctrl.key} className="stepper-row">
                                <span className="stepper-label">{ctrl.label}</span>
                                <button
                                    className="stepper-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();        // 防止冒泡触发节点选中
                                        const step = ctrl.step ?? 1;
                                        const min = ctrl.min ?? -Infinity;
                                        handleControlChange(ctrl.key, Math.max(min, (Number(currentValue) ?? 0) - step));
                                    }}
                                >
                                    -
                                </button>
                                <span className="stepper-value">{String(currentValue ?? 0)}</span>
                                <button
                                    className="stepper-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const step = ctrl.step ?? 1;
                                        const max = ctrl.max ?? Infinity;
                                        handleControlChange(ctrl.key, Math.min(max, (Number(currentValue) ?? 0) + step));
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        );

                    // ---------- 布尔开关 ----------
                    case 'boolean-toggle':
                        return (
                            <div key={ctrl.key} className="toggle-row">
                                <span className="toggle-label">{ctrl.label}</span>
                                <button
                                    className="toggle-btn"
                                    style={{
                                        background: currentValue ? 'var(--primary)' : 'var(--bg-canvas)',
                                        color: currentValue ? '#fff' : 'var(--text-primary)',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleControlChange(ctrl.key, !currentValue);  // 切换布尔值
                                    }}
                                >
                                    {currentValue ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        );

                    // ---------- 下拉选择 ----------
                    case 'select-dropdown':
                        return (
                            <div key={ctrl.key} className="select-row">
                                <span className="select-label">{ctrl.label}</span>
                                <select
                                    className="select-dropdown"
                                    value={String(currentValue ?? '')}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleControlChange(ctrl.key, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}  // 阻止点击冒泡
                                >
                                    {ctrl.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
}