// src/store/ResourceStore.ts
// 全局资源管理器，用于存储节点中的大容量数据（纹理、音频、模型等）
// 支持引用计数，避免重复存储和内存泄漏

export interface StoredResource {
  data: Blob;
  refCount: number;
}

class ResourceStoreImpl {
  private resources: Map<string, StoredResource> = new Map();
  private idCounter = 0;

  /**
   * 注册一个新资源
   * @param blob 资源数据（Blob 格式）
   * @returns 资源唯一标识符（UUID）
   */
  register(blob: Blob): string {
    const id = this.generateId();
    this.resources.set(id, { data: blob, refCount: 1 });
    if (typeof window !== 'undefined' && (window as any).DEBUG) {
      console.log(`[ResourceStore] 注册资源 ${id}, 大小: ${blob.size} bytes`);
    }
    return id;
  }

  /**
   * 获取资源数据
   * @param id 资源标识符
   * @returns Blob 或 null（如果不存在）
   */
  get(id: string): Blob | null {
    const entry = this.resources.get(id);
    return entry ? entry.data : null;
  }

  /**
   * 增加资源的引用计数（当节点被复制时调用）
   * @param id 资源标识符
   * @returns 是否成功
   */
  retain(id: string): boolean {
    const entry = this.resources.get(id);
    if (!entry) {
      console.warn(`[ResourceStore] 尝试增加不存在的资源引用: ${id}`);
      return false;
    }
    entry.refCount++;
    if (typeof window !== 'undefined' && (window as any).DEBUG) {
      console.log(`[ResourceStore] 资源 ${id} 引用计数 -> ${entry.refCount}`);
    }
    return true;
  }

  /**
   * 减少资源的引用计数，当计数归零时删除资源
   * @param id 资源标识符
   * @returns 是否成功
   */
  release(id: string): boolean {
    const entry = this.resources.get(id);
    if (!entry) {
      console.warn(`[ResourceStore] 尝试释放不存在的资源: ${id}`);
      return false;
    }
    entry.refCount--;
    if (typeof window !== 'undefined' && (window as any).DEBUG) {
      console.log(`[ResourceStore] 资源 ${id} 引用计数 -> ${entry.refCount}`);
    }
    if (entry.refCount <= 0) {
      this.resources.delete(id);
      if (typeof window !== 'undefined' && (window as any).DEBUG) {
        console.log(`[ResourceStore] 资源 ${id} 已释放（引用计数归零）`);
      }
    }
    return true;
  }

  /**
   * 检查资源是否存在
   * @param id 资源标识符
   */
  has(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * 获取所有资源的快照（用于调试）
   */
  snapshot(): Record<string, { size: number; refCount: number }> {
    const result: Record<string, { size: number; refCount: number }> = {};
    for (const [id, entry] of this.resources.entries()) {
      result[id] = { size: entry.data.size, refCount: entry.refCount };
    }
    return result;
  }

  /**
   * 清空所有资源（用于测试或重置）
   */
  clear(): void {
    this.resources.clear();
    this.idCounter = 0;
    if (typeof window !== 'undefined' && (window as any).DEBUG) {
      console.log('[ResourceStore] 已清空所有资源');
    }
  }

  private generateId(): string {
    return `res_${Date.now()}_${this.idCounter++}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// 全局单例
export const ResourceStore = new ResourceStoreImpl();

// 导出类型
export type { ResourceStoreImpl as ResourceStoreType };