// src/components/ProjectConfigPanel.tsx
// 项目设置面板 —— 动态渲染注册的配置项（完全数据驱动）
// 不再包含任何硬编码字段（outputPath、rollbackPath 等）
// 所有配置字段均通过 projectConfigRegistry 注册，面板自动渲染
// 支持 helperText、校验、自定义组件等扩展能力

import { useProjectConfig } from '../hooks/useProjectConfig';
import { DEBUG } from '../../config/debug';
import { getResetHandler } from '../registry/settingsPanelRegistry';

export default function ProjectConfigPanel() {
  const {
    config,
    setConfigValue,
    resetConfig,
    registeredFields,
  } = useProjectConfig();

  // 包装重置函数，支持外部处理器（如确认对话框）
  const handleReset = () => {
    const handler = getResetHandler();
    if (handler) {
      handler(resetConfig);
    } else {
      resetConfig();
    }
  };

  // 渲染不同类型的输入控件
  const renderField = (field: typeof registeredFields[0]) => {
    const value = config[field.key];
    const onChange = (newVal: any) => setConfigValue(field.key, newVal);

    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? 0}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      case 'color':
        return (
          <input
            type="color"
            value={value ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'select':
        return (
          <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  // 按 order 排序（注册中心已排序，但这里再次确认）
  const sortedFields = [...registeredFields].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  return (
    <div className="props-panel" style={{ padding: '16px' }}>
      <div className="props-content">
        <h3 style={{ marginBottom: 16 }}>📁 项目设置</h3>

        {/* 动态渲染所有配置字段 */}
        {sortedFields.map(field => (
          <div key={field.key} className="prop-row">
            <label>{field.label}</label>
            {field.component ? (
              <field.component value={config[field.key]} onChange={(val: any) => setConfigValue(field.key, val)} />
            ) : (
              renderField(field)
            )}
            {/* 校验错误提示 */}
            {field.validate && !field.validate(config[field.key]) && (
              <span style={{ color: '#EF4444', fontSize: 12, display: 'block', marginTop: 4 }}>
                校验失败
              </span>
            )}
            {/* 帮助提示文本 */}
            {field.helperText && (
              <p style={{ fontSize: 11, marginTop: 4, marginBottom: 0, color: 'var(--text-secondary)' }}>
                💡 {field.helperText}
              </p>
            )}
          </div>
        ))}

        {sortedFields.length === 0 && (
          <p className="prop-tip" style={{ marginTop: 20 }}>
            暂无扩展配置项。
          </p>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-primary)'
            }}
          >
            恢复默认
          </button>
        </div>

        <p className="prop-tip" style={{ marginTop: 12 }}>
          配置后，相关功能将使用新的设置。
        </p>
      </div>
    </div>
  );
}