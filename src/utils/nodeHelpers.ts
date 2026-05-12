// src/utils/nodeHelpers.ts
// 节点辅助函数 —— 当下游节点与上游节点存在连线时，自动传播 value 变化

/**
 * 当某个节点的 value 改变时，将新 value 传播到所有直接下游节点
 * @param nodeId    - 值发生变化的节点 ID
 * @param newValue  - 新的 value 值
 * @param nodes     - 当前所有节点数组
 * @param edges     - 当前所有边数组
 * @returns 更新后的节点数组
 */
export function applyDownstreamValues(
    nodeId: string,
    newValue: any,
    nodes: any[],
    edges: any[]
): any[] {
    // 收集所有从该节点出发的边指向的下游节点 ID
    const downstreamIds = new Set<string>();
    edges.forEach((edge) => {
        if (edge.source === nodeId) {
            downstreamIds.add(edge.target);
        }
    });

    if (downstreamIds.size === 0) return nodes;

    // 将下游节点的 value 更新为新值（除非它们已经是新值）
    return nodes.map((n) =>
        downstreamIds.has(n.id) && n.data.value !== newValue
            ? { ...n, data: { ...n.data, value: newValue } }
            : n
    );
}