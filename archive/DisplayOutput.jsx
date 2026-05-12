import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const DisplayOutput = memo(({ data }) => (
  <div className="custom-node node-output">
    <strong className="node-title">
      📺 {data.label ?? '显示输出'}
    </strong>
    <div className="node-value">{data.value ?? 0}</div>
    <Handle
      type="target"
      position={Position.Left}
      id="input"
    />
  </div>
));

export default DisplayOutput;