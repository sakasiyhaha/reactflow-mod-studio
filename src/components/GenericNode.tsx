// src/components/GenericNode.tsx
import { memo, Fragment, useCallback } from 'react';
import { Handle, Position, useStore, useNodeId } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import NodeControls from './NodeControls';
import { useEditorBusContext } from '../bus/EditorBusContext';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import type { CustomNode } from '../utils/types';
import { useHandleStyles } from '../hooks/useHandleStyles';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../config/editorConfig';

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
    } = template;

    const sources = template.handles?.sources ?? template.outputs ?? [];
    const targets = template.handles?.targets ?? template.inputs ?? [];

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
    const minHeight = maxVerticalHandles > 1 ? maxVerticalHandles * 28 + 40 : undefined;
    const minWidth = maxHorizontalHandles > 1 ? maxHorizontalHandles * 28 + 80 : undefined;

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
                        {targets.map((t) => {
                            const globalIndex = allPorts.findIndex(p => p.id === t.id && p.kind === 'target');
                            const handleStyle = useHandleStyles({
                                nodeId: id,
                                position: direction,
                                type: 'target',
                                nodeWidth,
                                nodeHeight,
                                index: globalIndex,
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
                        {sources.map((s) => {
                            const globalIndex = allPorts.findIndex(p => p.id === s.id && p.kind === 'source');
                            const handleStyle = useHandleStyles({
                                nodeId: id,
                                position: direction,
                                type: 'source',
                                nodeWidth,
                                nodeHeight,
                                index: globalIndex,
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