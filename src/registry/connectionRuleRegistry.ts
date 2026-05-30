// src/registry/connectionRuleRegistry.ts
// 端口类型兼容规则注册中心
// 允许 Mod 动态添加自定义类型的连接规则，无需修改核心代码

type RuleMap = Map<string, Set<string>>;

// 内部存储：源类型 -> 允许的目标类型集合
let ruleMap: RuleMap = new Map();

// ==================== 内部辅助函数 ====================

/**
 * 初始化默认规则（与旧版 CONNECTION_RULES 保持一致）
 */
function initDefaultRules(): void {
    // number 可以连接 number, boolean, *
    addToRule('number', 'number');
    addToRule('number', 'boolean');
    addToRule('number', '*');
    
    // boolean 可以连接 boolean, number, *
    addToRule('boolean', 'boolean');
    addToRule('boolean', 'number');
    addToRule('boolean', '*');
    
    // exec 可以连接 exec, *
    addToRule('exec', 'exec');
    addToRule('exec', '*');
    
    // 通配符源类型可以连接任何类型
    addToRule('*', 'number');
    addToRule('*', 'boolean');
    addToRule('*', 'exec');
    addToRule('*', '*');
}

/**
 * 向规则集合中添加一项（内部使用，不对外暴露）
 */
function addToRule(sourceType: string, targetType: string): void {
    if (!ruleMap.has(sourceType)) {
        ruleMap.set(sourceType, new Set());
    }
    ruleMap.get(sourceType)!.add(targetType);
}

// 模块加载时自动初始化默认规则
initDefaultRules();

// ==================== 对外 API ====================

/**
 * 注册连接规则（合并）
 * 为给定的源类型添加允许连接的目标类型
 * @param sourceType 源端口类型
 * @param allowedTargetTypes 允许连接的目标类型数组
 */
export function registerConnectionRule(sourceType: string, allowedTargetTypes: string[]): void {
    if (!ruleMap.has(sourceType)) {
        ruleMap.set(sourceType, new Set());
    }
    const targets = ruleMap.get(sourceType)!;
    for (const target of allowedTargetTypes) {
        targets.add(target);
    }
    console.log(`[connectionRuleRegistry] 已注册规则: ${sourceType} -> [${Array.from(targets).join(', ')}]`);
}

/**
 * 设置连接规则（覆盖）
 * 完全替换给定源类型的允许目标列表
 * @param sourceType 源端口类型
 * @param allowedTargetTypes 允许连接的目标类型数组
 */
export function setConnectionRule(sourceType: string, allowedTargetTypes: string[]): void {
    ruleMap.set(sourceType, new Set(allowedTargetTypes));
    console.log(`[connectionRuleRegistry] 已设置规则: ${sourceType} -> [${allowedTargetTypes.join(', ')}]`);
}

/**
 * 移除连接规则
 * @param sourceType 源端口类型
 * @param targetType 可选，如果提供则仅移除该目标类型，否则移除整个源类型规则
 */
export function removeConnectionRule(sourceType: string, targetType?: string): void {
    if (!ruleMap.has(sourceType)) return;
    
    if (targetType !== undefined) {
        const targets = ruleMap.get(sourceType)!;
        targets.delete(targetType);
        if (targets.size === 0) {
            ruleMap.delete(sourceType);
        }
        console.log(`[connectionRuleRegistry] 已移除规则: ${sourceType} -> ${targetType}`);
    } else {
        ruleMap.delete(sourceType);
        console.log(`[connectionRuleRegistry] 已移除所有规则: ${sourceType}`);
    }
}

/**
 * 获取源类型允许连接的目标类型集合（只读）
 * @param sourceType 源端口类型
 * @returns 允许的目标类型集合
 */
export function getAllowedTargets(sourceType: string): ReadonlySet<string> {
    const targets = ruleMap.get(sourceType);
    return targets ? new Set(targets) : new Set();
}

/**
 * 判断两个端口类型是否可以连接（核心校验函数）
 * @param sourceType 源端口类型
 * @param targetType 目标端口类型
 * @returns 是否允许连接
 */
export function isValidConnectionType(sourceType: string, targetType: string): boolean {
    // 通配符快速通过
    if (sourceType === '*' || targetType === '*') {
        return true;
    }
    
    const allowed = getAllowedTargets(sourceType);
    return allowed.has(targetType) || allowed.has('*');
}

/**
 * 清空所有规则（用于测试或重置）
 */
export function clearConnectionRules(): void {
    ruleMap.clear();
    initDefaultRules(); // 重置后重新初始化默认规则
    console.log('[connectionRuleRegistry] 已清空并重置为默认规则');
}

/**
 * 获取当前所有规则的快照（用于调试）
 */
export function getConnectionRulesSnapshot(): Record<string, string[]> {
    const snapshot: Record<string, string[]> = {};
    for (const [source, targets] of ruleMap.entries()) {
        snapshot[source] = Array.from(targets);
    }
    return snapshot;
}