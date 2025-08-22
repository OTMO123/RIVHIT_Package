import React, { useState, useRef, useEffect } from 'react';
import { Tooltip } from 'antd';

interface ConnectionPointProps {
  id: string;
  lineId: string;
  position: { x: number; y: number };
  isActive?: boolean;
  onConnectionStart: (pointId: string) => void;
  onConnectionEnd: (pointId: string) => void;
  onConnectionDrag?: (position: { x: number; y: number }) => void;
  disabled?: boolean;
}

export const ConnectionPoint: React.FC<ConnectionPointProps> = ({
  id,
  lineId,
  position,
  isActive = false,
  onConnectionStart,
  onConnectionEnd,
  onConnectionDrag,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pointRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    onConnectionStart(id);
    
    // Add global mouse listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !onConnectionDrag) return;
    
    // Get current mouse position relative to the viewport
    const rect = document.getElementById('connection-canvas')?.getBoundingClientRect();
    if (rect) {
      onConnectionDrag({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Remove global listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Check if we're over another connection point
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const connectionPoint = element?.closest('[data-connection-point]');
    
    if (connectionPoint && connectionPoint !== pointRef.current) {
      const targetId = connectionPoint.getAttribute('data-point-id');
      if (targetId) {
        onConnectionEnd(targetId);
      }
    } else {
      // Cancel connection if not dropped on valid target
      onConnectionEnd('');
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup listeners on unmount
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <Tooltip title={disabled ? 'Connection disabled' : 'Click and drag to connect'}>
      <div
        ref={pointRef}
        data-connection-point="true"
        data-point-id={id}
        data-line-id={lineId}
        className={`connection-point ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isHovered ? 'hovered' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: isActive ? '#1890ff' : '#d9d9d9',
          border: `2px solid ${isActive ? '#0050b3' : '#8c8c8c'}`,
          cursor: disabled ? 'not-allowed' : 'crosshair',
          transition: 'all 0.2s ease',
          transform: isHovered || isDragging ? 'scale(1.2)' : 'scale(1)',
          boxShadow: isHovered || isDragging ? '0 0 8px rgba(24, 144, 255, 0.5)' : 'none',
          zIndex: isDragging ? 1000 : 10,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Inner glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isActive ? '#40a9ff' : '#fff',
            opacity: isHovered || isDragging ? 1 : 0.6,
          }}
        />
      </div>
    </Tooltip>
  );
};