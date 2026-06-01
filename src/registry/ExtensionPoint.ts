// src/registry/ExtensionPoint.ts
// 统一扩展点接口，用于所有注册中心
// 支持依赖声明（dependencies）、优先级（priority）、激活（activate）和停用（deactivate）

export interface ExtensionPoint<T = any> {
  id: string;                     // 唯一标识
  dependencies?: string[];        // 依赖的其他扩展点 ID 列表
  priority?: number;              // 优先级（数值越小越靠前/越先激活）
  activate: (context?: any) => T | void;   // 激活函数，返回注册项或执行副作用
  deactivate?: () => void;        // 停用清理函数
}

export class ExtensionManager {
  private extensions: Map<string, ExtensionPoint> = new Map();

  /**
   * 注册一个扩展点
   * @returns 取消注册的函数
   */
  register(ext: ExtensionPoint): () => void {
    this.extensions.set(ext.id, ext);
    return () => this.extensions.delete(ext.id);
  }

  /**
   * 获取扩展点
   */
  getExtension(id: string): ExtensionPoint | undefined {
    return this.extensions.get(id);
  }

  /**
   * 更新扩展点的优先级
   */
  updatePriority(id: string, newPriority: number): boolean {
    const ext = this.extensions.get(id);
    if (!ext) return false;
    ext.priority = newPriority;
    return true;
  }

  /**
   * 按依赖关系和优先级排序，返回激活顺序
   * 使用 Kahn 算法进行拓扑排序，再按 priority 稳定排序
   */
  resolveOrder(): ExtensionPoint[] {
    // 构建依赖图
    const graph = new Map<string, string[]>();
    const idToExt = new Map<string, ExtensionPoint>();
    for (const [id, ext] of this.extensions.entries()) {
      idToExt.set(id, ext);
      graph.set(id, ext.dependencies || []);
    }

    // 计算入度
    const inDegree = new Map<string, number>();
    for (const [id, deps] of graph.entries()) {
      if (!inDegree.has(id)) inDegree.set(id, 0);
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // 收集入度为 0 的节点
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    // 拓扑排序
    const result: ExtensionPoint[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      const ext = idToExt.get(id);
      if (ext) result.push(ext);
      const deps = graph.get(id) || [];
      for (const dep of deps) {
        const newDeg = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) queue.push(dep);
      }
    }

    // 按 priority 稳定排序（升序）
    result.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    return result;
  }

  /**
   * 清空所有扩展点
   */
  clear(): void {
    this.extensions.clear();
  }
}