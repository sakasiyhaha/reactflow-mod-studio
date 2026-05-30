// custom-mods/register-item-ref-rule.ts
// 示例 Mod：注册自定义端口类型 item_ref 的连接规则
import type { EditorMod } from '../src/bus/types';
import { registerConnectionRule } from '../src/registry/connectionRuleRegistry';

export const registerItemRefRuleMod: EditorMod = {
    id: 'register-item-ref-rule',
    init() {
        // 注册 item_ref 可以连接到 item_ref 或通配符
        registerConnectionRule('item_ref', ['item_ref', '*']);
        console.log('[register-item-ref-rule] 已注册 item_ref 类型连接规则');
        // 无需清理函数，规则会持续存在（除非页面刷新）
        return () => {
            // 可选：在 Mod 卸载时移除规则
            // 由于规则注册中心未提供 removeConnectionRule 按值删除的便捷方法，此处留空
            console.log('[register-item-ref-rule] 卸载');
        };
    },
};