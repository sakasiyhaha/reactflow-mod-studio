import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const NumberInput = memo(({ data }) => (
  <div className="custom-node node-input">
    <strong className="node-title">
      🔢 {data.label ?? '数值输入'}
    </strong>
    <div className="node-value">{data.value ?? 0}</div>
    <Handle
      type="source"
      position={Position.Right}
      id="output"
    />
  </div>
));

export default NumberInput;