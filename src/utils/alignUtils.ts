// src/utils/alignUtils.ts
// 对齐与分布纯函数 —— 所有函数接收节点数组，返回修改后的新数组（不直接修改原引用）
// 支持：左/右/顶/底对齐、水平/垂直居中对齐、水平/垂直均分
// 节点尺寸优先顺序：
//   1. 节点自身的 width/height 属性（React Flow 测量值）
//   2. 节点 data 中的 __templateDefaultWidth / __templateDefaultHeight（模板默认值）
//   3. 全局默认值（DEFAULT_NODE_WIDTH / DEFAULT_NODE_HEIGHT）

import type { CustomNode } from './types';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../config/editorConfig';

const MIN_GAP = 20; // 节点之间的最小间距

/**
 * 获取节点宽度
 * 优先级：node.width > node.measured.width > data.__templateDefaultWidth > 全局默认
 */
function getNodeWidth(node: CustomNode): number {
    if (node.width !== undefined) return node.width;
    if (node.measured?.width !== undefined) return node.measured.width;
    const templateWidth = (node.data as any)?.__templateDefaultWidth;
    if (typeof templateWidth === 'number') return templateWidth;
    return DEFAULT_NODE_WIDTH;
}

/**
 * 获取节点高度
 * 优先级：node.height > node.measured.height > data.__templateDefaultHeight > 全局默认
 */
function getNodeHeight(node: CustomNode): number {
    if (node.height !== undefined) return node.height;
    if (node.measured?.height !== undefined) return node.measured.height;
    const templateHeight = (node.data as any)?.__templateDefaultHeight;
    if (typeof templateHeight === 'number') return templateHeight;
    return DEFAULT_NODE_HEIGHT;
}

/** 保证按 y 排序的节点在垂直方向上有足够的间隙（防止重叠） */
function preventVerticalOverlap(sortedByY: CustomNode[]) {
    let cursor = -Infinity;
    sortedByY.forEach(node => {
        const h = getNodeHeight(node);
        if (node.position.y < cursor) {
            node.position.y = cursor;
        }
        cursor = node.position.y + h + MIN_GAP;
    });
}

/** 保证按 x 排序的节点在水平方向上有足够的间隙 */
function preventHorizontalOverlap(sortedByX: CustomNode[]) {
    let cursor = -Infinity;
    sortedByX.forEach(node => {
        const w = getNodeWidth(node);
        if (node.position.x < cursor) {
            node.position.x = cursor;
        }
        cursor = node.position.x + w + MIN_GAP;
    });
}

/** 左对齐：所有选中节点的左边界对齐到最左侧节点的 x 坐标 */
export function alignLeft(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const minX = Math.min(...selected.map(n => n.position.x));
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);

    sorted.forEach(n => { n.position.x = minX; });
    preventVerticalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 右对齐：按右边缘对齐 */
export function alignRight(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const maxX = Math.max(...selected.map(n => n.position.x + getNodeWidth(n)));
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);

    sorted.forEach(n => { n.position.x = maxX - getNodeWidth(n); });
    preventVerticalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 顶对齐 */
export function alignTop(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const minY = Math.min(...selected.map(n => n.position.y));
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);

    sorted.forEach(n => { n.position.y = minY; });
    preventHorizontalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 底对齐 */
export function alignBottom(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const maxY = Math.max(...selected.map(n => n.position.y + getNodeHeight(n)));
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);

    sorted.forEach(n => { n.position.y = maxY - getNodeHeight(n); });
    preventHorizontalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 水平居中对齐 */
export function alignCenterX(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const minX = Math.min(...selected.map(n => n.position.x));
    const maxX = Math.max(...selected.map(n => n.position.x + getNodeWidth(n)));
    const centerX = (minX + maxX) / 2;
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);

    sorted.forEach(n => { n.position.x = centerX - getNodeWidth(n) / 2; });
    preventVerticalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 垂直居中对齐 */
export function alignCenterY(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return nodes;

    const minY = Math.min(...selected.map(n => n.position.y));
    const maxY = Math.max(...selected.map(n => n.position.y + getNodeHeight(n)));
    const centerY = (minY + maxY) / 2;
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);

    sorted.forEach(n => { n.position.y = centerY - getNodeHeight(n) / 2; });
    preventHorizontalOverlap(sorted);

    const updated = new Map(sorted.map(n => [n.id, n.position]));
    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 水平均分（至少3个节点）：等间距分布选中节点的 x 坐标 */
export function distributeHorizontal(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 3) return nodes;

    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);

    const totalWidth = sorted.reduce((sum, node) => sum + getNodeWidth(node), 0);
    const totalGap = MIN_GAP * (sorted.length - 1);
    const requiredSpan = totalWidth + totalGap;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    let span = last.position.x - first.position.x;
    if (span < requiredSpan) span = requiredSpan;

    const updated = new Map<string, { x: number; y: number }>();
    let cursorX = first.position.x;

    sorted.forEach(node => {
        updated.set(node.id, { ...node.position, x: cursorX });
        cursorX += getNodeWidth(node) + MIN_GAP;
    });

    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}

/** 垂直均分：等间距分布选中节点的 y 坐标 */
export function distributeVertical(nodes: CustomNode[]): CustomNode[] {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 3) return nodes;

    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);

    const totalHeight = sorted.reduce((sum, node) => sum + getNodeHeight(node), 0);
    const totalGap = MIN_GAP * (sorted.length - 1);
    const requiredSpan = totalHeight + totalGap;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    let span = last.position.y - first.position.y;
    if (span < requiredSpan) span = requiredSpan;

    const updated = new Map<string, { x: number; y: number }>();
    let cursorY = first.position.y;

    sorted.forEach(node => {
        updated.set(node.id, { ...node.position, y: cursorY });
        cursorY += getNodeHeight(node) + MIN_GAP;
    });

    return nodes.map(n => updated.has(n.id) ? { ...n, position: updated.get(n.id)! } : n);
}