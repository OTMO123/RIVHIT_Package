import React, { useMemo } from 'react';

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  color?: string;
}

interface SVGConnectionsProps {
  connections: Connection[];
  dragPosition?: { x: number; y: number } | null;
  dragStartPosition?: { x: number; y: number } | null;
  onConnectionClick?: (connectionId: string) => void;
}

export const SVGConnections: React.FC<SVGConnectionsProps> = React.memo(({
  connections,
  dragPosition,
  dragStartPosition,
  onConnectionClick
}) => {
  // Create bezier curve path
  const createPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Always create an arc to the right, even for vertical connections
    const minOffset = 50; // Minimum offset to ensure visible curve
    const offset = Math.max(Math.abs(dx) * 0.5, minOffset);
    
    // Control points for bezier curve - always curve to the right
    const cp1x = from.x + offset;
    const cp1y = from.y;
    const cp2x = to.x + offset;
    const cp2y = to.y;
    
    const path = `M ${from.x},${from.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;
    return path;
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 1000
      }}
    >
      <defs>
        {/* Shadow filter for cables */}
        <filter id="cable-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
      
      {/* Render established connections */}
      {connections.map((connection) => (
          <g key={connection.id}>
            {/* Invisible wider path for easier clicking */}
            <path
              d={createPath(connection.fromPosition, connection.toPosition)}
              stroke="transparent"
              strokeWidth={20}
              fill="none"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onClick={() => onConnectionClick?.(connection.id)}
            />
            {/* Visible cable */}
            <path
              d={createPath(connection.fromPosition, connection.toPosition)}
              stroke={connection.color || '#8c8c8c'}
              strokeWidth={4}
              fill="none"
              filter="url(#cable-shadow)"
              style={{ pointerEvents: 'none' }}
            />
          </g>
      ))}
      
      {/* Render dragging connection */}
      {dragStartPosition && dragPosition && (
        <g>
          {/* Shadow for depth */}
          <path
            d={createPath(dragStartPosition, dragPosition)}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={5}
            fill="none"
            style={{ pointerEvents: 'none' }}
          />
          {/* Main cable */}
          <path
            d={createPath(dragStartPosition, dragPosition)}
            stroke="#1890ff"
            strokeWidth={4}
            fill="none"
            filter="url(#cable-shadow)"
            style={{ pointerEvents: 'none' }}
            className="dragging-cable"
          />
        </g>
      )}
      
      <style>{`
        .dragging-cable {
          transition: none;
        }
      `}</style>
    </svg>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    JSON.stringify(prevProps.connections) === JSON.stringify(nextProps.connections) &&
    JSON.stringify(prevProps.dragPosition) === JSON.stringify(nextProps.dragPosition) &&
    JSON.stringify(prevProps.dragStartPosition) === JSON.stringify(nextProps.dragStartPosition)
  );
});