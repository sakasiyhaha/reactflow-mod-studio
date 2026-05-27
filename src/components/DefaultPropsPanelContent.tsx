// src/components/DefaultPropsPanelContent.tsx
// 默认属性面板内容组件 —— 封装原有属性编辑逻辑
// 支持通过注册中心被替换
// 符合高保真方案：隐藏调试信息，优化属性编辑显示

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomNode } from '../utils/types';
import type { EditorBus } from '../bus/types';
import { getAllTemplates } from '../registry/nodeTemplateRegistry';
import { getPropsPanelExtensions } from '../registry/propsPanelRegistry';
import { DEBUG } from '../../config/debug';

interface DefaultPropsPanelContentProps {
  selectedNode: CustomNode | null;
  bus: EditorBus;
}

interface PropertyItemConfig {
  type: string;
  default: unknown;
}

// 节点类型中文映射（示例，可根据需要扩展）
const getNodeTypeDisplayName = (type: string): string => {
  const map: Record<string, string> = {
    numberInput: '数值输入',
    displayOutput: '显示输出',
    adder: '加法器',
    tripleAdder: '三数加法器',
    splitter: '数值分流器',
    dualOutput: '双输出常量',
    mux2: '二选一开关',
    compare: '比较器',
    sequence: '序列节点',
  };
  return map[type] ?? type;
};

const DefaultPropsPanelContent: React.FC<DefaultPropsPanelContentProps> = ({ selectedNode, bus }) => {
  const [localData, setLocalData] = useState<Record<string, unknown>>(selectedNode?.data ?? {});

  useEffect(() => {
    if (DEBUG) console.log('[DefaultPropsPanel] 选中节点变化:', selectedNode?.id, selectedNode?.data);
    setLocalData(selectedNode?.data ?? {});
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
    setLocalData(prev => ({ ...prev, [key]: newValue }));
    if (DEBUG) console.log(`[DefaultPropsPanel] 属性编辑: ${key}=${newValue}`);
  }, [propertyConfig]);

  const commitUpdate = useCallback(() => {
    if (selectedNode) {
      if (DEBUG) console.log(`[DefaultPropsPanel] 提交更新: ${selectedNode.id}`, localData);
      bus.dispatch({ type: 'NODE_DATA_CHANGED', nodeId: selectedNode.id, data: localData });
    }
  }, [selectedNode, localData, bus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitUpdate();
  }, [commitUpdate]);

  const propertyKeys = Object.keys(propertyConfig);
  const topExtensions = getPropsPanelExtensions('top', selectedNode);
  const bottomExtensions = getPropsPanelExtensions('bottom', selectedNode);

  if (!selectedNode) {
    return (
      <div>
        {topExtensions.map(ext => {
          const ExtensionComponent = ext.component;
          return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
        })}
        <p className="prop-tip">点击画布上的节点以查看属性</p>
        {bottomExtensions.map(ext => {
          const ExtensionComponent = ext.component;
          return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
        })}
      </div>
    );
  }

  const displayName = getNodeTypeDisplayName(selectedNode.type);
  const typeId = selectedNode.type;

  return (
    <div>
      {/* 顶部扩展槽 */}
      {topExtensions.map(ext => {
        const ExtensionComponent = ext.component;
        return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
      })}

      {/* 节点标题栏 */}
      <div className="prop-header">
        <h4 className="prop-title">{displayName}</h4>
        <div className="prop-subtitle">{typeId}</div>
      </div>

      {/* 基础信息区（可折叠，简化显示） */}
      <div className="prop-info">
        <div><strong>ID</strong> <span className="prop-id">{selectedNode.id}</span></div>
      </div>

      {/* 属性编辑区 */}
      {propertyKeys.length > 0 ? (
        propertyKeys.map(key => {
          // 将 key 转换为用户友好的标签
          const labelMap: Record<string, string> = {
            value: '初始值',
            label: '标签',
            mode: '模式',
          };
          const label = labelMap[key] ?? key;
          return (
            <div key={key} className="prop-row">
              <label>{label}</label>
              <input
                value={String(localData[key] ?? '')}
                onChange={(e) => handleChange(key, e)}
                onBlur={commitUpdate}
                onKeyDown={handleKeyDown}
              />
            </div>
          );
        })
      ) : (
        <p className="prop-tip">此节点类型无可用属性</p>
      )}

      {/* 底部扩展槽 */}
      {bottomExtensions.map(ext => {
        const ExtensionComponent = ext.component;
        return <ExtensionComponent key={ext.id} selectedNode={selectedNode} bus={bus} />;
      })}
    </div>
  );
};

export default DefaultPropsPanelContent;