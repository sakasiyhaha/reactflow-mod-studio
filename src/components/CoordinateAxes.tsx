// src/components/CoordinateAxes.tsx
import { useViewport } from '@xyflow/react';
import type { FC } from 'react';

const CoordinateAxes: FC = () => {
    const { x, y } = useViewport();
    const originX = x;
    const originY = y;

    return (
        <svg
            style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none',
                zIndex: -1,
            }}
        >
            <line
                x1={0} y1={originY}
                x2="100%" y2={originY}
                stroke="var(--coordinate-axis-color)"
                strokeWidth={1}
                strokeDasharray="4 4"
            />
            <line
                x1={originX} y1={0}
                x2={originX} y2="100%"
                stroke="var(--coordinate-axis-color)"
                strokeWidth={1}
                strokeDasharray="4 4"
            />
            <circle cx={originX} cy={originY} r={3} fill="var(--coordinate-axis-dot-color)" stroke="none" />
        </svg>
    );
};

export default CoordinateAxes;