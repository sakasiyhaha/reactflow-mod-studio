// src/utils/layoutUtils.ts
// 自动布局算法 —— 基于拓扑分层 BFS，将图从左到右分层排列

/**
 * 基于拓扑分层的从左到右自动布局算法
 * @param nodes   - 节点数组
 * @param edges   - 边数组
 * @param options - 布局选项（水平间距、垂直间距、起始坐标）
 * @returns 带有新 position 的节点数组
 */
export function autoLayout(
  nodes: any[],
  edges: any[],
  options: {
    horizontalSpacing?: number;   // 层级间水平间距，默认 250
    verticalSpacing?: number;     // 同层节点间垂直间距，默认 150
    startX?: number;              // 起始 X 坐标，默认 100
    startY?: number;              // 起始 Y 坐标，默认 300
  } = {}
) {
  const { horizontalSpacing = 250, verticalSpacing = 150, startX = 100, startY = 300 } = options;
  if (!nodes || nodes.length === 0) return [];

  // 构建邻接表（出边和入边）
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  nodes.forEach((node: any) => {
    outEdges.set(node.id, []);
    inEdges.set(node.id, []);
  });
  edges.forEach((edge: any) => {
    if (outEdges.has(edge.source)) outEdges.get(edge.source)!.push(edge.target);
    if (inEdges.has(edge.target)) inEdges.get(edge.target)!.push(edge.source);
  });

  // 找出所有入口节点（没有输入边的节点）
  const entryNodes = nodes.filter((node: any) => (inEdges.get(node.id) || []).length === 0);
  const startNodes = entryNodes.length > 0 ? entryNodes : [nodes[0]];

  // BFS 分配层级
  const layers: string[][] = [];
  const assignedLayers = new Map<string, number>();
  const queue: string[] = [];
  startNodes.forEach((node: any) => {
    assignedLayers.set(node.id, 0);
    if (!layers[0]) layers[0] = [];
    layers[0].push(node.id);
    queue.push(node.id);
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLayer = assignedLayers.get(currentId)!;
    const children = outEdges.get(currentId) || [];
    children.forEach((childId: string) => {
      const parents = inEdges.get(childId) || [];
      let maxParentLayer = -1;
      parents.forEach((parentId: string) => {
        const parentLayer = assignedLayers.get(parentId);
        if (parentLayer !== undefined && parentLayer > maxParentLayer) maxParentLayer = parentLayer;
      });
      const childLayer = maxParentLayer + 1;
      if (!assignedLayers.has(childId)) {
        assignedLayers.set(childId, childLayer);
        if (!layers[childLayer]) layers[childLayer] = [];
        layers[childLayer].push(childId);
        queue.push(childId);
      }
    });
  }

  // 处理未分配的孤立节点
  nodes.forEach((node: any) => {
    if (!assignedLayers.has(node.id)) {
      const maxLayer = layers.length;
      assignedLayers.set(node.id, maxLayer);
      if (!layers[maxLayer]) layers[maxLayer] = [];
      layers[maxLayer].push(node.id);
    }
  });

  // 根据层级计算每个节点的坐标
  const nodePositions = new Map<string, { x: number; y: number }>();
  layers.forEach((layerNodeIds: string[], layerIndex: number) => {
    const x = startX + layerIndex * horizontalSpacing;
    const totalHeight = (layerNodeIds.length - 1) * verticalSpacing;
    const yOffset = startY - totalHeight / 2;
    layerNodeIds.forEach((nodeId: string, nodeIndex: number) => {
      nodePositions.set(nodeId, { x, y: yOffset + nodeIndex * verticalSpacing });
    });
  });

  // 应用新位置
  return nodes.map((node: any) => ({
    ...node,
    position: nodePositions.get(node.id) || { x: startX, y: startY },
  }));
}