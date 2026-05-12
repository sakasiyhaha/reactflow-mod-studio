// src/components/ProjectConfigPanel.tsx
// 项目设置面板 —— 配置输出目录和回滚备份目录，保存到 localStorage

import { useProjectConfig } from '../hooks/useProjectConfig';

export default function ProjectConfigPanel() {
    const { outputPath, rollbackPath, setOutputPath, setRollbackPath, resetConfig } = useProjectConfig();

    return (
        <div className="props-panel" style={{ padding: '16px' }}>
            <div className="props-content">
                <h3 style={{ marginBottom: 16 }}>📁 项目设置</h3>
                {/* 输出目录 */}
                <div className="prop-row">
                    <label>输出目录</label>
                    <input type="text" value={outputPath} onChange={(e) => setOutputPath(e.target.value)} placeholder="例如：D:/MyModProject/src/main/java" />
                </div>
                {/* 回滚备份目录 */}
                <div className="prop-row">
                    <label>回滚备份目录</label>
                    <input type="text" value={rollbackPath} onChange={(e) => setRollbackPath(e.target.value)} placeholder="例如：D:/MyModBackups" />
                </div>
                {/* 恢复默认按钮 */}
                <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                    <button onClick={resetConfig} style={{ flex: 1, padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                        恢复默认
                    </button>
                </div>
                <p className="prop-tip" style={{ marginTop: 12 }}>
                    配置后，生成的代码将输出到指定目录，旧文件自动备份。
                </p>
            </div>
        </div>
    );
}