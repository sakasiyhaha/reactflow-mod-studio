// src/components/GenericNode.tsx
import { memo, Fragment, useCallback, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, useStore, useNodeId, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import NodeControls from './NodeControls';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import type { CustomNode } from '../utils/types';
import { useHandleStyles } from '../hooks/useHandleStyles';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../config/editorConfig';
import { LAYOUT, NODE } from '../../config/numbers';
const positionMap: Record<string, Position> = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left,
};

/**
 * 精确获取当前节点宽度的选择器
 * 避免遍历整个 nodes 数组，直接通过 nodeLookup 获取
 */
const getNodeWidth = (state: any, id: string) => {
    const node = state.nodeLookup.get(id);
    return node?.measured?.width ?? node?.width ?? DEFAULT_NODE_WIDTH;
};

/**
 * 精确获取当前节点高度的选择器
 */
const getNodeHeight = (state: any, id: string) => {
    const node = state.nodeLookup.get(id);
    return node?.measured?.height ?? node?.height ?? DEFAULT_NODE_HEIGHT;
};

const GenericNode = memo(({ data, id }: NodeProps<CustomNode>) => {
    const bus = useEditorBusContext();
    const updateNodeInternals = useUpdateNodeInternals();

    // 使用精确订阅，避免全量 nodes 数组遍历
    const nodeWidth = useStore(useCallback(state => getNodeWidth(state, id), [id]));
    const nodeHeight = useStore(useCallback(state => getNodeHeight(state, id), [id]));

    const updateNodeData = (nodeId: string, newData: Record<string, unknown>) => {
        console.log(`[GenericNode] 📤 派发 NODE_DATA_CHANGED: nodeId=${nodeId}, newData=`, newData);
        bus.dispatch({ type: 'NODE_DATA_CHANGED', nodeId, data: newData });
    };

    const template = getAllTemplates().find((t) => t.type === data._nodeType);
    if (!template) {
        return (
            <div className="custom-node" style={{ borderColor: '#EF4444' }}>
                <strong className="node-title">⚠️ 未知节点</strong>
                <div className="node-value">{data._nodeType ?? '???'}</div>
            </div>
        );
    }

    const {
        title,
        color = 'var(--primary)',
        icon = '📦',
        styleClass = '',
        inlineControls,
        dynamicPorts,
        dynamicPortsDeps,
    } = template;

    // ---------- 动态端口计算 ----------
    // 确定依赖字段列表
    const depsFields = dynamicPortsDeps ? dynamicPortsDeps(data) : Object.keys(data);
    // 提取依赖字段的值（用于 useMemo 依赖）
    const depValues = depsFields.map(field => data[field]);

    // 使用 JSON.stringify 将依赖值数组序列化，避免因数组引用变化而误触发
    // 注意：如果依赖字段中包含对象/数组，此方法可能无法深度比较，但对于简单类型足够
    const depKey = useMemo(() => JSON.stringify(depValues), [depValues]);

    // 计算动态端口（仅当模板提供了 dynamicPorts 时才计算）
    const dynamicPortsResult = useMemo(() => {
        if (!dynamicPorts) return null;
        // 注意：depKey 的变化代表依赖字段值确实发生了变化，因此重新调用 dynamicPorts
        const result = dynamicPorts(data);
        if (import.meta.env.DEV && result) {
            console.log(`[GenericNode] 节点 ${id} 重新计算动态端口`, {
                deps: depsFields,
                values: depValues,
                inputs: result.inputs?.length ?? 0,
                outputs: result.outputs?.length ?? 0,
            });
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dynamicPorts, data, depKey, id]);

    // 合并静态端口与动态端口
    const staticInputs = template.inputs ?? [];
    const dynamicInputs = dynamicPortsResult?.inputs ?? [];
    const finalInputs = useMemo(
        () => [...staticInputs, ...dynamicInputs],
        [staticInputs, dynamicInputs]
    );

    const staticOutputs = template.outputs ?? [];
    const dynamicOutputs = dynamicPortsResult?.outputs ?? [];
    const finalOutputs = useMemo(
        () => [...staticOutputs, ...dynamicOutputs],
        [staticOutputs, dynamicOutputs]
    );

    // 监听端口列表变化，刷新 React Flow 内部布局
    const prevInputsRef = useRef<typeof finalInputs>(finalInputs);
    const prevOutputsRef = useRef<typeof finalOutputs>(finalOutputs);
    useEffect(() => {
        const inputsChanged = JSON.stringify(prevInputsRef.current) !== JSON.stringify(finalInputs);
        const outputsChanged = JSON.stringify(prevOutputsRef.current) !== JSON.stringify(finalOutputs);
        if (inputsChanged || outputsChanged) {
            if (import.meta.env.DEV) {
                console.log(`[GenericNode] 节点 ${id} 端口结构变化，刷新内部布局`, {
                    inputs: finalInputs.length,
                    outputs: finalOutputs.length,
                });
            }
            updateNodeInternals(id);
            prevInputsRef.current = finalInputs;
            prevOutputsRef.current = finalOutputs;
        }
    }, [finalInputs, finalOutputs, id, updateNodeInternals]);

    // ---------- 以下为原有渲染逻辑，使用 finalInputs / finalOutputs 替代原来的 template.inputs/outputs ----------
    const sources = finalOutputs;
    const targets = finalInputs;

    const displayValue = data.value ?? Object.values(data).find(
        (v) => typeof v === 'number' || typeof v === 'string'
    ) ?? '';

    const titleText = data.label ?? title;
    const isLocked = data.locked === true;

    const handleGroups = [
        {
            position: Position.Left,
            direction: 'left' as const,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Left),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Left),
        },
        {
            position: Position.Right,
            direction: 'right' as const,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Right),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Right),
        },
        {
            position: Position.Top,
            direction: 'top' as const,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Top),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Top),
        },
        {
            position: Position.Bottom,
            direction: 'bottom' as const,
            targets: targets.filter(t => (positionMap[t.position] ?? Position.Left) === Position.Bottom),
            sources: sources.filter(s => (positionMap[s.position] ?? Position.Right) === Position.Bottom),
        },
    ];

    const maxVerticalHandles = Math.max(
        handleGroups[0].targets.length + handleGroups[0].sources.length,
        handleGroups[1].targets.length + handleGroups[1].sources.length
    );
    const maxHorizontalHandles = Math.max(
        handleGroups[2].targets.length + handleGroups[2].sources.length,
        handleGroups[3].targets.length + handleGroups[3].sources.length
    );
    const minHeight = maxVerticalHandles > 1 ? maxVerticalHandles * NODE.PORT_VERTICAL_SPACING + NODE.PORT_VERTICAL_SPACING + 12 : undefined;
    const minWidth = maxHorizontalHandles > 1 ? maxHorizontalHandles * NODE.PORT_VERTICAL_SPACING + NODE.PORT_HORIZONTAL_EXTRA_WIDTH : undefined;

    const borderColor = isLocked ? '#555' : color;

    const getPortTooltip = (port: { label: string; type: string }) => {
        return `${port.label} (${port.type})`;
    };

    return (
        <div
            className={`custom-node ${styleClass}`}
            style={{
                borderColor: borderColor,
                borderLeftWidth: 3,
                opacity: isLocked ? 0.85 : 1,
                ...(minHeight && { minHeight: `${minHeight}px` }),
                ...(minWidth && { minWidth: `${minWidth}px` }),
            }}
        >
            <strong className="node-title">
                {isLocked && <span style={{ marginRight: 4 }}>🔒</span>}
                {icon} {titleText}
            </strong>
            <div className="node-value">{String(displayValue)}</div>

            {inlineControls && inlineControls.length > 0 && (
                <NodeControls
                    controls={inlineControls}
                    nodeId={id}
                    updateNodeData={updateNodeData}
                    data={data}
                />
            )}

            {handleGroups.map(({ position, direction, targets, sources }) => {
                const allPorts = [
                    ...targets.map(p => ({ ...p, kind: 'target' as const })),
                    ...sources.map(p => ({ ...p, kind: 'source' as const }))
                ];
                const total = allPorts.length;

                return (
                    <Fragment key={position}>
                        {targets.map((t, idx) => {
                            const globalIndex = allPorts.findIndex(p => p.id === t.id && p.kind === 'target');
                            const handleStyle = useHandleStyles({
                                nodeId: id,
                                position: direction,
                                type: 'target',
                                nodeWidth,
                                nodeHeight,
                                index: globalIndex === -1 ? idx : globalIndex,
                                total,
                            });
                            const portColor = t.type === 'exec' ? '#f56565' : '#4299e1';
                            const tooltipText = getPortTooltip(t);
                            return (
                                <Handle
                                    key={`target-${t.id}`}
                                    type="target"
                                    position={position}
                                    id={t.id}
                                    style={{
                                        background: portColor,
                                        ...(t.style ?? {}),
                                        ...handleStyle,
                                    }}
                                    data-tooltip={tooltipText}
                                />
                            );
                        })}
                        {sources.map((s, idx) => {
                            const globalIndex = allPorts.findIndex(p => p.id === s.id && p.kind === 'source');
                            const handleStyle = useHandleStyles({
                                nodeId: id,
                                position: direction,
                                type: 'source',
                                nodeWidth,
                                nodeHeight,
                                index: globalIndex === -1 ? idx : globalIndex,
                                total,
                            });
                            const portColor = s.type === 'exec' ? '#f56565' : '#48bb78';
                            const tooltipText = getPortTooltip(s);
                            return (
                                <Handle
                                    key={`source-${s.id}`}
                                    type="source"
                                    position={position}
                                    id={s.id}
                                    style={{
                                        background: portColor,
                                        ...(s.style ?? {}),
                                        ...handleStyle,
                                    }}
                                    data-tooltip={tooltipText}
                                />
                            );
                        })}
                    </Fragment>
                );
            })}
        </div>
    );
});

export default GenericNode;