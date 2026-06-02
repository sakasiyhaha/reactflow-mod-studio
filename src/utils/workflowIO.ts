// src/utils/workflowIO.ts
// 工作流导入/导出工具 —— 将节点和边序列化为 JSON 文件，或从文件恢复
// 支持资源外部化：将节点 data._resources 中的 Blob 转为 base64 嵌入，导入时恢复
import { WORKFLOW_IO } from '../../config/numbers';
import { ResourceStore } from '../store/ResourceStore';

/** 将 Blob 转换为 base64 字符串 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/** 将 base64 字符串转换为 Blob */
const base64ToBlob = (base64: string, mimeType?: string): Blob => {
  const arr = base64.split(',');
  const mime = mimeType || arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/** 导出工作流为 JSON 文件下载（支持资源序列化） */
export async function exportWorkflow(nodes: any[], edges: any[]) {
  // 深拷贝节点数据，避免修改原对象
  const exportNodes = JSON.parse(JSON.stringify(nodes));

  // 收集所有资源 ID，并映射为 base64
  const resourceMap = new Map<string, string>(); // id -> base64
  for (const node of exportNodes) {
    if (node.data?._resources && Array.isArray(node.data._resources)) {
      for (const resId of node.data._resources) {
        if (!resourceMap.has(resId)) {
          const blob = ResourceStore.get(resId);
          if (blob) {
            const base64 = await blobToBase64(blob);
            resourceMap.set(resId, base64);
            console.log(`[workflowIO] 序列化资源 ${resId}，大小 ${blob.size} bytes`);
          } else {
            console.warn(`[workflowIO] 资源 ${resId} 不存在，跳过`);
          }
        }
      }
    }
  }

  // 将资源映射表附加到导出数据中
  const exportData = {
    nodes: exportNodes,
    edges,
    version: 1,
    resources: Object.fromEntries(resourceMap), // 存储 base64 字符串
  };

  const json = JSON.stringify(exportData, null, 2);
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

/** 从 JSON 文件导入工作流，返回 Promise（支持资源反序列化） */
export function importWorkflow(): Promise<{ nodes: any[]; edges: any[] }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    let isResolved = false;
    let dialogJustOpened = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let focusHandler: ((e: FocusEvent) => void) | null = null;

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

    // 修复：延迟检查，给 onchange 一个机会先执行
    const onFocus = () => {
      if (isResolved) return;
      setTimeout(() => {
        if (isResolved) return;
        if (dialogJustOpened) {
          isResolved = true;
          cleanup();
          reject(new Error('未选择文件'));
        }
      }, WORKFLOW_IO.CANCEL_DETECTION_DELAY);
    };

    focusHandler = onFocus;
    window.addEventListener('focus', focusHandler);

    const onFileSelected = async (event: Event) => {
      if (isResolved) return;
      dialogJustOpened = false;
      cleanup(); // 移除 focus 监听，避免后续误判
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        isResolved = true;
        reject(new Error('未选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (isResolved) return;
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('文件读取结果不是文本');
          }
          const data = JSON.parse(result);
          if (!data.nodes || !data.edges) {
            throw new Error('无效的工作流文件');
          }

          // 反序列化资源：将 base64 恢复为 Blob 并注册到 ResourceStore
          const resourceIdMap = new Map<string, string>(); // 旧 id -> 新 id
          if (data.resources && typeof data.resources === 'object') {
            for (const [oldId, base64] of Object.entries(data.resources)) {
              if (typeof base64 === 'string') {
                const blob = base64ToBlob(base64);
                const newId = ResourceStore.register(blob);
                resourceIdMap.set(oldId, newId);
                console.log(`[workflowIO] 恢复资源 ${oldId} -> ${newId}，大小 ${blob.size} bytes`);
              }
            }
          }

          // 更新节点中的 _resources 引用
          const newNodes = data.nodes.map((node: any) => {
            if (node.data?._resources && Array.isArray(node.data._resources)) {
              const newResources = node.data._resources.map((oldId: string) => {
                const newId = resourceIdMap.get(oldId);
                if (newId) return newId;
                console.warn(`[workflowIO] 资源 ${oldId} 在文件中不存在，保留原 ID（可能无效）`);
                return oldId;
              });
              return {
                ...node,
                data: { ...node.data, _resources: newResources },
              };
            }
            return node;
          });

          isResolved = true;
          resolve({ nodes: newNodes, edges: data.edges });
        } catch (err) {
          isResolved = true;
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

    // 兜底超时：（WORKFLOW_IO.IMPORT_TIMEOUT）分钟内如果没有任何交互，视为取消
    timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(new Error('未选择文件（超时）'));
    }, WORKFLOW_IO.IMPORT_TIMEOUT);

    input.click();
  });
}