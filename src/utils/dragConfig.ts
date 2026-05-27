// src/utils/dragConfig.ts
import { PointerSensor, KeyboardSensor, useSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * 指针传感器延迟配置
 * 避免快速点击时误触发拖拽排序
 */
const pointerSensorConfig = {
  activationConstraint: {
    delay: 200,      // 按住 200ms 后才激活拖拽
    tolerance: 5,    // 鼠标移动超过 5px 才视为拖拽
  },
};

/**
 * 自定义 Hook：返回统一配置的拖拽传感器数组
 * 用于 useSensors(...useDragSensors())
 */
export function useDragSensors() {
  const pointerSensor = useSensor(PointerSensor, pointerSensorConfig);
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  return [pointerSensor, keyboardSensor];
}