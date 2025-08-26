import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Table, 
  Checkbox, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Tag,
  InputNumber,
  Tooltip,
  Alert,
  message,
  Progress
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  ExclamationCircleOutlined,
  BarcodeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { RivhitItem, RivhitConverter, PackingItem } from '@packing/shared';
import type { ColumnsType } from 'antd/es/table';
import { PrintActions } from './PrintActions';
import { ConnectionPoint } from './ConnectionPoint';
import { ConnectionCanvas, Connection } from './ConnectionCanvas';

const { Text } = Typography;
const { TextArea } = Input;

// PackingItem теперь импортируется из shared

interface ItemSelectorProps {
  items: RivhitItem[];
  onItemsChange: (items: PackingItem[]) => void;
  readOnly?: boolean;
  showSummary?: boolean;
  orderId?: string;
  customerName?: string;
  showPrintActions?: boolean;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({
  items,
  onItemsChange,
  readOnly = false,
  showSummary = true,
  orderId,
  customerName,
  showPrintActions = false
}) => {
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionStart, setActiveConnectionStart] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [connectionPoints, setConnectionPoints] = useState<Map<string, { x: number; y: number }>>(new Map());
  
  const tableRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Debug log to confirm our changes are loaded
  console.log('🔧 ItemSelector loaded with connection system!');

  useEffect(() => {
    // Используем RivhitConverter для конвертации в PackingItem
    const initialItems: PackingItem[] = RivhitConverter.toPackingItems(items);
    setPackingItems(initialItems);
  }, [items]);

  useEffect(() => {
    onItemsChange(packingItems);
  }, [packingItems, onItemsChange]);

