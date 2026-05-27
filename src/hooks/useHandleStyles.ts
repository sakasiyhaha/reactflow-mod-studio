// src/hooks/useHandleStyles.ts
export type HandlePosition = 'top' | 'bottom' | 'left' | 'right';
export type HandleType = 'source' | 'target';

export interface UseHandleStylesParams {
  nodeId?: string;
  position: HandlePosition;
  type: HandleType;
  nodeWidth: number;
  nodeHeight: number;
  index?: number;
  total?: number;
}

export interface HandleOffset {
  translateX: number;
  translateY: number;
}

export interface HandleStyle {
  transform: string;
  transformOrigin: string;
  transition?: string;
  willChange?: string;
  top?: string;
  left?: string;
}

/**
 * 从 CSS 变量读取偏移距离，默认为 7px
 * 可通过派发 SET_THEME_COLOR 事件修改：bus.dispatch({ type: 'SET_THEME_COLOR', payload: { variable: '--handle-offset-distance', value: '10px' } })
 */
function getOutwardDistance(): number {
  if (typeof document === 'undefined') return 7;
  const computed = getComputedStyle(document.documentElement);
  const cssValue = computed.getPropertyValue('--handle-offset-distance');
  if (cssValue) {
    const parsed = parseFloat(cssValue);
    if (!isNaN(parsed)) return parsed;
  }
  return 7;
}

function calculateOffset(position: HandlePosition, nodeWidth: number, nodeHeight: number): HandleOffset {
  const outwardDistance = getOutwardDistance();
  switch (position) {
    case 'top':    return { translateX: 0, translateY: -outwardDistance };
    case 'bottom': return { translateX: 0, translateY: outwardDistance };
    case 'left':   return { translateX: -outwardDistance, translateY: 0 };
    case 'right':  return { translateX: outwardDistance, translateY: 0 };
    default:       return { translateX: 0, translateY: 0 };
  }
}

function getPositionPercentage(index: number, total: number, isVertical: boolean): Record<string, string> | undefined {
  if (total <= 1) {
    return isVertical ? { top: '50%' } : { left: '50%' };
  }
  const percent = (100 / (total + 1)) * (index + 1);
  return isVertical ? { top: `${percent}%` } : { left: `${percent}%` };
}

function getBaseHandleStyle(
  position: HandlePosition,
  offset: HandleOffset,
  index?: number,
  total?: number
): HandleStyle {
  const isVertical = position === 'left' || position === 'right';
  const posStyle = (index !== undefined && total !== undefined)
    ? getPositionPercentage(index, total, isVertical)
    : (isVertical ? { top: '50%' } : { left: '50%' });

  const transform = `translate(${offset.translateX}px, ${offset.translateY}px)`;

  let transformOrigin = 'center';
  switch (position) {
    case 'top':    transformOrigin = 'center top'; break;
    case 'bottom': transformOrigin = 'center bottom'; break;
    case 'left':   transformOrigin = 'left center'; break;
    case 'right':  transformOrigin = 'right center'; break;
  }

  return {
    transform,
    transformOrigin,
    transition: 'transform 0.15s ease',
    willChange: 'transform',
    ...posStyle,
  };
}

export function useHandleStyles(params: UseHandleStylesParams): HandleStyle {
  const { position, nodeWidth, nodeHeight, index, total } = params;
  const offset = calculateOffset(position, nodeWidth, nodeHeight);
  return getBaseHandleStyle(position, offset, index, total);
}