// src/bus/EditorBusContext.ts
// 事件总线 React Context 提供者
// 将 EditorBus 实例通过 Context 传递给所有子组件

import { createContext, useContext } from 'react';
import type { EditorBus } from './types';

// 创建 Context，初始值为 null
const BusContext = createContext<EditorBus | null>(null);

/**
 * Context 提供者组件
 * 用法： <EditorBusProvider value={bus}> ... </EditorBusProvider>
 */
export const EditorBusProvider = BusContext.Provider;

/**
 * 在子组件中获取总线实例的 Hook
 * 必须在 <EditorBusProvider> 内部使用，否则抛出错误
 */
export function useEditorBusContext(): EditorBus {
  const bus = useContext(BusContext);
  if (!bus) {
    throw new Error('useEditorBusContext 必须在 EditorBusProvider 内部使用');
  }
  return bus;
}