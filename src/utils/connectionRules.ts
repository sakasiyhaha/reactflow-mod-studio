// src/utils/connectionRules.ts
/**
 * @deprecated 此文件已迁移至注册中心模式，请使用 connectionRuleRegistry 中的函数。
 * 保留此文件仅为向后兼容。新代码应直接使用 connectionRuleRegistry 的 API。
 */

import {
    isValidConnectionType as registryIsValidConnectionType,
    registerConnectionRule,
    setConnectionRule,
    removeConnectionRule,
    getAllowedTargets,
    clearConnectionRules,
    getConnectionRulesSnapshot,
} from '../registry/connectionRuleRegistry';

// 为了向后兼容，导出一个基于注册中心动态生成的 CONNECTION_RULES 对象（只读）
// 注意：这个对象不是原始的常量，而是动态构建的，但行为与旧版一致。
export const CONNECTION_RULES: Record<string, string[]> = new Proxy({}, {
    get(_, sourceType: string) {
        return Array.from(getAllowedTargets(sourceType));
    },
    ownKeys() {
        // 简化：返回已知的默认类型，避免枚举所有动态类型
        return ['number', 'boolean', 'exec', '*'];
    },
    getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
    }
}) as Record<string, string[]>;

// 重新导出核心函数，保持原有调用方式不变
export const isValidConnectionType = registryIsValidConnectionType;

// 可选导出新的 API（供高级用户）
export { registerConnectionRule, setConnectionRule, removeConnectionRule, getAllowedTargets, clearConnectionRules, getConnectionRulesSnapshot };