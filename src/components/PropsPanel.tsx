// src/components/PropsPanel.tsx
// 属性面板 —— 右侧面板，显示选中节点的可编辑属性（根据模板定义动态生成输入框）
// 现在使用 getAllTemplates() 动态获取模板信息

import { useState, useEffect, useCallback, useMemo } from 'react';
import CollapseButton from './CollapseButton';
import { DEBUG } from '../../config/debug';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import type { CustomNode } from '../utils/types';

interface PropertyItemConfig { type: string; default: unknown; }

interface PropsPanelProps {
    collapsed: boolean;       // 是否折叠
    onToggle: () => void;     // 折叠切换
    selectedNode: CustomNode | null;  // 当前选中的节点
    updateNodeData: (id: string, data: Record<string, unknown>) => void; // 更新节点数据的回调
}

export default function PropsPanel({ collapsed, onToggle, selectedNode, updateNodeData }: PropsPanelProps) {
    // 本地状态：编辑中的属性数据（避免每次输入都派发事件，仅在 blur 或 Enter 时提交）
    const [localData, setLocalData] = useState<Record<string, unknown>>(selectedNode?.data ?? {});

    // 当选中节点变化时，同步本地编辑区
    useEffect(() => {
        if (selectedNode) { setLocalData(selectedNode.data); } else { setLocalData({}); }
    }, [selectedNode]);

    // 根据节点类型获取属性配置（从注册中心的模板 properties 字段）
    const propertyConfig = useMemo((): Record<string, PropertyItemConfig> => {
        if (!selectedNode) return {};
        const template = getAllTemplates().find(t => t.type === selectedNode.type);
        return (template?.properties ?? {}) as Record<string, PropertyItemConfig>;
    }, [selectedNode]);

    // 属性值变化时更新本地状态
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

    // 提交更新：将本地数据同步到节点
    const commitUpdate = useCallback(() => {
        if (selectedNode) {
            if (DEBUG) console.log('[PropsPanel] 提交更新:', selectedNode.id, localData);
            updateNodeData(selectedNode.id, localData);
        }
    }, [selectedNode, localData, updateNodeData]);

    // Enter 键提交
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitUpdate();
    }, [commitUpdate]);

    const propertyKeys = Object.keys(propertyConfig);

    return (
        <div className={`props-panel${collapsed ? ' collapsed' : ''}`}>
            <CollapseButton side="right" collapsed={collapsed} onClick={onToggle} />
            {!collapsed && (
                <>
                    <div className="props-content">
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
                                                onBlur={commitUpdate}   // 失焦时提交
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
                    </div>
                    <div className="props-footer"><h3>📋 属性</h3></div>
                </>
            )}
        </div>
    );
}