// src/components/ProjectConfigPanel.tsx
// 项目设置面板 —— 动态渲染注册的配置项

import { useProjectConfig } from '../hooks/useProjectConfig';
import { DEBUG } from '../../config/debug';

export default function ProjectConfigPanel() {
  const {
    outputPath,
    rollbackPath,
    setOutputPath,
    setRollbackPath,
    config,
    setConfigValue,
    resetConfig,
    registeredFields,
  } = useProjectConfig();

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

  return (
    <div className="props-panel" style={{ padding: '16px' }}>
      <div className="props-content">
        <h3 style={{ marginBottom: 16 }}>📁 项目设置</h3>

        {/* 基础配置区（原有字段） */}
        <div className="prop-row">
          <label>输出目录</label>
          <input type="text" value={outputPath} onChange={(e) => setOutputPath(e.target.value)} placeholder="例如：D:/MyModProject/src/main/java" />
        </div>
        <div className="prop-row">
          <label>回滚备份目录</label>
          <input type="text" value={rollbackPath} onChange={(e) => setRollbackPath(e.target.value)} placeholder="例如：D:/MyModBackups" />
        </div>

        {/* 动态配置区 */}
        {registeredFields.length > 0 && (
          <>
            <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />
            <h4>扩展配置</h4>
            {registeredFields.map(field => (
              <div key={field.key} className="prop-row">
                <label>{field.label}</label>
                {field.component ? (
                  <field.component value={config[field.key]} onChange={(val: any) => setConfigValue(field.key, val)} />
                ) : (
                  renderField(field)
                )}
                {field.validate && !field.validate(config[field.key]) && (
                  <span style={{ color: '#EF4444', fontSize: 12 }}>校验失败</span>
                )}
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button onClick={resetConfig} style={{ flex: 1, padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
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