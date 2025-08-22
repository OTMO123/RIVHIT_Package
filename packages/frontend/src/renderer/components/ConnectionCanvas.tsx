import React, { useEffect, useRef, useState } from 'react';

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  color?: string;
  label?: string;
}

interface ConnectionCanvasProps {
  connections: Connection[];
  dragPosition?: { x: number; y: number } | null;
  dragStartPosition?: { x: number; y: number } | null;
  width: number;
  height: number;
}

export const ConnectionCanvas: React.FC<ConnectionCanvasProps> = ({
  connections,
  dragPosition,
  dragStartPosition,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Draw curved path between two points
  const drawConnection = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string = '#8c8c8c',
    isHovered: boolean = false,
    isDragging: boolean = false
  ) => {
    ctx.save();
    
    // Set style
    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered || isDragging ? 3 : 2;
    ctx.shadowBlur = isHovered || isDragging ? 8 : 4;
    ctx.shadowColor = color;
    
    // Calculate control points for bezier curve
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    // Create a curved path that goes to the right
    const curveOffset = Math.abs(to.y - from.y) * 0.5 + 50;
    const controlPoint1 = { x: from.x + curveOffset, y: from.y };
    const controlPoint2 = { x: to.x + curveOffset, y: to.y };
    
    // Draw the path
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(
      controlPoint1.x, controlPoint1.y,
      controlPoint2.x, controlPoint2.y,
      to.x, to.y
    );
    ctx.stroke();
    
    // Draw connection points
    const drawPoint = (x: number, y: number, filled: boolean = true) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.stroke();
    };
    
    drawPoint(from.x, from.y);
    drawPoint(to.x, to.y);
    
    ctx.restore();
  };

  // Check if a point is near a connection line
  const isPointNearConnection = (
    point: { x: number; y: number },
    connection: Connection,
    threshold: number = 10
  ): boolean => {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Calculate bezier curve point
      const curveOffset = Math.abs(connection.toPosition.y - connection.fromPosition.y) * 0.5 + 50;
      const controlPoint1 = { x: connection.fromPosition.x + curveOffset, y: connection.fromPosition.y };
      const controlPoint2 = { x: connection.toPosition.x + curveOffset, y: connection.toPosition.y };
      
      const x = Math.pow(1 - t, 3) * connection.fromPosition.x +
                3 * Math.pow(1 - t, 2) * t * controlPoint1.x +
                3 * (1 - t) * Math.pow(t, 2) * controlPoint2.x +
                Math.pow(t, 3) * connection.toPosition.x;
                
      const y = Math.pow(1 - t, 3) * connection.fromPosition.y +
                3 * Math.pow(1 - t, 2) * t * controlPoint1.y +
                3 * (1 - t) * Math.pow(t, 2) * controlPoint2.y +
                Math.pow(t, 3) * connection.toPosition.y;
      
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      
      if (distance < threshold) {
        return true;
      }
    }
    
    return false;
  };

  // Handle mouse move for hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let foundConnection: string | null = null;
    
    for (const connection of connections) {
      if (isPointNearConnection({ x, y }, connection)) {
        foundConnection = connection.id;
        break;
      }
    }
    
    if (foundConnection !== hoveredConnection) {
      setHoveredConnection(foundConnection);
    }
  };

  // Redraw canvas when data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw all connections
    connections.forEach(connection => {
      drawConnection(
        ctx,
        connection.fromPosition,
        connection.toPosition,
        connection.color,
        hoveredConnection === connection.id
      );
    });
    
    // Draw dragging connection
    if (dragStartPosition && dragPosition) {
      drawConnection(
        ctx,
        dragStartPosition,
        dragPosition,
        '#8c8c8c',
        false,
        true
      );
    }
  }, [connections, dragPosition, dragStartPosition, hoveredConnection, width, height]);

  return (
    <canvas
      ref={canvasRef}
      id="connection-canvas"
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: dragPosition ? 'none' : 'auto',
        cursor: hoveredConnection ? 'pointer' : 'default',
      }}
    />
  );
};