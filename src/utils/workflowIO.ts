// src/utils/workflowIO.ts
// 工作流导入/导出工具 —— 将节点和边序列化为 JSON 文件，或从文件恢复

/** 导出工作流为 JSON 文件下载 */
export function exportWorkflow(nodes: any[], edges: any[]) {
  const data = { nodes, edges, version: 1 };                             // 数据对象，包含版本号
  const json = JSON.stringify(data, null, 2);                             // 格式化 JSON
  const blob = new Blob([json], { type: 'application/json' });            // 创建 Blob
  const url = URL.createObjectURL(blob);                                  // 生成临时 URL
  const link = document.createElement('a');                               // 创建隐藏下载链接
  link.href = url;
  link.download = `workflow-${Date.now()}.json`;                         // 文件名带时间戳
  document.body.appendChild(link);
  link.click();                                                           // 触发下载
  document.body.removeChild(link);                                        // 清理
  URL.revokeObjectURL(url);
}

/** 从 JSON 文件导入工作流，返回 Promise */
export function importWorkflow(): Promise<{ nodes: any[]; edges: any[] }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) { reject(new Error('未选择文件')); return; }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') { reject(new Error('文件读取结果不是文本')); return; }
          const data = JSON.parse(result);
          if (data.nodes && data.edges) {
            resolve({ nodes: data.nodes, edges: data.edges });
          } else {
            reject(new Error('无效的工作流文件'));
          }
        } catch (err) { reject(err); }
      };
      reader.readAsText(file);
    };
    input.click();  // 打开文件选择对话框
  });
}