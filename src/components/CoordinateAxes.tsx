// src/components/CoordinateAxes.tsx
// 坐标轴组件 —— 在画布上绘制以 (0,0) 为原点的 X/Y 轴线，便于定位节点

import { useViewport } from '@xyflow/react';
import type { FC } from 'react';

const CoordinateAxes: FC = () => {
    const { x, y } = useViewport();  // 当前视口的偏移量

    // 原点 (0,0) 在屏幕上的坐标 = 视口偏移量（因为画布原点随视口平移）
    const originX = x;
    const originY = y;

    const axisColor = 'rgba(128,128,128,0.15)';
    const dotColor = 'rgba(128,128,128,0.25)';

    return (
        <svg
            style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none',   // 不阻挡画布交互
                zIndex: -1,              // 确保在节点和边之下
            }}
        >
            {/* X 轴（水平虚线） */}
            <line
                x1={0} y1={originY}
                x2="100%" y2={originY}
                stroke={axisColor} strokeWidth={1} strokeDasharray="4 4"
            />
            {/* Y 轴（垂直虚线） */}
            <line
                x1={originX} y1={0}
                x2={originX} y2="100%"
                stroke={axisColor} strokeWidth={1} strokeDasharray="4 4"
            />
            {/* 原点标记（小圆点） */}
            <circle cx={originX} cy={originY} r={3} fill={dotColor} stroke="none" />
        </svg>
    );
};

export default CoordinateAxes;