  // Update connection positions on resize or scroll
  useEffect(() => {
    const updateAllPositions = () => {
      // Update positions for all items
      packingItems.forEach((item) => {
        const element = document.querySelector(`[data-row-key="${item.line_id}"]`);
        if (element) {
          const connectionCell = element.querySelector('[data-connection-cell]');
          if (connectionCell) {
            updateConnectionPointPosition(item.line_id, connectionCell as HTMLElement);
          }
        }
      });
      
      // Update existing connections with new positions
      setConnections(prev => prev.map(conn => {
        const fromPos = connectionPoints.get(conn.from);
        const toPos = connectionPoints.get(conn.to);
        if (fromPos && toPos) {
          return { ...conn, fromPosition: fromPos, toPosition: toPos };
        }
        return conn;
      }));
    };

    // Delay to ensure DOM is rendered
    const timer = setTimeout(updateAllPositions, 100);
    
    // Add resize listener
    window.addEventListener('resize', updateAllPositions);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateAllPositions);
    };
  }, [packingItems, connectionPoints]);

  const handleAvailabilityToggle = (lineId: string, isAvailable: boolean) => {
    setPackingItems(prev => prev.map(item => 
      item.line_id === lineId 
        ? { 
            ...item, 
            isAvailable,
            isPacked: isAvailable ? item.isPacked : false,
            packedQuantity: isAvailable ? item.packedQuantity : 0,
            reason: !isAvailable ? item.reason : undefined
          }
        : item
    ));
  };

  const handlePackedToggle = (lineId: string, isPacked: boolean) => {
    setPackingItems(prev => prev.map(item => {
      if (item.line_id !== lineId) return item;
      
      if (!isPacked || !item.isAvailable) {
        return {
          ...item,
          isPacked: false,
          packedQuantity: 0,
          selectedBoxes: 0
        };
      }

      // If item has box capacity, select 1 box, otherwise select full quantity
      if (item.boxCapacity) {
        const maxBoxes = Math.floor(item.quantity / item.boxCapacity);
        const selectedBoxes = Math.min(1, maxBoxes);
        return {
          ...item,
          isPacked: true,
          selectedBoxes,
          packedQuantity: selectedBoxes * item.boxCapacity
        };
      } else {
        return {
          ...item,
          isPacked: true,
          packedQuantity: item.quantity,
          selectedBoxes: 0
        };
      }
    }));
  };

  const handleQuantityChange = (lineId: string, quantity: number) => {
    setPackingItems(prev => prev.map(item => 
      item.line_id === lineId 
        ? { 
            ...item, 
            packedQuantity: Math.min(Math.max(0, quantity), item.quantity),
            isPacked: quantity > 0
          }
        : item
    ));
  };

  const handleBoxChange = (lineId: string, newBoxCount: number, direction?: 'up' | 'down') => {
    setPackingItems(prev => {
      const itemIndex = prev.findIndex(item => item.line_id === lineId);
      const currentItem = prev[itemIndex];
      
      if (!currentItem || !currentItem.boxCapacity) return prev;
      
      const oldBoxCount = currentItem.selectedBoxes || 0;
      const boxCount = Math.max(0, newBoxCount);
      
      // Calculate starting box number for current item
      let startingBoxNumber = 1;
      for (let i = 0; i < itemIndex; i++) {
        if (prev[i].boxCapacity && prev[i].selectedBoxes) {
          startingBoxNumber += prev[i].selectedBoxes || 0;
        }
      }
      
      // Calculate items per box for current item
      const itemsPerBox = Math.floor(currentItem.quantity / Math.max(1, boxCount)) || currentItem.boxCapacity;
      const actualPackedQuantity = boxCount * Math.min(itemsPerBox, currentItem.boxCapacity);
      
      // Show notification about redistribution
      const nextItem = prev[itemIndex + 1];
      const boxDiff = boxCount - oldBoxCount;
      
      if (boxDiff !== 0) {
        const directionIcon = direction === 'up' ? '🔼' : direction === 'down' ? '🔽' : boxDiff > 0 ? '📦+' : '📦-';
        message.info(
          `${directionIcon} ${currentItem.item_name}: ${oldBoxCount} → ${boxCount} коробок (Box ${startingBoxNumber}-${startingBoxNumber + boxCount - 1})${
            nextItem ? `, следующий товар начинается с Box ${startingBoxNumber + boxCount}` : ''
          }`, 
          3
        );
      }
      
      return prev.map(item => 
        item.line_id === lineId
          ? { 
              ...item, 
              selectedBoxes: boxCount,
              packedQuantity: actualPackedQuantity,
              isPacked: boxCount > 0
            }
          : item
      );
    });
  };

  const handleNotesChange = (lineId: string, notes: string) => {
    setPackingItems(prev => prev.map(item => 
      item.line_id === lineId 
        ? { ...item, notes }
        : item
    ));
  };

  const handleReasonChange = (lineId: string, reason: string) => {
    setPackingItems(prev => prev.map(item => 
      item.line_id === lineId 
        ? { ...item, reason }
        : item
    ));
  };

  const handleSelectAll = (selected: boolean) => {
    if (readOnly) return;
    
    setPackingItems(prev => prev.map(item => {
      if (!selected || !item.isAvailable) {
        return {
          ...item,
          isPacked: false,
          packedQuantity: 0,
          selectedBoxes: 0
        };
      }

      // If item has box capacity, select 1 box, otherwise select full quantity
      if (item.boxCapacity) {
        const maxBoxes = Math.floor(item.quantity / item.boxCapacity);
        const selectedBoxes = Math.min(1, maxBoxes);
        return {
          ...item,
          isPacked: true,
          selectedBoxes,
          packedQuantity: selectedBoxes * item.boxCapacity
        };
      } else {
        return {
          ...item,
          isPacked: true,
          packedQuantity: item.quantity,
          selectedBoxes: 0
        };
      }
    }));
  };

  const getItemStatus = (item: PackingItem): 'available' | 'packed' | 'unavailable' | 'partial' => {
    if (!item.isAvailable) return 'unavailable';
    if (item.packedQuantity === 0) return 'available';
    if (item.packedQuantity === item.quantity) return 'packed';
    return 'partial';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'packed': return '#52c41a';
      case 'partial': return '#faad14';
      case 'unavailable': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // Connection handling functions
  const handleConnectionStart = (pointId: string) => {
    setActiveConnectionStart(pointId);
    const position = connectionPoints.get(pointId);
    if (position) {
      setDragStartPosition(position);
    }
  };

  const handleConnectionEnd = (targetPointId: string) => {
    if (!activeConnectionStart || !targetPointId || activeConnectionStart === targetPointId) {
      // Cancel connection
      setActiveConnectionStart(null);
      setDragPosition(null);
      setDragStartPosition(null);
      return;
    }

    // Create new connection
    const fromPosition = connectionPoints.get(activeConnectionStart);
    const toPosition = connectionPoints.get(targetPointId);
    
    if (fromPosition && toPosition) {
      const newConnection: Connection = {
        id: `${activeConnectionStart}_to_${targetPointId}`,
        from: activeConnectionStart,
        to: targetPointId,
        fromPosition,
        toPosition,
        color: '#1890ff'
      };
      
      setConnections(prev => [...prev, newConnection]);
      message.success('Connection established');
    }
    
    // Reset drag state
    setActiveConnectionStart(null);
    setDragPosition(null);
    setDragStartPosition(null);
  };

  const handleConnectionDrag = (position: { x: number; y: number }) => {
    setDragPosition(position);
  };

  const removeConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    message.info('Connection removed');
  };

  // Update connection point positions when table renders
  const updateConnectionPointPosition = (lineId: string, element: HTMLElement | null) => {
    if (!element || !canvasContainerRef.current) return;
    
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    const position = {
      x: elementRect.right - containerRect.left + 10,
      y: elementRect.top - containerRect.top + elementRect.height / 2
    };
    
    setConnectionPoints(prev => new Map(prev).set(lineId, position));
  };

  const columns: ColumnsType<PackingItem> = [
    {
      title: (
        <Checkbox
          indeterminate={
            packingItems.some(item => item.isPacked && item.isAvailable) &&
            !packingItems.filter(item => item.isAvailable).every(item => item.isPacked)
          }
          checked={
            packingItems.filter(item => item.isAvailable).length > 0 &&
            packingItems.filter(item => item.isAvailable).every(item => item.isPacked)
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={readOnly}
        />
      ),
      dataIndex: 'isPacked',
      key: 'isPacked',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={record.isPacked}
          disabled={!record.isAvailable || readOnly}
          onChange={(e) => handlePackedToggle(record.line_id, e.target.checked)}
        />
      )
    },
    {
      title: 'סטטוס',
      key: 'status',
      width: 80,
      render: (_, record) => {
        const status = getItemStatus(record);
        const icons = {
          available: <ExclamationCircleOutlined />,
          packed: <CheckOutlined />,
          partial: <InfoCircleOutlined />,
          unavailable: <CloseOutlined />
        };
        const texts = {
          available: 'זמין',
          packed: 'ארוז',
          partial: 'חלקי',
          unavailable: 'לא זמין'
        };
        
        return (
          <Tag 
            icon={icons[status]} 
            color={getStatusColor(status)}
            style={{ minWidth: '70px', textAlign: 'center' }}
          >
            {texts[status]}
          </Tag>
        );
      }
    },
    {
      title: 'קוד פריט',
      dataIndex: 'item_part_num',
      key: 'item_part_num',
      width: 120,
      render: (text, record) => (
        <Space>
          <Text code>{text || `${record.item_id}`}</Text>
          {record.barcode && (
            <Tooltip title={`ברקוד: ${record.barcode}`}>
              <BarcodeOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'שם הפריט',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 250,
      render: (text, record) => (
        <div>
          <Text strong style={{ display: 'block' }}>{text}</Text>
          {record.item_extended_description && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              {record.item_extended_description}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: '11px' }}>
            מחסן: {record.storage_id} | קבוצה: {record.item_group_id}
          </Text>
          {record.location && (
            <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
              מיקום: {record.location}
            </Text>
          )}
        </div>
      )
    },
    {
      title: (
        <Space>
          📦 קרטונים 
          <Text type="secondary" style={{ fontSize: '10px' }}>
            (Box Manager)
          </Text>
        </Space>
      ),
      key: 'boxes',
      width: 180,
      align: 'center',
      render: (_, record) => {
        if (!record.boxCapacity) {
          // Fallback to original quantity display if no box capacity
          return (
            <Text 
              strong 
              type={record.quantity <= 0 ? 'danger' : undefined}
            >
              {record.quantity}
              {record.quantity <= 0 && ' (לא במלאי)'}
            </Text>
          );
        }

        const maxBoxes = Math.floor(record.quantity / record.boxCapacity);
        const selectedBoxes = record.selectedBoxes || 0;

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <Button
                size="small"
                type="text"
                onClick={() => handleBoxChange(record.line_id, Math.max(0, selectedBoxes - 1), 'down')}
                disabled={selectedBoxes <= 0 || !record.isAvailable || readOnly}
                style={{ 
                  minWidth: '32px', 
                  padding: '0 6px',
                  backgroundColor: selectedBoxes <= 0 ? '#f5f5f5' : '#fff2f0',
                  border: selectedBoxes <= 0 ? '1px solid #d9d9d9' : '1px solid #ffccc7',
                  color: selectedBoxes <= 0 ? '#bfbfbf' : '#ff4d4f',
                  fontWeight: 'bold'
                }}
                title="Убрать коробку"
              >
                📦-
              </Button>
              <InputNumber
                min={0}
                max={maxBoxes}
                value={selectedBoxes}
                onChange={(value) => handleBoxChange(record.line_id, value || 0)}
                disabled={!record.isAvailable || readOnly}
                style={{ 
                  width: '60px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
                size="small"
                controls={false}
              />
              <Button
                size="small"
                type="text"
                onClick={() => handleBoxChange(record.line_id, Math.min(maxBoxes, selectedBoxes + 1), 'up')}
                disabled={selectedBoxes >= maxBoxes || !record.isAvailable || readOnly}
                style={{ 
                  minWidth: '32px', 
                  padding: '0 6px',
                  backgroundColor: selectedBoxes >= maxBoxes ? '#f5f5f5' : '#f6ffed',
                  border: selectedBoxes >= maxBoxes ? '1px solid #d9d9d9' : '1px solid #b7eb8f',
                  color: selectedBoxes >= maxBoxes ? '#bfbfbf' : '#52c41a',
                  fontWeight: 'bold'
                }}
                title="Добавить коробку"
              >
                📦+
              </Button>
              <Button
                size="small"
                type="text"
                onClick={() => {
                  const optimalBoxes = Math.ceil(record.quantity / (record.boxCapacity || 1));
                  handleBoxChange(record.line_id, Math.min(optimalBoxes, maxBoxes), 'up');
                }}
                disabled={!record.isAvailable || readOnly}
                style={{ 
                  minWidth: '28px', 
                  padding: '0 4px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #91d5ff',
                  color: '#1890ff',
                  fontWeight: 'bold'
                }}
                title="Автоматический баланс (оптимальное количество коробок)"
              >
                ⚖️
              </Button>
            </Space>
            {/* Visual indicator of box usage */}
            <Progress
              percent={maxBoxes > 0 ? (selectedBoxes / maxBoxes) * 100 : 0}
              size="small"
              status={selectedBoxes === 0 ? 'exception' : selectedBoxes === maxBoxes ? 'success' : 'active'}
              strokeColor={selectedBoxes === maxBoxes ? '#52c41a' : '#1890ff'}
              style={{ width: '100%', margin: '4px 0' }}
              showInfo={false}
            />
            <Text 
              type="secondary" 
              style={{ fontSize: '11px', textAlign: 'center', display: 'block' }}
            >
              {record.boxCapacity} יח'/קרטון
              <br />
              מקס: {maxBoxes} | {selectedBoxes > 0 ? `${Math.floor(record.quantity / selectedBoxes)} יח'/קרטון` : ''}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'כמות ארוזה',
      key: 'packedQuantity',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.boxCapacity && record.selectedBoxes) {
          // Show calculated quantity from boxes
          return (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '14px' }}>
                {record.packedQuantity}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ({record.selectedBoxes} קרטונים)
              </Text>
            </Space>
          );
        }
        
        // Fallback to manual quantity input for items without box capacity
        return (
          <InputNumber
            min={0}
            max={record.quantity}
            value={record.packedQuantity}
            onChange={(value) => handleQuantityChange(record.line_id, value || 0)}
            disabled={!record.isAvailable || readOnly}
            style={{ width: '80px' }}
            size="small"
          />
        );
      }
    },
    {
      title: 'מחיר יחידה',
      dataIndex: 'sale_nis',
      key: 'sale_nis',
      width: 100,
      render: (price: number) => `₪${price.toFixed(2)}`
    },
    {
      title: 'סה"כ',
      key: 'total',
      width: 100,
      render: (_, record) => {
        const total = record.sale_nis * record.packedQuantity;
        return <Text strong>₪{total.toFixed(2)}</Text>;
      }
    },
    {
      title: 'פעולות',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.isAvailable ? (
            <Button
              size="small"
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleAvailabilityToggle(record.line_id, false)}
              disabled={readOnly}
            >
              לא זמין
            </Button>
          ) : (
            <Button
              size="small"
              type="text"
              icon={<CheckOutlined />}
              onClick={() => handleAvailabilityToggle(record.line_id, true)}
              disabled={readOnly}
            >
              זמין
            </Button>
          )}
        </Space>
      )
    },
    {
      title: '',
      key: 'connection',
      width: 40,
      render: (_, record) => (
        <div 
          ref={(el) => updateConnectionPointPosition(record.line_id, el)}
          data-connection-cell="true"
          style={{ position: 'relative', height: '20px' }}
        />
      )
    }
  ];

  // Expandable row for notes and reasons
  const expandedRowRender = (record: PackingItem) => (
    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {!record.isAvailable && (
          <div>
            <Text strong>סיבת אי זמינות:</Text>
            <TextArea
              rows={2}
              placeholder="הזן סיבה לאי זמינות הפריט..."
              value={record.reason}
              onChange={(e) => handleReasonChange(record.line_id, e.target.value)}
              disabled={readOnly}
              style={{ marginTop: '8px' }}
            />
          </div>
        )}
        <div>
          <Text strong>הערות:</Text>
          <TextArea
            rows={2}
            placeholder="הערות נוספות לפריט..."
            value={record.notes}
            onChange={(e) => handleNotesChange(record.line_id, e.target.value)}
            disabled={readOnly}
            style={{ marginTop: '8px' }}
          />
        </div>
      </Space>
    </div>
  );

  const summary = {
    totalItems: packingItems.length,
    availableItems: packingItems.filter(item => item.isAvailable).length,
    packedItems: packingItems.filter(item => item.isPacked && item.isAvailable).length,
    partialItems: packingItems.filter(item => {
      const status = getItemStatus(item);
      return status === 'partial';
    }).length,
    totalValue: packingItems
      .filter(item => item.isAvailable)
      .reduce((sum, item) => sum + (item.sale_nis * item.packedQuantity), 0)
  };

  return (
    <Card 
      title="בחירת פריטים לאריזה"
      extra={showSummary && (
        <Space>
          <Text>סה"כ פריטים: {summary.totalItems}</Text>
          <Text>זמינים: {summary.availableItems}</Text>
          <Text>ארוזים: {summary.packedItems}</Text>
          {summary.partialItems > 0 && (
            <Text type="warning">חלקיים: {summary.partialItems}</Text>
          )}
        </Space>
      )}
    >
      {showSummary && (
        <Alert
          message={`ערך כולל של פריטים ארוזים: ₪${summary.totalValue.toFixed(2)}`}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {showPrintActions && orderId && (
        <div style={{ marginBottom: '16px' }}>
          <PrintActions
            orderId={orderId}
            orderNumber={orderId} // Pass orderId as orderNumber for invoice creation
            items={packingItems}
            customerName={customerName}
            disabled={readOnly}
            onPrintComplete={(jobId, type) => {
              console.log(`Print job ${jobId} completed for ${type}`);
            }}
          />
        </div>
      )}
      
      <div 
        ref={canvasContainerRef}
        style={{ position: 'relative' }}
      >
        {/* Connection Canvas */}
        <ConnectionCanvas
          connections={connections}
          dragPosition={dragPosition}
          dragStartPosition={dragStartPosition}
          width={1200}
          height={600}
        />
        
        {/* Connection Points */}
        {packingItems.map((item, index) => {
          const position = connectionPoints.get(item.line_id);
          if (!position) return null;
          
          return (
            <ConnectionPoint
              key={item.line_id}
              id={item.line_id}
              lineId={item.line_id}
              position={position}
              isActive={connections.some(conn => conn.from === item.line_id || conn.to === item.line_id)}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
              onConnectionDrag={handleConnectionDrag}
              disabled={!item.isAvailable || readOnly}
            />
          );
        })}
        
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={packingItems}
            rowKey="line_id"
            pagination={false}
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowRender,
              rowExpandable: () => !readOnly,
              expandRowByClick: false
            }}
            rowSelection={!readOnly ? {
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          onSelect: (record, selected) => {
            handlePackedToggle(record.line_id, selected);
          },
          onSelectAll: (selected, selectedRows, changeRows) => {
            changeRows.forEach(row => {
              if (row.isAvailable) {
                handlePackedToggle(row.line_id, selected);
              }
            });
          },
          getCheckboxProps: (record) => ({
            disabled: !record.isAvailable
          })
        } : undefined}
        rowClassName={(record) => {
          const status = getItemStatus(record);
          return `item-status-${status}`;
        }}
            style={{ direction: 'rtl' }}
          />
        </div>
      </div>

      <style>{`
        .item-status-unavailable {
          background-color: #fff2f0;
          opacity: 0.7;
        }
        .item-status-packed {
          background-color: #f6ffed;
        }
        .item-status-partial {
          background-color: #fffbe6;
        }
        .ant-table-tbody > tr.item-status-packed:hover > td {
          background-color: #f6ffed !important;
        }
        .ant-table-tbody > tr.item-status-unavailable:hover > td {
          background-color: #fff2f0 !important;
        }
        .ant-table-tbody > tr.item-status-partial:hover > td {
          background-color: #fffbe6 !important;
        }
        
        /* Connection point styles */
        .connection-point {
          position: absolute;
          cursor: crosshair;
          user-select: none;
          -webkit-user-select: none;
        }
        
        .connection-point:hover {
          filter: brightness(1.2);
        }
        
        .connection-point.active {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
          }
        }
        
        #connection-canvas {
          pointer-events: none;
        }
        
        #connection-canvas.interactive {
          pointer-events: auto;
        }
      `}</style>
    </Card>
  );
};