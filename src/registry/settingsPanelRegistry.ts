// src/registry/settingsPanelRegistry.ts
// 设置面板扩展注册中心 - 允许 Mod 自定义“恢复默认”等操作的行为

export type ResetHandler = (defaultReset: () => void) => void;

let resetHandler: ResetHandler | null = null;

/**
 * 注册自定义的重置处理函数
 * @param handler 接收默认 reset 函数作为参数，可在函数内添加确认对话框等逻辑，然后选择是否调用 defaultReset
 * @returns 取消注册的函数
 */
export function registerResetHandler(handler: ResetHandler): () => void {
    resetHandler = handler;
    return () => {
        resetHandler = null;
    };
}

/**
 * 获取当前注册的重置处理函数（供 ProjectConfigPanel 内部使用）
 */
export function getResetHandler(): ResetHandler | null {
    return resetHandler;
}