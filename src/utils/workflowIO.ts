// src/utils/workflowIO.ts
// 工作流导入/导出工具 —— 将节点和边序列化为 JSON 文件，或从文件恢复

/** 导出工作流为 JSON 文件下载 */
export function exportWorkflow(nodes: any[], edges: any[]) {
  const data = { nodes, edges, version: 1 };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflow-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 从 JSON 文件导入工作流，返回 Promise
 *  修复：检测用户取消文件选择（通过 focus 事件 + 超时），避免 Promise 永久 pending
 */
export function importWorkflow(): Promise<{ nodes: any[]; edges: any[] }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    let isResolved = false;
    let focusHandler: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 清理函数：移除事件监听和超时
    const cleanup = () => {
      if (focusHandler) {
        window.removeEventListener('focus', focusHandler);
        focusHandler = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // 用户选择文件后的处理
    const onFileSelected = (event: Event) => {
      if (isResolved) return;
      cleanup(); // 取消监听
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        isResolved = true;
        reject(new Error('未选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (isResolved) return;
        isResolved = true;
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            reject(new Error('文件读取结果不是文本'));
            return;
          }
          const data = JSON.parse(result);
          if (data.nodes && data.edges) {
            resolve({ nodes: data.nodes, edges: data.edges });
          } else {
            reject(new Error('无效的工作流文件'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => {
        if (isResolved) return;
        isResolved = true;
        reject(new Error('文件读取失败'));
      };
      reader.readAsText(file);
    };

    input.onchange = onFileSelected;

    // 页面重新获得焦点时，如果还未选择文件，则认为用户取消了对话框
    focusHandler = () => {
      if (isResolved) return;
      cleanup();
      isResolved = true;
      reject(new Error('未选择文件'));
    };
    window.addEventListener('focus', focusHandler, { once: true });

    // 兜底超时：如果 60 秒内没有任何操作，也视为取消（防止 focus 事件未触发）
    timeoutId = setTimeout(() => {
      if (isResolved) return;
      cleanup();
      isResolved = true;
      reject(new Error('未选择文件（超时）'));
    }, 60000);

    // 打开文件选择对话框
    input.click();
  });
}