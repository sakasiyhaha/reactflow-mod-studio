// src/hooks/useWorkflowIO.ts
// 工作流导入/导出 Hook —— 提供保存和加载工作流的回调

import { useCallback } from 'react';
import { exportWorkflow, importWorkflow } from '../utils/workflowIO';
import type { CustomNode, CustomEdge } from '../utils/types';

export function useWorkflowIO(
  nodes: CustomNode[],
  edges: CustomEdge[],
  loadWorkflow: (nodes: CustomNode[], edges: CustomEdge[]) => void  // 加载后的回调（将数据传给总线）
) {
  // 保存：将当前 nodes/edges 导出为 JSON 文件下载
  const handleSaveWorkflow = useCallback(() => {
    exportWorkflow(nodes, edges);
  }, [nodes, edges]);

  // 加载：打开文件选择对话框，解析 JSON 后调用 loadWorkflow 回调
  const handleLoadWorkflow = useCallback(async () => {
    try {
      const { nodes: newNodes, edges: newEdges } = await importWorkflow();
      loadWorkflow(newNodes as CustomNode[], newEdges as CustomEdge[]);
    } catch (e: any) {
      if (e.message !== '未选择文件') {
        console.error('导入工作流失败:', e);
      }
    }
  }, [loadWorkflow]);

  return { handleSaveWorkflow, handleLoadWorkflow };
}