// src/components/PropsPanel.tsx
// 属性面板 —— 右侧面板，支持动态扩展槽（顶部/底部）

import { useState, useEffect, useCallback, useMemo } from 'react';
import CollapseButton from './CollapseButton';
import { DEBUG } from '../../config/debug';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { getPropsPanelExtensions } from '../registry/propsPanelRegistry';
import { useEditorBusContext } from '../bus/EditorBusContext';
import type { CustomNode } from '../utils/types';

interface PropertyItemConfig { type: string; default: unknown; }

interface PropsPanelProps {
    collapsed: boolean;       // 是否折叠
    onToggle: () => void;     // 折叠切换
    selectedNode: CustomNode | null;  // 当前选中的节点
    updateNodeData: (id: string, data: Record<string, unknown>) => void; // 更新节点数据的回调
}

export default function PropsPanel({ collapsed, onToggle, selectedNode, updateNodeData }: PropsPanelProps) {
    const bus = useEditorBusContext();
    const [localData, setLocalData] = useState<Record<string, unknown>>(selectedNode?.data ?? {});

    useEffect(() => {
        if (selectedNode) { setLocalData(selectedNode.data); } else { setLocalData({}); }
    }, [selectedNode]);

    const propertyConfig = useMemo((): Record<string, PropertyItemConfig> => {
        if (!selectedNode) return {};
        const template = getAllTemplates().find(t => t.type === selectedNode.type);
        return (template?.properties ?? {}) as Record<string, PropertyItemConfig>;
    }, [selectedNode]);

    const handleChange = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const config = propertyConfig[key] ?? { type: 'string', default: '' };
        let newValue: unknown = raw;
        if (config.type === 'number') {
            newValue = raw === '' ? 0 : Number(raw);
            if (isNaN(newValue as number)) newValue = (config.default as number) ?? 0;
        }
        setLocalData((prev) => ({ ...prev, [key]: newValue }));
    }, [propertyConfig]);

    const commitUpdate = useCallback(() => {
        if (selectedNode) {
            if (DEBUG) console.log('[PropsPanel] 提交更新:', selectedNode.id, localData);
            updateNodeData(selectedNode.id, localData);
        }
    }, [selectedNode, localData, updateNodeData]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitUpdate();
    }, [commitUpdate]);

    const propertyKeys = Object.keys(propertyConfig);

    // 获取顶部和底部的动态扩展组件
    const topExtensions = getPropsPanelExtensions('top', selectedNode);
    const bottomExtensions = getPropsPanelExtensions('bottom', selectedNode);

    return (
        <div className={`props-panel${collapsed ? ' collapsed' : ''}`}>
            <CollapseButton side="right" collapsed={collapsed} onClick={onToggle} />
            {!collapsed && (
                <>
                    <div className="props-content">
                        {/* 顶部扩展槽 */}
                        {topExtensions.map(ext => {
                            const ExtensionComponent = ext.component;
                            return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
                        })}

                        {selectedNode ? (
                            <div>
                                <div className="prop-info">
                                    <strong>类型：</strong>{selectedNode.type}<br />
                                    <strong>ID：</strong>{selectedNode.id}
                                </div>
                                {propertyKeys.length > 0 ? (
                                    propertyKeys.map((key) => (
                                        <div key={key} className="prop-row">
                                            <label>{key}</label>
                                            <input
                                                value={String(localData[key] ?? '')}
                                                onChange={(e) => handleChange(key, e)}
                                                onBlur={commitUpdate}
                                                onKeyDown={handleKeyDown}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="prop-tip">此节点类型无可用属性</p>
                                )}
                            </div>
                        ) : (
                            <p className="prop-tip">点击画布上的节点以查看属性</p>
                        )}

                        {/* 底部扩展槽 */}
                        {bottomExtensions.map(ext => {
                            const ExtensionComponent = ext.component;
                            return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
                        })}
                    </div>
                    <div className="props-footer"><h3>📋 属性</h3></div>
                </>
            )}
        </div>
    );
}