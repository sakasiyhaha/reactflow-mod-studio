// src/bus/confirmable.ts
// 轻量级确认辅助函数：为危险操作（如删除节点）提供确认框，用户确认后再派发事件。
// 不修改核心事件总线逻辑，仅提供实用工具。

import type { EditorBus, EditorEvent } from './types';

/**
 * 弹出确认框，用户确认后同步派发事件
 * @param bus EditorBus 实例
 * @param event 要派发的事件
 * @param message 确认框显示的消息
 * @returns Promise<void> 等待用户确认（resolve 表示已派发，reject 表示取消）
 */
export async function dispatchConfirmable(
    bus: EditorBus,
    event: EditorEvent,
    message: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const confirmed = window.confirm(message);
        if (confirmed) {
            bus.dispatch(event);
            resolve();
        } else {
            reject(new Error('用户取消操作'));
        }
    });
}