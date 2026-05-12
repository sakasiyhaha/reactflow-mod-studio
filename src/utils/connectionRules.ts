// src/utils/connectionRules.ts
// 端口类型兼容规则 —— 定义不同端口类型之间是否允许连接

/**
 * 连接兼容性规则表
 * key: 源端口类型 (source type)
 * value: 允许连接的目标端口类型数组
 *
 * 特殊类型:
 *   '*' 通配符 — 作为源或目标端口时，可匹配任意类型
 */
export const CONNECTION_RULES: Record<string, string[]> = {
    'number':  ['number', 'boolean', '*'],
    'boolean': ['boolean', 'number', '*'],
    'exec':    ['exec', '*'],
    '*':       ['number', 'boolean', 'exec', '*'],
};

/**
 * 判断两个端口类型是否可以连接
 * @param sourceType - 源端口类型
 * @param targetType - 目标端口类型
 * @returns 是否可连接
 */
export function isValidConnectionType(sourceType: string, targetType: string): boolean {
    // 通配符端口可以与任何类型相连
    if (sourceType === '*' || targetType === '*') {
        return true;
    }

    const allowedTargets = CONNECTION_RULES[sourceType];
    return allowedTargets ? allowedTargets.includes(targetType) : false;
}