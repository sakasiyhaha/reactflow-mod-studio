// src/components/GenericNode.tsx
// 通用节点组件 —— 所有节点类型的统一渲染组件（数据驱动）
// 根据注册中心中的模板定义，动态生成标题、图标、颜色、端口（Handles）和内联控件
// 使用 React.memo 优化渲染性能，仅在 data 或 id 变化时重新渲染

import { memo, Fragment } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import NodeControls from './NodeControls';             // 内联控件组件（步进器、开关、下拉）
import { useEditorBusContext } from '../bus/EditorBusContext'; // 获取总线实例，用于派发数据变更事件
import { getAllTemplates } from '../registry/nodeTemplateRegistry'; // 从注册中心动态获取模板
import type { CustomNode } from '../utils/types';

/** 端口 position 字符串到 React Flow Position 枚举的映射 */
const positionMap: Record<string, Position> = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left,
};

const GenericNode = memo(({ data, id }: NodeProps<CustomNode>) => {
    const bus = useEditorBusContext();

    /**
     * 更新节点数据（内联控件、属性面板等调用）
     * 派发 NODE_DATA_CHANGED 事件，reducer 会合并数据并传播 value 变化到下游
     */
    const updateNodeData = (nodeId: string, newData: Record<string, unknown>) => {
        bus.dispatch({ type: 'NODE_DATA_CHANGED', nodeId, data: newData });
    };

    // 根据节点数据中的 _nodeType 查找对应模板（使用动态注册中心）
    const template = getAllTemplates().find((t) => t.type === data._nodeType);

    // 如果找不到模板（例如加载了不兼容的工作流），显示错误占位节点
    if (!template) {
        return (
            <div className="custom-node" style={{ borderColor: '#EF4444' }}>
                <strong className="node-title">⚠️ 未知节点</strong>
                <div className="node-value">{data._nodeType ?? '???'}</div>
            </div>
        );
    }

    // 从模板中提取配置
    const {
        title,
        color = 'var(--primary)',
        icon = '📦',
        styleClass = '',
        inlineControls,
    } = template;

    // 获取端口列表（优先使用 handles 定义，兼容旧的 inputs/outputs 字段）
    const sources = template.handles?.sources ?? template.outputs ?? [];
    const targets = template.handles?.targets ?? template.inputs ?? [];

    /** 优先显示数据中的 value，否则取第一个 number/string 类型的属性作为展示值 */
    const displayValue = data.value ?? Object.values(data).find(
        (v) => typeof v === 'number' || typeof v === 'string'
    ) ?? '';

    /** 节点标题：数据中的 label 优先，否则用模板标题 */
    const titleText = data.label ?? title;
    /** 是否已锁定 */
    const isLocked = data.locked === true;

    /**
     * 计算端口在节点边缘的相对位置（百分比）
     * 仅当端口总数 > 1 时使用，以均匀分布
     */
    const getHandlePosition = (index: number, total: number, isVertical = true) => {
        if (total <= 1) return undefined;
        const percent = (100 / (total + 1)) * (index + 1);
        return isVertical ? { top: `${percent}%` } : { left: `${percent}%` };
    };

    /**
     * 将端口按边缘位置分为四组：左、右、上、下
     * 每一组包含该边上的 target 和 source 端口
     */
    const handleGroups = [
        {
            position: Position.Left,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Left),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Left),
            isVertical: true,   // 左侧端口垂直排列
        },
        {
            position: Position.Right,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Right),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Right),
            isVertical: true,
        },
        {
            position: Position.Top,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Top),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Top),
            isVertical: false,  // 顶部端口水平排列
        },
        {
            position: Position.Bottom,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Bottom),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Bottom),
            isVertical: false,
        },
    ];

    // 计算每边的最大端口数，用于设置最小高度/宽度（避免端口重叠）
    const maxVerticalHandles = Math.max(
        handleGroups[0].targets.length + handleGroups[0].sources.length,   // 左侧
        handleGroups[1].targets.length + handleGroups[1].sources.length    // 右侧
    );
    const maxHorizontalHandles = Math.max(
        handleGroups[2].targets.length + handleGroups[2].sources.length,   // 顶部
        handleGroups[3].targets.length + handleGroups[3].sources.length    // 底部
    );
    const minHeight = maxVerticalHandles > 1 ? maxVerticalHandles * 28 + 40 : undefined;
    const minWidth = maxHorizontalHandles > 1 ? maxHorizontalHandles * 28 + 80 : undefined;

    return (
        <div
            className={`custom-node ${styleClass}`}
            style={{
                borderColor: isLocked ? '#CBD5E0' : color,         // 锁定状态用灰色
                borderLeftWidth: 3,                                  // 左侧粗线作为类型色标
                opacity: isLocked ? 0.85 : 1,                      // 锁定后半透明
                ...(minHeight && { minHeight: `${minHeight}px` }),  // 动态最小高度
                ...(minWidth && { minWidth: `${minWidth}px` }),      // 动态最小宽度
            }}
        >
            {/* 标题行：锁定图标 + 模板图标 + 标题文字 */}
            <strong className="node-title">
                {isLocked && <span style={{ marginRight: 4 }}>🔒</span>}
                {icon} {titleText}
            </strong>
            {/* 显示当前值 */}
            <div className="node-value">{String(displayValue)}</div>

            {/* 内联控件：步进器、开关、下拉选择等 */}
            {inlineControls && inlineControls.length > 0 && (
                <NodeControls
                    controls={inlineControls}
                    nodeId={id}
                    updateNodeData={updateNodeData}
                    data={data}
                />
            )}

            {/* 渲染所有端口 */}
            {handleGroups.map(({ position, targets, sources, isVertical }) => (
                <Fragment key={position}>
                    {/* 目标端口（输入） */}
                    {targets.map((t, idx) => (
                        <Handle
                            key={`target-${t.id}`}
                            type="target"
                            position={position}
                            id={t.id}
                            style={{
                                background: color,
                                ...(t.style ?? {}),
                                ...getHandlePosition(idx, targets.length, isVertical),
                            }}
                            title={t.label}   // 悬浮提示
                        />
                    ))}
                    {/* 源端口（输出） */}
                    {sources.map((s, idx) => (
                        <Handle
                            key={`source-${s.id}`}
                            type="source"
                            position={position}
                            id={s.id}
                            style={{
                                background: color,
                                ...(s.style ?? {}),
                                ...getHandlePosition(idx, sources.length, isVertical),
                            }}
                            title={s.label}
                        />
                    ))}
                </Fragment>
            ))}
        </div>
    );
});

export default GenericNode;