import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Table, 
  Input, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Row, 
  Col,
  DatePicker,
  Badge,
  Spin,
  Alert,
  message,
  Modal,
  Descriptions,
  Divider,
  InputNumber,
  Form
} from 'antd';

const { Text } = Typography;
import dayjs, { Dayjs } from 'dayjs';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ReloadOutlined,
  EyeOutlined,
  ContainerOutlined,
  PlusOutlined,
  MinusOutlined,
  SettingOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useI18n } from '../i18n/i18n';
import { apiService, Order } from '../services/api.service';
import { SVGConnections, Connection } from '../components/SVGConnections';
import { SettingsModal } from '../components/SettingsModal';
import { RegionSelector } from '../components/RegionSelector';
import { LabelPreview } from '../components/LabelPreview';
import { InvoiceModal } from '../components/InvoiceModal';
import { PackingWorkflowModal } from '../components/PackingWorkflowModal';
import { SimpleProgressSteps, SimpleStep } from '../components/SimpleProgressSteps';
import { DeliveryRegion, PackingBox } from '@packing/shared';
import { orderStatusService, OrderStatus } from '../services/order-status.service';

const { Title } = Typography;
const { Option } = Select;

export const OrdersPage: React.FC = () => {
  const { t, locale } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [packingModalVisible, setPackingModalVisible] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [packingData, setPackingData] = useState<{[key: string]: {quantity: number, boxNumber: number}}>({});
  
  // Connection system state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionStart, setActiveConnectionStart] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [connectionPoints, setConnectionPoints] = useState<Map<string, { x: number; y: number }>>(new Map());
  
  const packingTableRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const draftBoxesSaveTimeoutRef = useRef<number | null>(null);
  
  // Update connection positions after connections are restored
  React.useEffect(() => {
    if (connections.length > 0 && packingModalVisible) {
      // Update connection positions after DOM updates
      const updatePositions = () => {
        const points = new Map<string, { x: number; y: number }>();
        connections.forEach(conn => {
          const fromButton = document.querySelector(`[data-connection-id="${conn.from}"]`);
          const toButton = document.querySelector(`[data-connection-id="${conn.to}"]`);
          
          if (fromButton && toButton) {
            const fromRect = fromButton.getBoundingClientRect();
            const toRect = toButton.getBoundingClientRect();
            const containerRect = canvasContainerRef.current?.getBoundingClientRect();
            
            if (containerRect) {
              points.set(conn.from, {
                x: fromRect.left + fromRect.width / 2 - containerRect.left,
                y: fromRect.top + fromRect.height / 2 - containerRect.top
              });
              points.set(conn.to, {
                x: toRect.left + toRect.width / 2 - containerRect.left,
                y: toRect.top + toRect.height / 2 - containerRect.top
              });
            }
          }
        });
        
        if (points.size > 0) {
          setConnectionPoints(points);
          console.log('🔄 Updated connection positions');
        }
      };
      
      // Update positions multiple times to ensure correct rendering
      setTimeout(updatePositions, 100);
      setTimeout(updatePositions, 300);
      setTimeout(updatePositions, 600);
    }
  }, [connections, packingModalVisible]);
  
  // Monitor packingData changes to verify box numbers update in UI
  React.useEffect(() => {
    if (packingModalVisible && Object.keys(packingData).length > 0) {
      console.log('🔄 PackingData updated in UI, box numbers are:', 
        Object.entries(packingData).map(([key, data]: [string, any]) => ({
          item: key.split('_').pop(),
          box: data.boxNumber,
          qty: data.quantity
        }))
      );
    }
  }, [packingData, packingModalVisible]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all orders for client-side pagination
  
  // Single date state - default to today
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // New workflow states
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<DeliveryRegion | null>(null);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [packingBoxes, setPackingBoxes] = useState<PackingBox[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus | null>(null);


  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  const loadOrders = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check API health first
      const healthy = await apiService.checkHealth();
      setApiHealthy(healthy);
      
      if (!healthy) {
        message.warning(locale === 'he' ? 'השרת לא זמין, מציג נתונים מקומיים' : 'Сервер недоступен, показываю локальные данные');
      }
      
      // Use date range for filtering (don't filter by status on server - do it on client)
      const filters = {
        documentType: 7, // Orders only (RIVHIT type 7 = "הזמנה")
        fromDate: selectedDate.format('YYYY-MM-DD'),
        toDate: selectedDate.format('YYYY-MM-DD'),
        ...(searchText && { searchText }),
        page: 1,
        pageSize: 200 // Always fetch all orders for the day
      };
      
      console.log(`🔄 Loading all orders for ${selectedDate.format('DD/MM/YYYY')}...`);
      const result = await apiService.getOrdersPaginated(filters);
      
      // Load status from database for each order
      const ordersWithStatus = await Promise.all(
        result.data.map(async (order) => {
          const dbStatus = await orderStatusService.getOrderStatus(order.id);
          if (dbStatus && dbStatus.status) {
            // Use status from database if exists
            return { ...order, status: normalizeStatus(dbStatus.status) };
          }
          return { ...order, status: 'pending' as Order['status'] }; // Default status
        })
      );
      
      // Apply client-side filtering by status
      let filteredOrders = ordersWithStatus;
      if (statusFilter !== 'all') {
        filteredOrders = ordersWithStatus.filter(order => 
          (order.status || 'pending') === statusFilter
        );
      }
      
      // Apply text search filtering if any
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredOrders = filteredOrders.filter(order => 
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.id?.toString().includes(searchLower) ||
          order.totalAmount?.toString().includes(searchLower)
        );
      }
      
      // Store all filtered orders
      setAllOrders(filteredOrders);
      setTotalOrders(filteredOrders.length);
      
      // Do client-side pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
      
      setOrders(paginatedOrders);
      setCurrentPage(page);
      
      console.log(`✅ Loaded ${result.data.length} total orders, showing ${paginatedOrders.length} on page ${page}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      message.error(locale === 'he' ? 'שגיאה בטעינת הזמנות' : 'Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  };

  const getStatusNumber = (status: string): number => {
    const statusMap: Record<string, number> = {
      pending: 0,
      packing: 1,
      packed_pending_labels: 2,
      labels_printed: 3,
      completed: 4,
      shipped: 5
    };
    return statusMap[status] || 0;
  };

  // Helper function to ensure status is a valid Order status type
  const normalizeStatus = (status: string): Order['status'] => {
    const validStatuses: Order['status'][] = [
      'pending', 'processing', 'packed', 'shipped', 'packing', 
      'completed', 'packed_pending_labels', 'labels_printed'
    ];
    return validStatuses.includes(status as Order['status']) 
      ? (status as Order['status']) 
      : 'pending';
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      packing: 'processing',
      packed_pending_labels: 'warning',
      labels_printed: 'cyan',
      completed: 'success',
      shipped: 'green'
    };
    return colorMap[status] || 'default';
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const success = await apiService.updateOrderStatus(orderId, newStatus);
      if (success) {
        message.success(locale === 'he' ? 'סטטוס עודכן בהצלחה' : 'Статус обновлен успешно');
        loadOrders(); // Reload orders
      } else {
        message.error(locale === 'he' ? 'שגיאה בעדכון סטטוס' : 'Ошибка обновления статуса');
      }
    } catch (error) {
      message.error(locale === 'he' ? 'שגיאה בעדכון סטטוס' : 'Ошибка обновления статуса');
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
    setDetailsLoading(true);
    
    try {
      // Fetch detailed order information
      const orderData = await apiService.getOrder(order.id);
      if (orderData) {
        setOrderDetails(orderData);
      } else {
        // Use basic order data if detailed fetch fails
        setOrderDetails(order);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      setOrderDetails(order); // Fallback to basic order data
      message.warning(
        locale === 'he' 
          ? 'לא ניתן לטעון פרטים מלאים, מציג מידע בסיסי' 
          : 'Не удалось загрузить полные детали, показываю базовую информацию'
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // Helper function to split items based on max capacity
  const splitItemsByMaxCapacity = async (items: any[]): Promise<any[]> => {
    console.group('🔄 Starting item splitting process');
    console.log(`📋 Processing ${items.length} items for potential splitting`);
    
    const splitItems: any[] = [];
    let totalSplits = 0;
    
    // Batch load all max capacities at once to avoid multiple HTTP requests
    console.log('🔍 Loading all max capacities in batch...');
    const maxCapacityMap = new Map<string, number>();
    const catalogNumbers = items
      .map(item => item.catalog_number)
      .filter(Boolean);
    
    // Load max capacities in parallel
    const maxCapacityPromises = catalogNumbers.map(async (catalogNumber) => {
      try {
        const capacity = await apiService.getMaxPerBoxByCatalog(catalogNumber);
        if (capacity) {
          maxCapacityMap.set(catalogNumber, capacity);
        }
      } catch (error) {
        console.warn(`Failed to load max capacity for ${catalogNumber}:`, error);
      }
    });
    
    await Promise.all(maxCapacityPromises);
    console.log(`✅ Loaded max capacities for ${maxCapacityMap.size} items`);
    
    for (const item of items) {
      console.group(`📦 Processing item: ${item.catalog_number || item.description || 'Unknown'}`);
      console.log('Item details:', {
        catalog_number: item.catalog_number,
        description: item.description,
        quantity: item.quantity,
        line_id: item.line_id,
        unique_id: item.unique_id
      });
      
      // Get max capacity from pre-loaded map
      const maxCapacity = item.catalog_number ? maxCapacityMap.get(item.catalog_number) : undefined;
      
      // Add max_per_box to the item for use in the UI
      item.max_per_box = maxCapacity;
      
      if (maxCapacity) {
        console.log(`✅ Max capacity found: ${maxCapacity} units per box`);
        
        if (item.quantity > maxCapacity) {
          // Calculate how many full boxes and remainder
          const fullBoxes = Math.floor(item.quantity / maxCapacity);
          const remainder = item.quantity % maxCapacity;
          const totalBoxes = fullBoxes + (remainder > 0 ? 1 : 0);
          
          console.log(`📊 Splitting calculation:`, {
            ordered_quantity: item.quantity,
            max_per_box: maxCapacity,
            full_boxes: fullBoxes,
            remainder: remainder,
            total_boxes: totalBoxes
          });
          
          // Create rows for full boxes
          for (let i = 0; i < fullBoxes; i++) {
            const splitItem = {
              ...item,
              item_id: item.item_id || item.catalog_number || `${item.line_id}_item`, // Ensure item_id exists
              quantity: maxCapacity,
              original_quantity: item.quantity,
              max_per_box: maxCapacity,
              split_index: i + 1,
              split_total: totalBoxes,
              unique_id: `${item.unique_id || item.line_id}_split_${i + 1}`,
              line_id: `${item.line_id}_split_${i + 1}`,
              is_split: true,
              box_label: `${locale === 'he' ? 'קופסה' : 'Коробка'} ${i + 1}/${totalBoxes}`
            };
            splitItems.push(splitItem);
            console.log(`➕ Created full box ${i + 1}/${totalBoxes} with ${maxCapacity} units`);
          }
          
          // Create row for remainder if exists
          if (remainder > 0) {
            const remainderItem = {
              ...item,
              item_id: item.item_id || item.catalog_number || `${item.line_id}_item`, // Ensure item_id exists
              quantity: remainder,
              original_quantity: item.quantity,
              max_per_box: maxCapacity,
              split_index: fullBoxes + 1,
              split_total: totalBoxes,
              unique_id: `${item.unique_id || item.line_id}_split_${fullBoxes + 1}`,
              line_id: `${item.line_id}_split_${fullBoxes + 1}`,
              is_split: true,
              box_label: `${locale === 'he' ? 'קופסה' : 'Коробка'} ${fullBoxes + 1}/${totalBoxes} (${locale === 'he' ? 'חלקי' : 'Частичная'})`
            };
            splitItems.push(remainderItem);
            console.log(`➕ Created partial box ${totalBoxes}/${totalBoxes} with ${remainder} units`);
          }
          
          totalSplits++;
          console.log(`✂️ Item split complete: ${item.quantity} units → ${totalBoxes} boxes`);
        } else {
          console.log(`✅ Item fits in one box (${item.quantity} ≤ ${maxCapacity})`);
          splitItems.push({
            ...item,
            is_split: false,
            original_quantity: item.quantity
          });
        }
      } else {
        console.log(`⚠️ No max capacity defined for catalog: ${item.catalog_number || 'N/A'}`);
        console.log('ℹ️ Item will be packed as single unit');
        
        // Item fits in one box or no max capacity defined
        splitItems.push({
          ...item,
          is_split: false,
          original_quantity: item.quantity
        });
      }
      
      console.groupEnd();
    }
    
    console.log(`📈 Splitting summary:`, {
      original_items: items.length,
      resulting_rows: splitItems.length,
      items_split: totalSplits,
      items_not_split: items.length - totalSplits
    });
    
    console.groupEnd();
    return splitItems;
  };

  // Function to restore connections and box numbers from draft boxes
  const restoreConnectionsFromDraftBoxes = (draftBoxes: any[], currentPackingData: any): { connections: Connection[], packingData: any } => {
    const restoredConnections: Connection[] = [];
    const updatedPackingData = { ...currentPackingData };
    
    console.log('🔍 Restoring from draft boxes. Initial packingData:', currentPackingData);
    console.log('📦 Draft boxes to restore:', draftBoxes);
    console.log('🔑 Current packingData keys:', Object.keys(currentPackingData));
    
    // Process each box and restore both connections and box numbers
    draftBoxes.forEach(box => {
      // Parse items from JSON if needed
      let items = box.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          console.error('Failed to parse items:', e);
          return;
        }
      }
      
      const boxNumber = box.boxNumber;
      console.log(`📦 Processing box ${boxNumber} with ${items?.length || 0} items`);
      
      if (!Array.isArray(items)) {
        console.warn(`Box ${boxNumber} has no items array`);
        return;
      }
      
      // Update packingData with correct box numbers AND quantities from draft
      items.forEach(item => {
        const itemKey = item.itemId; // This is the key saved in draft boxes
        console.log(`  - Looking for item key: ${itemKey} in packingData`);
        
        if (itemKey && updatedPackingData[itemKey]) {
          console.log(`  ✅ Found item ${itemKey}: updating box number from ${updatedPackingData[itemKey].boxNumber} to ${boxNumber}, quantity: ${item.quantity}`);
          updatedPackingData[itemKey] = {
            ...updatedPackingData[itemKey],
            boxNumber: boxNumber,
            quantity: item.quantity // Restore the saved quantity
          };
        } else {
          console.warn(`  ⚠️ Item ${itemKey} not found in packingData. Available keys:`, Object.keys(updatedPackingData).slice(0, 5));
        }
      });
      
      // If box has multiple items, create connections between them
      if (items.length > 1) {
        // Create chain of connections between items in the box
        for (let i = 0; i < items.length - 1; i++) {
          const fromId = items[i].itemId;
          const toId = items[i + 1].itemId;
          
          // Skip if connection already exists
          const exists = restoredConnections.some(conn =>
            (conn.from === fromId && conn.to === toId) ||
            (conn.from === toId && conn.to === fromId)
          );
          
          if (!exists && fromId && toId) {
            console.log(`  - Creating connection: ${fromId} -> ${toId}`);
            restoredConnections.push({
              id: `${fromId}_to_${toId}`,
              from: fromId,
              to: toId,
              fromPosition: { x: 0, y: 0 }, // Will be updated after render
              toPosition: { x: 0, y: 0 },   // Will be updated after render
              color: '#1890ff'
            });
          }
        }
      }
    });
    
    console.log('✅ Restoration complete. Updated packingData:', updatedPackingData);
    console.log('🔗 Restored connections:', restoredConnections);
    console.log('📊 Final box assignments:', Object.entries(updatedPackingData).map(([key, data]: [string, any]) => ({ key, boxNumber: data.boxNumber })));
    
    return { 
      connections: restoredConnections,
      packingData: updatedPackingData
    };
  };

  // Function to save draft boxes based on connections and packing data
  const saveDraftBoxesFromConnectionsInternal = async (currentConnections: Connection[], currentPackingData?: any) => {
    if (!selectedOrder) return;
    
    // Use provided packingData or fallback to state
    const dataToUse = currentPackingData || packingData;
    
    // Create boxes from connections and packing data
    const boxes: any[] = [];
    const itemGroups: string[][] = [];
    const processedItems = new Set<string>();
    
    // Helper to find connected items
    const findConnectedItems = (itemId: string, group: string[]) => {
      if (processedItems.has(itemId)) return;
      processedItems.add(itemId);
      group.push(itemId);
      
      currentConnections.forEach(conn => {
        if (conn.from === itemId) findConnectedItems(conn.to, group);
        else if (conn.to === itemId) findConnectedItems(conn.from, group);
      });
    };
    
    // Group connected items
    orderItems.forEach(item => {
      const itemKey = item.unique_id || item.line_id || `${selectedOrder.id}_L${item.line || item.item_id}`;
      if (!processedItems.has(itemKey)) {
        const group: string[] = [];
        findConnectedItems(itemKey, group);
        if (group.length > 0) itemGroups.push(group);
      }
    });
    
    // Create boxes from groups of connected items
    let nextBoxNumber = 1;
    itemGroups.forEach(group => {
      const boxNumber = nextBoxNumber++;
      const items = group.map(itemKey => {
        const item = orderItems.find(i => {
          const key = i.unique_id || i.line_id || `${selectedOrder.id}_L${i.line || i.item_id}`;
          return key === itemKey;
        });
        const packData = dataToUse[itemKey] || { quantity: 0, boxNumber };
        
        return {
          itemId: itemKey,
          catalogNumber: item?.item_part_num || item?.catalog_number || '',
          name: item?.item_name || item?.description || '',
          quantity: packData.quantity
        };
      });
      
      boxes.push({
        boxNumber,
        items,
        totalWeight: items.reduce((sum, item) => sum + (item.quantity * 0.1), 0) // Estimated weight
      });
    });
    
    // IMPORTANT: Also add items that are NOT connected to any group
    // Each unconnected item gets its own box from packingData
    orderItems.forEach(item => {
      const itemKey = item.unique_id || item.line_id || `${selectedOrder.id}_L${item.line || item.item_id}`;
      if (!processedItems.has(itemKey)) {
        // This item is not part of any connection group
        const packData = dataToUse[itemKey];
        if (packData) {
          boxes.push({
            boxNumber: packData.boxNumber || nextBoxNumber++,
            items: [{
              itemId: itemKey,
              catalogNumber: item.item_part_num || item.catalog_number || '',
              name: item.item_name || item.description || '',
              quantity: packData.quantity
            }],
            totalWeight: packData.quantity * 0.1 // Estimated weight
          });
        }
      }
    });
    
    // Sort boxes by box number
    boxes.sort((a, b) => a.boxNumber - b.boxNumber);
    
    // Save draft boxes
    console.log('💾 Saving draft boxes:', boxes);
    // Log each box's items to verify quantities being saved
    boxes.forEach(box => {
      console.log(`  📦 Box ${box.boxNumber}:`, box.items.map(item => ({
        id: item.itemId,
        qty: item.quantity
      })));
    });
    await orderStatusService.saveDraftBoxes(selectedOrder.id, boxes);
  };

  // Debounced version to prevent multiple rapid calls
  const saveDraftBoxesFromConnections = (currentConnections: Connection[], currentPackingData?: any) => {
    if (draftBoxesSaveTimeoutRef.current) {
      clearTimeout(draftBoxesSaveTimeoutRef.current);
    }
    
    draftBoxesSaveTimeoutRef.current = window.setTimeout(async () => {
      await saveDraftBoxesFromConnectionsInternal(currentConnections, currentPackingData);
    }, 500); // 500ms delay to batch rapid updates
  };

  const handlePackOrder = async (order: Order, isRetry: boolean = false) => {
    console.group(`🎯 Opening packing modal for order ${order.orderNumber}${isRetry ? ' (RETRY)' : ''}`);
    console.log('Order details:', order);
    
    // Update order status to 'packing' when packing starts
    if (!order.status || order.status === 'pending') {
      await orderStatusService.updateGeneralStatus(
        order.id,
        order.orderNumber,
        'packing'
      );
      // Update local order object
      order.status = 'packing';
      // Update in all orders list too
      setAllOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'packing' } : o
      ));
    }
    
    // Fetch order status from database
    const orderStatus = await orderStatusService.getOrderStatus(order.id);
    console.log('Order status from DB:', orderStatus);
    setCurrentOrderStatus(orderStatus);
    
    // Load draft data if exists
    const draftPackingData = await orderStatusService.getDraftPackingData(order.id);
    const draftBoxes = await orderStatusService.getDraftBoxes(order.id);
    console.log('Draft packing data:', draftPackingData);
    console.log('Draft boxes:', draftBoxes);
    console.log(`📊 Draft data summary: ${Object.keys(draftPackingData || {}).length} packing items, ${draftBoxes?.length || 0} boxes`);
    
    if (order.status === 'packed' || order.status === 'shipped') {
      console.warn(`⚠️ Order ${order.orderNumber} is already packed or shipped`);
      message.warning(
        locale === 'he' 
          ? 'ההזמנה כבר ארוזה או נשלחה' 
          : 'Заказ уже упакован или отправлен'
      );
      console.groupEnd();
      return;
    }

    // Open packing modal and load order items
    console.log('📂 Opening packing modal...');
    setSelectedOrder(order);
    setPackingModalVisible(true);
    setDetailsLoading(true);
    
    // Set up 4-second timeout for auto-retry
    const timeoutId = setTimeout(() => {
      if (detailsLoading && !isRetry) {
        console.warn('⏱️ Loading timeout (4 seconds) - closing and retrying...');
        message.warning(
          locale === 'he' 
            ? 'טעינה איטית - מנסה שוב...' 
            : 'Медленная загрузка - повторная попытка...'
        );
        
        // Close modal
        setPackingModalVisible(false);
        setOrderItems([]);
        setPackingData({});
        setDetailsLoading(false);
        
        // Retry after a short delay
        setTimeout(() => {
          console.log('🔄 Retrying to open packing modal...');
          handlePackOrder(order, true);
        }, 500);
      }
    }, 4000);
    
    try {
      // Fetch order items from backend
      console.log('🔄 Fetching order items from backend...');
      if (window.electronAPI) {
        const itemsResult = await window.electronAPI.items?.getByOrderId?.(parseInt(order.id));
        console.log('📦 Items fetched:', itemsResult);
        
        // Clear timeout if successful
        clearTimeout(timeoutId);
        
        if (itemsResult && itemsResult.success && itemsResult.data) {
          console.log(`✅ Loaded ${itemsResult.data.length} items for order ${order.orderNumber}`);
          
          // Split items based on max capacity
          console.log('🔀 Starting item splitting process...');
          const splitItems = await splitItemsByMaxCapacity(itemsResult.data);
          
          // Initialize packing data with ordered quantities and box numbers
          const initialPackingData: {[key: string]: {quantity: number, boxNumber: number}} = {};
          let currentBoxNumber = 1;
          const boxNumberMap = new Map<string, number>();
          
          const processedItems = splitItems.map((item: any, index: number) => {
            // Ensure line_id has order prefix for consistency
            if (item.line_id && !item.is_split) {
              const lineIdStr = String(item.line_id);
              if (!lineIdStr.includes('_')) {
                item.line_id = `${order.id}_${lineIdStr}`;
              }
            }
            
            // Use unique_id or line_id if available, otherwise create a unique key
            const itemKey = item.unique_id || item.line_id || `${order.id}_L${item.line || item.item_id}`;
            
            // Each item (including each split) gets its own box number
            // This ensures split items go to different boxes
            let assignedBoxNumber = currentBoxNumber;
            currentBoxNumber++;
            
            initialPackingData[itemKey] = {
              quantity: item.quantity || 0,
              boxNumber: assignedBoxNumber
            };
            
            console.log(`📦 Item ${itemKey}: quantity=${item.quantity}, boxNumber=${assignedBoxNumber}, is_split=${item.is_split}, catalog=${item.catalog_number}`);
            
            return item;
          });
          console.log(`📊 Final processed items: ${processedItems.length} rows`);
          setOrderItems(processedItems);
          
          // Set initial packing data first
          let basePackingData = initialPackingData;
          
          // Clear any existing connections when opening new order
          console.log('🔗 Clearing existing connections...');
          setConnections([]);
          setConnectionPoints(new Map());
          
          // Restore connections and box numbers from draft boxes if they exist
          if (draftBoxes.length > 0) {
            console.log('📦 Restoring from draft boxes (prioritizing over draft packing data):', draftBoxes);
            
            // When we have draft boxes, they contain the most recent state including quantities
            // So we use initialPackingData as base and let draft boxes override everything
            const { connections: restoredConnections, packingData: restoredPackingData } = restoreConnectionsFromDraftBoxes(draftBoxes, initialPackingData);
            console.log('🔗 Restored connections:', restoredConnections);
            console.log('📦 Restored packing data with box numbers:', restoredPackingData);
            
            // Update both connections and packing data from draft boxes
            setConnections(restoredConnections);
            // Force React to recognize the state change by creating a new object
            setPackingData({ ...restoredPackingData });
            
            // Also update after a small delay to ensure React processes the update
            setTimeout(() => {
              setPackingData(prev => ({ ...restoredPackingData }));
              console.log('📊 Re-applied packingData after delay:', restoredPackingData);
              
              // Log each item's box number for verification
              Object.entries(restoredPackingData).forEach(([itemKey, data]: [string, any]) => {
                console.log(`  📦 Item ${itemKey}: Box ${data.boxNumber}, Qty: ${data.quantity}`);
              });
              
              // Force update connection positions after table renders
              setTimeout(() => {
                if (canvasContainerRef.current && restoredConnections.length > 0) {
                  const containerRect = canvasContainerRef.current.getBoundingClientRect();
                  
                  // Find all connection points and update their positions
                  const connectionElements = document.querySelectorAll('[data-connection-point="true"]');
                  const newConnectionPoints = new Map<string, { x: number; y: number }>();
                  
                  connectionElements.forEach((element) => {
                    const pointId = element.getAttribute('data-point-id');
                    if (pointId) {
                      const rect = element.getBoundingClientRect();
                      // Check if element is visible
                      if (rect.width > 0 && rect.height > 0) {
                        // Position relative to container viewport (no scroll offset needed)
                        const position = {
                          x: rect.left - containerRect.left + rect.width / 2,
                          y: rect.top - containerRect.top + rect.height / 2
                        };
                        newConnectionPoints.set(pointId, position);
                      }
                    }
                  });
                  
                  // Update connection points state
                  setConnectionPoints(newConnectionPoints);
                  
                  // Update existing connections with new positions
                  const updatedConnections = restoredConnections.map(conn => {
                    const fromPos = newConnectionPoints.get(conn.from);
                    const toPos = newConnectionPoints.get(conn.to);
                    if (fromPos && toPos) {
                      return { ...conn, fromPosition: fromPos, toPosition: toPos };
                    }
                    return conn;
                  });
                  setConnections(updatedConnections);
                }
              }, 400);
            }, 100);
            
            console.log('📦 Box numbers and connections restored from draft boxes');
            console.log('📊 Final packingData state:', restoredPackingData);
          } else {
            // No draft boxes, check if we have draft packing data
            if (Object.keys(draftPackingData).length > 0) {
              console.log('📝 Loading draft packing data (no draft boxes found)');
              basePackingData = { ...initialPackingData, ...draftPackingData };
            }
            
            // Set packing data
            setPackingData(basePackingData);
            
            // Save initial draft boxes when no connections exist yet
            setTimeout(() => {
              saveDraftBoxesFromConnections([]);
              console.log('💾 Triggered initial draft boxes save for unconnected items');
            }, 200);
          }
          
          console.log('✅ Packing modal setup complete!');
        } else {
          console.error('❌ Failed to load order items - no data returned');
          message.error(
            locale === 'he' 
              ? 'לא ניתן לטעון פרטי הזמנה' 
              : 'Не удалось загрузить детали заказа'
          );
        }
      } else {
        console.warn('⚠️ ElectronAPI not available');
      }
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      console.error('❌ Failed to fetch order items:', error);
      message.error(
        locale === 'he' 
          ? 'שגיאה בטעינת פרטי ההזמנה' 
          : 'Ошибка загрузки деталей заказа'
      );
    } finally {
      setDetailsLoading(false);
      console.groupEnd();
    }
  };

  const handlePackingDataChange = (itemKey: string, field: 'quantity' | 'boxNumber', value: number) => {
    setPackingData(prev => {
      const updated = {
        ...prev,
        [itemKey]: {
          ...prev[itemKey],
          [field]: Math.max(field === 'quantity' ? 0 : 1, value) // Box numbers start from 1
        }
      };
      
      // Save draft data with debounce
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
      draftSaveTimeoutRef.current = window.setTimeout(async () => {
        if (selectedOrder) {
          console.log('💾 Saving draft packing data');
          await orderStatusService.saveDraftPackingData(selectedOrder.id, updated);
          // Also save draft boxes when packing data changes - pass updated data!
          saveDraftBoxesFromConnections(connections, updated);
          console.log('💾 Triggered draft boxes save after packing data change');
        }
      }, 1000); // Save after 1 second of inactivity
      
      return updated;
    });
  };

  const handleFinalizePacking = async () => {
    if (!selectedOrder) return;
    
    // Подготавливаем данные о коробках из системы связей
    const boxes = prepareBoxesFromConnections();
    
    if (boxes.length === 0) {
      message.warning(
        locale === 'he' 
          ? 'אין פריטים לאריזה' 
          : 'Нет товаров для упаковки'
      );
      return;
    }
    
    setPackingBoxes(boxes);
    
    // Update order status to 'packed_pending_labels' when packing is completed
    await orderStatusService.updateGeneralStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      'packed_pending_labels'
    );
    
    // Update current order status
    setCurrentOrderStatus(prev => prev ? { ...prev, status: 'packed_pending_labels', isPacked: true } : null);
    
    // Update in all orders list
    setAllOrders(prev => prev.map(o => 
      o.id === selectedOrder.id ? { ...o, status: 'packed_pending_labels' } : o
    ));
    setOrders(prev => prev.map(o => 
      o.id === selectedOrder.id ? { ...o, status: 'packed_pending_labels' } : o
    ));
    
    // Convert boxes to packed items format for the database
    const packedItems = boxes.flatMap(box => 
      box.items.map(item => ({
        itemId: String(item.itemId),
        catalogNumber: item.catalogNumber,
        itemName: item.name || item.nameHebrew || item.nameRussian || '',
        orderedQuantity: item.quantity,
        packedQuantity: item.quantity,
        boxNumber: box.boxNumber
      }))
    );
    
    // Update packing status in database
    await orderStatusService.updatePackingStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      true,
      packedItems,
      'User' // You can replace this with actual user name if available
    );
    
    // Keep draft data for historical reference - don't delete it
    // Draft data should be available even after months
    console.log('✅ Keeping draft data for historical reference');
    
    // Refresh order status
    const updatedStatus = await orderStatusService.getOrderStatus(selectedOrder.id);
    setCurrentOrderStatus(updatedStatus);
    
    // Открываем выбор региона
    setShowRegionSelector(true);
  };

  const prepareBoxesFromConnections = (): PackingBox[] => {
    const boxes: PackingBox[] = [];
    
    console.log('🔍 prepareBoxesFromConnections - packingData:', packingData);
    console.log('🔍 prepareBoxesFromConnections - connections:', connections);
    console.log('🔍 prepareBoxesFromConnections - orderItems count:', orderItems.length);
    
    // Group items by their assigned box numbers from packingData
    const boxGroups: Map<number, any[]> = new Map();
    let skippedItems = 0;
    
    orderItems.forEach(item => {
      // For split items, use unique_id; for regular items use line_id
      const lineId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
      const itemPacking = packingData[lineId];
      
      console.log(`Item ${lineId}: quantity=${itemPacking?.quantity}, boxNumber=${itemPacking?.boxNumber}, is_split=${item.is_split}`);
      
      if (itemPacking) {
        const boxNumber = itemPacking.boxNumber;
        
        // Include item in box even if quantity is 0, to preserve box structure
        if (!boxGroups.has(boxNumber)) {
          boxGroups.set(boxNumber, []);
        }
        
        // Only add to box if quantity > 0
        if (itemPacking.quantity > 0) {
          boxGroups.get(boxNumber)?.push({
            itemId: item.item_id || item.catalog_number || lineId, // Ensure we have a valid itemId
            name: item.description || item.catalog_number || 'Товар',
            nameHebrew: item.description || item.catalog_number || 'מוצר',
            nameRussian: item.description || item.catalog_number || 'Товар',
            quantity: itemPacking.quantity,
            catalogNumber: item.catalog_number,
            barcode: item.barcode || item.catalog_number || '',
            price: item.price || item.sale_nis || 0,
            sale_nis: item.sale_nis || item.price || 0,
            unique_id: lineId, // Keep unique_id for reference
            is_split: item.is_split || false,
            split_index: item.split_index,
            split_total: item.split_total
          });
        } else {
          // Still register the box number even if nothing is packed in it yet
          console.log(`📦 Box ${boxNumber} registered (item ${lineId} with quantity 0)`);
        }
      } else {
        skippedItems++;
        console.log(`⚠️ Skipping item ${lineId} - no packing data`);
      }
    });
    
    console.log(`📊 Grouped ${orderItems.length - skippedItems} items into ${boxGroups.size} box groups, skipped ${skippedItems} items`);
    
    // Check if there are connections that should merge boxes
    const mergedBoxes = new Map<number, number[]>();
    const boxToMergedGroup = new Map<number, number>();
    
    // Process connections to find which boxes should be merged
    // Only merge if connection is between DIFFERENT boxes
    connections.forEach(conn => {
      const fromItem = orderItems.find(i => {
        const lineId = i.unique_id || i.line_id || `${selectedOrder?.id}_L${i.line || i.item_id}`;
        return lineId === conn.from;
      });
      const toItem = orderItems.find(i => {
        const lineId = i.unique_id || i.line_id || `${selectedOrder?.id}_L${i.line || i.item_id}`;
        return lineId === conn.to;
      });
      
      if (fromItem && toItem) {
        const fromLineId = fromItem.unique_id || fromItem.line_id || `${selectedOrder?.id}_L${fromItem.line || fromItem.item_id}`;
        const toLineId = toItem.unique_id || toItem.line_id || `${selectedOrder?.id}_L${toItem.line || toItem.item_id}`;
        const fromBoxNumber = packingData[fromLineId]?.boxNumber;
        const toBoxNumber = packingData[toLineId]?.boxNumber;
        
        // IMPORTANT: Only merge if boxes are DIFFERENT (ignore connections within same box)
        if (fromBoxNumber && toBoxNumber && fromBoxNumber !== toBoxNumber) {
          // These boxes should be merged
          const fromGroup = boxToMergedGroup.get(fromBoxNumber);
          const toGroup = boxToMergedGroup.get(toBoxNumber);
          
          if (fromGroup !== undefined && toGroup !== undefined && fromGroup !== toGroup) {
            // Merge groups
            const groupToMerge = mergedBoxes.get(toGroup) || [];
            const targetGroup = mergedBoxes.get(fromGroup) || [];
            targetGroup.push(...groupToMerge);
            groupToMerge.forEach(box => boxToMergedGroup.set(box, fromGroup));
            mergedBoxes.delete(toGroup);
          } else if (fromGroup !== undefined) {
            // Add to existing group
            const group = mergedBoxes.get(fromGroup) || [];
            group.push(toBoxNumber);
            boxToMergedGroup.set(toBoxNumber, fromGroup);
          } else if (toGroup !== undefined) {
            // Add to existing group
            const group = mergedBoxes.get(toGroup) || [];
            group.push(fromBoxNumber);
            boxToMergedGroup.set(fromBoxNumber, toGroup);
          } else {
            // Create new merged group
            const newGroupId = Math.min(fromBoxNumber, toBoxNumber);
            mergedBoxes.set(newGroupId, [fromBoxNumber, toBoxNumber]);
            boxToMergedGroup.set(fromBoxNumber, newGroupId);
            boxToMergedGroup.set(toBoxNumber, newGroupId);
          }
        }
        // If fromBoxNumber === toBoxNumber, connection is within same box - ignore it
      }
    });
    
    // Create final boxes, merging where necessary
    const processedBoxNumbers = new Set<number>();
    let finalBoxNumber = 1;
    
    // First, create merged boxes
    mergedBoxes.forEach((boxNumbers, groupId) => {
      const mergedItems: any[] = [];
      
      boxNumbers.forEach(boxNum => {
        processedBoxNumbers.add(boxNum);
        const items = boxGroups.get(boxNum) || [];
        mergedItems.push(...items);
      });
      
      if (mergedItems.length > 0) {
        boxes.push({
          boxId: `BOX_${Date.now()}_${finalBoxNumber}`,
          boxNumber: finalBoxNumber,
          orderId: selectedOrder?.id || '',
          items: mergedItems,
          isFull: mergedItems.length >= 10,
          isPrinted: false
        });
        finalBoxNumber++;
      }
    });
    
    // Then, create boxes for unmerged items
    boxGroups.forEach((items, boxNumber) => {
      if (!processedBoxNumbers.has(boxNumber) && items.length > 0) {
        boxes.push({
          boxId: `BOX_${Date.now()}_${finalBoxNumber}`,
          boxNumber: finalBoxNumber,
          orderId: selectedOrder?.id || '',
          items,
          isFull: items.length >= 10,
          isPrinted: false
        });
        finalBoxNumber++;
      }
    });
    
    return boxes.sort((a, b) => a.boxNumber - b.boxNumber);
  };

  const handleRegionSelect = (region: DeliveryRegion) => {
    setSelectedRegion(region);
    setShowRegionSelector(false);
    
    // Открываем предпросмотр этикеток
    setShowLabelPreview(true);
  };

  const handlePrintComplete = async () => {
    if (!selectedOrder) return;
    
    // Update barcode printing status in database
    await orderStatusService.updateBarcodeStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      true
    );
    
    // Update status to 'labels_printed'
    await orderStatusService.updateGeneralStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      'labels_printed'
    );
    
    // Refresh order status
    const updatedStatus = await orderStatusService.getOrderStatus(selectedOrder.id);
    setCurrentOrderStatus(updatedStatus);
    
    // Показываем сообщение об успешной печати
    message.success(
      locale === 'he' 
        ? `המדבקות הודפסו בהצלחה` 
        : `Этикетки успешно напечатаны`
    );
    
    // Закрываем окно предпросмотра этикеток (оно само закроется через LabelPreview)
    // и открываем модал для создания счета
    setTimeout(() => {
      setShowInvoiceModal(true);
    }, 500);
  };

  const handleInvoiceComplete = async (invoiceLink?: string) => {
    if (!selectedOrder) return;
    
    // Update invoice status in database
    await orderStatusService.updateInvoiceStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      true,
      invoiceLink
    );
    
    // Update status to 'completed' when all stages are done
    await orderStatusService.updateGeneralStatus(
      selectedOrder.id,
      selectedOrder.orderNumber,
      'completed'
    );
    
    // Refresh order status
    const updatedStatus = await orderStatusService.getOrderStatus(selectedOrder.id);
    setCurrentOrderStatus(updatedStatus);
    
    // Закрываем все модальные окна
    setShowInvoiceModal(false);
    setShowLabelPreview(false);
    setPackingModalVisible(false);
    
    // Сбрасываем состояния
    setSelectedRegion(null);
    setPackingBoxes([]);
    setPackingData({});
    setConnections([]);
    
    // Показываем финальное сообщение
    message.success(
      locale === 'he' 
        ? `הזמנה ${selectedOrder?.orderNumber} הושלמה בהצלחה!` 
        : `Заказ ${selectedOrder?.orderNumber} успешно завершен!`
    );
    
    // Обновляем список заказов
    loadOrders();
  };

  // Connection handling functions
  const handleConnectionStart = (pointId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setActiveConnectionStart(pointId);
    
    // Add connecting class to body
    document.body.classList.add('connecting');
    
    // Get the position of the starting point
    const startElement = event.currentTarget as HTMLElement;
    if (startElement && canvasContainerRef.current) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const elementRect = startElement.getBoundingClientRect();
      
      // Calculate position relative to the container viewport
      const startPos = {
        x: elementRect.left - containerRect.left + elementRect.width / 2,
        y: elementRect.top - containerRect.top + elementRect.height / 2
      };
      
      setDragStartPosition(startPos);
      setDragPosition(startPos);
    }
    
    // Use native events on window for better compatibility
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasContainerRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        
        // Mouse position relative to container viewport
        const newPos = { 
          x: e.clientX - containerRect.left, 
          y: e.clientY - containerRect.top
        };
        setDragPosition(newPos);
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      // Remove connecting class
      document.body.classList.remove('connecting');
      
      // Check if we're over another connection point
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const connectionPoint = elements.find(el => 
        el.hasAttribute('data-connection-point') && 
        el.getAttribute('data-point-id') !== pointId
      );
      
      if (connectionPoint) {
        const targetId = connectionPoint.getAttribute('data-point-id');
        if (targetId) {
          handleConnectionEnd(targetId);
        }
      } else {
        // Cancel connection
        handleConnectionEnd('');
      }
      
      // Remove listeners
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Use window instead of document for better event capture
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleConnectionEnd = (targetPointId: string) => {
    if (!activeConnectionStart || !targetPointId || activeConnectionStart === targetPointId) {
      // Cancel connection
      setActiveConnectionStart(null);
      setDragPosition(null);
      setDragStartPosition(null);
      return;
    }
    
    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      (conn.from === activeConnectionStart && conn.to === targetPointId) ||
      (conn.from === targetPointId && conn.to === activeConnectionStart)
    );
    
    if (existingConnection) {
      message.warning(locale === 'he' ? 'חיבור כבר קיים' : 'Соединение уже существует');
      setActiveConnectionStart(null);
      setDragPosition(null);
      setDragStartPosition(null);
      return;
    }

    // Get positions of both points
    const fromElement = document.querySelector(`[data-point-id="${activeConnectionStart}"]`);
    const toElement = document.querySelector(`[data-point-id="${targetPointId}"]`);
    
    if (fromElement && toElement && canvasContainerRef.current) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();
      
      // Positions relative to container viewport
      const fromPosition = {
        x: fromRect.left - containerRect.left + fromRect.width / 2,
        y: fromRect.top - containerRect.top + fromRect.height / 2
      };
      
      const toPosition = {
        x: toRect.left - containerRect.left + toRect.width / 2,
        y: toRect.top - containerRect.top + toRect.height / 2
      };
      
      // Find indices of the connected items
      const fromIndex = orderItems.findIndex(item => {
        const itemId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
        return itemId === activeConnectionStart;
      });
      
      const toIndex = orderItems.findIndex(item => {
        const itemId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
        return itemId === targetPointId;
      });
      
      // Determine which item is higher (lower index) and which is lower
      let upperItemId = activeConnectionStart;
      let lowerItemId = targetPointId;
      let upperIndex = fromIndex;
      let lowerIndex = toIndex;
      
      if (toIndex < fromIndex) {
        upperItemId = targetPointId;
        lowerItemId = activeConnectionStart;
        upperIndex = toIndex;
        lowerIndex = fromIndex;
      }
      
      // Only reorder items if they are not already consecutive
      if (Math.abs(upperIndex - lowerIndex) > 1) {
        // Create new array with reordered items
        const newOrderItems = [...orderItems];
        const lowerItem = newOrderItems[lowerIndex];
        
        // Remove the lower item from its current position
        newOrderItems.splice(lowerIndex, 1);
        
        // Insert it right after the upper item
        const newUpperIndex = upperIndex < lowerIndex ? upperIndex : upperIndex - 1;
        newOrderItems.splice(newUpperIndex + 1, 0, lowerItem);
        
        // Update the orderItems with animation
        setOrderItems(newOrderItems);
        
        message.info(
          locale === 'he' 
            ? `פריט הועבר לאחר פריט ${upperIndex + 1}` 
            : `Товар перемещен после позиции ${upperIndex + 1}`
        );
        
        // Force update of connection positions after reordering
        setTimeout(() => {
          // Trigger position update for all connection points
          newOrderItems.forEach((item, index) => {
            const lineId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
            const element = document.querySelector(`[data-point-id="${lineId}"]`);
            if (element && canvasContainerRef.current) {
              const containerRect = canvasContainerRef.current.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();
              
              // Position relative to container viewport
              const position = {
                x: elementRect.left - containerRect.left + elementRect.width / 2,
                y: elementRect.top - containerRect.top + elementRect.height / 2
              };
              
              setConnectionPoints(prev => new Map(prev).set(lineId, position));
            }
          });
        }, 600); // Wait for animation to complete
      }
      
      const newConnection: Connection = {
        id: `${activeConnectionStart}_to_${targetPointId}`,
        from: activeConnectionStart,
        to: targetPointId,
        fromPosition,
        toPosition,
        color: '#1890ff'  // Blue color for connected cables
      };
      
      setConnections(prev => {
        const updated = [...prev, newConnection];
        
        // Renumber all boxes after creating connection
        setTimeout(() => {
          const result = renumberBoxesWithConnections(updated);
          message.success(
            locale === 'he' 
              ? `חיבור נוצר בהצלחה. סה"כ ${result.totalBoxes} קופסאות` 
              : `Соединение установлено. Всего ${result.totalBoxes} коробок`
          );
          
          // Save draft boxes after packingData is updated - use the returned packingData!
          setTimeout(() => {
            saveDraftBoxesFromConnections(updated, result.packingData);
          }, 100); // Additional delay to ensure packingData is updated
        }, 100);
        
        return updated;
      });
    }
    
    // Reset drag state
    setActiveConnectionStart(null);
    setDragPosition(null);
    setDragStartPosition(null);
  };

  const handleConnectionDrag = (position: { x: number; y: number }) => {
    setDragPosition(position);
  };

  // Function to renumber all boxes based on connections
  const renumberBoxesWithConnections = (currentConnections: Connection[]) => {
    const updatedPackingData = { ...packingData };
    
    // Create groups of connected items
    const itemGroups: string[][] = [];
    const processedItems = new Set<string>();
    
    // Helper function to find all connected items
    const findConnectedItems = (itemId: string, group: string[]) => {
      if (processedItems.has(itemId)) return;
      processedItems.add(itemId);
      group.push(itemId);
      
      // Find all connections for this item
      currentConnections.forEach(conn => {
        if (conn.from === itemId && !processedItems.has(conn.to)) {
          findConnectedItems(conn.to, group);
        } else if (conn.to === itemId && !processedItems.has(conn.from)) {
          findConnectedItems(conn.from, group);
        }
      });
    };
    
    // Build groups of connected items
    orderItems.forEach(item => {
      // For split items use unique_id, for regular items use line_id
      const itemId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
      if (!processedItems.has(itemId)) {
        const group: string[] = [];
        findConnectedItems(itemId, group);
        itemGroups.push(group);
      }
    });
    
    
    // Sort groups by their position in the table (by first item index)
    itemGroups.sort((a, b) => {
      const indexA = orderItems.findIndex(item => {
        const itemId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
        return a.includes(itemId);
      });
      const indexB = orderItems.findIndex(item => {
        const itemId = item.unique_id || item.line_id || `${selectedOrder?.id}_L${item.line || item.item_id}`;
        return b.includes(itemId);
      });
      return indexA - indexB;
    });
    
    // Assign box numbers to groups
    let currentBoxNumber = 1;
    itemGroups.forEach(group => {
      group.forEach(itemId => {
        updatedPackingData[itemId] = {
          ...updatedPackingData[itemId],
          boxNumber: currentBoxNumber
        };
      });
      currentBoxNumber++;
    });
    
    setPackingData(updatedPackingData);
    
    return { 
      totalBoxes: itemGroups.length, // Return total number of boxes
      packingData: updatedPackingData // Also return updated packingData
    };
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

  // Handle pagination change
  const handlePageChange = (page: number, size?: number) => {
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    
    // If we already have all orders, do client-side pagination
    if (allOrders.length > 0) {
      const newPageSize = size || pageSize;
      const startIndex = (page - 1) * newPageSize;
      const endIndex = startIndex + newPageSize;
      const paginatedOrders = allOrders.slice(startIndex, endIndex);
      
      setOrders(paginatedOrders);
      setCurrentPage(page);
      if (size) setPageSize(size);
      
      console.log(`📄 Client-side pagination: showing ${paginatedOrders.length} orders on page ${page}`);
    } else {
      // Load orders if we don't have them
      loadOrders(page);
    }
  };

  // Reset to first page when filters change
  const handleFiltersChange = () => {
    if (currentPage === 1) {
      loadOrders(1);
    } else {
      setCurrentPage(1);
      loadOrders(1);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    handleFiltersChange();
  }, [selectedDate, statusFilter, searchText]); // Reload when filters change

  // Update connection positions on resize or when modal opens
  useEffect(() => {
    if (!packingModalVisible || !canvasContainerRef.current) return;
    
    let animationFrameId: number | null = null;
    
    const updateAllPositions = () => {
      if (!canvasContainerRef.current) return;
      
      // Update positions for all connection points
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      
      // Find all connection points and update their positions
      const connectionElements = document.querySelectorAll('[data-connection-point="true"]');
      const newConnectionPoints = new Map<string, { x: number; y: number }>();
      
      connectionElements.forEach((element) => {
        const pointId = element.getAttribute('data-point-id');
        if (pointId) {
          const rect = element.getBoundingClientRect();
          // Position relative to container viewport (no scroll offset needed)
          const position = {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
          };
          newConnectionPoints.set(pointId, position);
        }
      });
      
      // Only update if positions actually changed (with tolerance)
      let hasChanges = false;
      const tolerance = 0.5; // pixel tolerance
      
      if (connectionPoints.size !== newConnectionPoints.size) {
        hasChanges = true;
      } else {
        newConnectionPoints.forEach((pos, id) => {
          const oldPos = connectionPoints.get(id);
          if (!oldPos || 
              Math.abs(oldPos.x - pos.x) > tolerance || 
              Math.abs(oldPos.y - pos.y) > tolerance) {
            hasChanges = true;
          }
        });
      }
      
      if (hasChanges) {
        // Batch state updates to prevent blocking
        requestAnimationFrame(() => {
          // Update connection points state
          setConnectionPoints(newConnectionPoints);
          
          // Update existing connections with new positions
          setConnections(prev => prev.map(conn => {
            const fromPos = newConnectionPoints.get(conn.from);
            const toPos = newConnectionPoints.get(conn.to);
            if (fromPos && toPos) {
              return { ...conn, fromPosition: fromPos, toPosition: toPos };
            }
            return conn;
          }));
        });
      }
    };

    // Reduced initial updates to prevent blocking
    const timers = [
      setTimeout(updateAllPositions, 100),
      setTimeout(updateAllPositions, 500)
    ];
    
    // Add resize listener with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateAllPositions, 200);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Optimized scroll handler - only update on actual scroll
    let lastScrollTime = 0;
    const scrollHandler = () => {
      const now = performance.now();
      
      // Throttle updates to max 60fps (16ms)
      if (now - lastScrollTime >= 16) {
        lastScrollTime = now;
        updateAllPositions();
      }
    };
    
    // Add scroll listener to the modal body only
    const modalBody = canvasContainerRef.current?.closest('.ant-modal-body');
    if (modalBody) {
      modalBody.addEventListener('scroll', scrollHandler, { passive: true });
    }
    
    // Observe DOM mutations with debouncing
    let mutationTimeout: NodeJS.Timeout | null = null;
    const observer = new MutationObserver(() => {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        updateAllPositions();
      }, 50); // Debounce mutations
    });
    
    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current, {
        childList: true,
        subtree: true,
        attributes: true, // Must be true when using attributeFilter
        attributeFilter: ['data-connection-point'] // Only observe connection-specific changes
      });
    }
    
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(resizeTimeout);
      if (mutationTimeout) clearTimeout(mutationTimeout);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      const cleanupModalBody = canvasContainerRef.current?.closest('.ant-modal-body');
      if (cleanupModalBody) {
        cleanupModalBody.removeEventListener('scroll', scrollHandler);
      }
    };
  }, [packingModalVisible, orderItems.length, connections.length]); // Removed connectionPoints to prevent loops
  
  // Update connection positions when connectionPoints change
  useEffect(() => {
    if (connections.length > 0 && connectionPoints.size > 0) {
      setConnections(prev => prev.map(conn => {
        const fromPos = connectionPoints.get(conn.from);
        const toPos = connectionPoints.get(conn.to);
        if (fromPos && toPos) {
          return { ...conn, fromPosition: fromPos, toPosition: toPos };
        }
        return conn;
      }));
    }
  }, [connectionPoints]);

  // Update connection positions when connections or items change with MutationObserver
  useEffect(() => {
    if (!packingModalVisible || !canvasContainerRef.current) return;
    
    const updatePositions = () => {
      if (!canvasContainerRef.current || connections.length === 0) return;
      
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      
      const updatedConnections = connections.map(conn => {
        const fromElement = document.querySelector(`[data-point-id="${conn.from}"]`);
        const toElement = document.querySelector(`[data-point-id="${conn.to}"]`);
        
        if (fromElement && toElement) {
          const fromRect = fromElement.getBoundingClientRect();
          const toRect = toElement.getBoundingClientRect();
          
          // Connection points relative to container viewport
          const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
          const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
          const toX = toRect.left - containerRect.left + toRect.width / 2;
          const toY = toRect.top - containerRect.top + toRect.height / 2;
          
          console.log(`Connection ${conn.id}: from(${fromX}, ${fromY}) to(${toX}, ${toY})`);
          console.log(`Element rects: from(${fromRect.left}, ${fromRect.top}) to(${toRect.left}, ${toRect.top})`);
          
          return {
            ...conn,
            fromPosition: { x: fromX, y: fromY },
            toPosition: { x: toX, y: toY }
          };
        }
        console.warn(`Elements not found for connection ${conn.id}`);
        return conn;
      });
      
      if (JSON.stringify(updatedConnections) !== JSON.stringify(connections)) {
        setConnections(updatedConnections);
      }
    };
    
    // Use MutationObserver to detect when DOM changes
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations affect connection points
      const hasConnectionChanges = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);
          const allNodes = [...addedNodes, ...removedNodes];
          
          return allNodes.some(node => {
            if (node instanceof Element) {
              return node.querySelector('[data-connection-point]') || 
                     node.hasAttribute?.('data-connection-point');
            }
            return false;
          });
        }
        return false;
      });
      
      if (hasConnectionChanges) {
        requestAnimationFrame(updatePositions);
      }
    });
    
    // Start observing the table container for changes
    if (packingTableRef.current) {
      observer.observe(packingTableRef.current, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
    
    // Initial position updates
    const timers = [
      setTimeout(updatePositions, 100),
      setTimeout(updatePositions, 300),
      setTimeout(updatePositions, 600),
      setTimeout(updatePositions, 1000)
    ];
    
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [packingModalVisible, connections, orderItems.length]); // Update when modal opens, connections or items change

  // Remove auto-refresh to protect RIVHIT API
  // useEffect(() => {
  //   // Auto refresh every 30 seconds - DISABLED to protect RIVHIT API
  //   const interval = setInterval(() => {
  //     if (!loading) {
  //       loadOrders();
  //     }
  //   }, 30000);

  //   return () => clearInterval(interval);
  // }, [loading]);

  const columns = [
    {
      title: locale === 'he' ? 'מספר הזמנה' : 'Номер заказа',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      sorter: (a: Order, b: Order) => a.orderNumber.localeCompare(b.orderNumber),
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: locale === 'he' ? 'שם לקוח' : 'Имя клиента',
      dataIndex: 'customerName',
      key: 'customerName',
      sorter: (a: Order, b: Order) => a.customerName.localeCompare(b.customerName)
    },
    {
      title: locale === 'he' ? 'סטטוס' : 'Статус',
      dataIndex: 'status',
      key: 'status',
      sorter: (a: Order, b: Order) => {
        const statusA = a.status || 'pending';
        const statusB = b.status || 'pending';
        return getStatusNumber(statusA) - getStatusNumber(statusB);
      },
      render: (status: string) => {
        // Default to pending if status is undefined
        const displayStatus = status || 'pending';
        return (
          <Tag color={getStatusColor(displayStatus)}>
            {locale === 'he' 
              ? { 
                  pending: 'ממתין',
                  packing: 'נארז',
                  packed_pending_labels: 'ארוז - ממתין למדבקות',
                  labels_printed: 'מדבקות הודפסו',
                  completed: 'הושלם',
                  shipped: 'נשלח'
                }[displayStatus] || 'ממתין'
              : { 
                  pending: 'Ожидает',
                  packing: 'Упаковывается',
                  packed_pending_labels: 'Упакован - ждет этикеток',
                  labels_printed: 'Этикетки напечатаны',
                  completed: 'Завершен',
                  shipped: 'Отправлен'
                }[displayStatus] || 'Ожидает'
            }
          </Tag>
        );
      }
    },
    {
      title: locale === 'he' ? 'פריטים' : 'Товары',
      dataIndex: 'items',
      key: 'items',
      sorter: (a: Order, b: Order) => (a.items as number) - (b.items as number),
      render: (items: number) => <Badge count={items} style={{ backgroundColor: '#52c41a' }} />
    },
    {
      title: locale === 'he' ? 'סכום (₪)' : 'Сумма (₪)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      sorter: (a: Order, b: Order) => (a.totalAmount || 0) - (b.totalAmount || 0),
      render: (amount: number, record: Order) => 
        amount ? `${amount.toFixed(2)} ${record.currency || 'NIS'}` : '-'
    },
    {
      title: locale === 'he' ? 'תאריך יצירה' : 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => {
        if (!date) return '-';
        // Try multiple date formats to handle different API responses
        const parsedDate = dayjs(date, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], true);
        return parsedDate.isValid() ? parsedDate.format('DD/MM/YYYY') : date;
      }
    },
    {
      title: locale === 'he' ? 'פעולות' : 'Действия',
      key: 'actions',
      render: (_, record: Order) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewOrder(record)}
          >
            {locale === 'he' ? 'צפייה' : 'Просмотр'}
          </Button>
          <Button 
            type="primary" 
            icon={<ContainerOutlined />}
            size="small"
            disabled={record.status === 'completed' || record.status === 'shipped'}
            onClick={() => handlePackOrder(record)}
          >
            {locale === 'he' ? 'ארוז' : 'Упаковать'}
          </Button>
        </Space>
      )
    }
  ];

  // Server-side filtering is now handled by API, no need for client-side filtering

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* Header */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                {locale === 'he' ? '🛒 ניהול הזמנות' : '🛒 Управление заказами'}
              </Title>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => loadOrders()}
                >
                  {locale === 'he' ? 'רענן' : 'Обновить'}
                </Button>
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setSettingsModalVisible(true)}
                >
                  {locale === 'he' ? 'הגדרות' : 'Настройки'}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Input
                placeholder={locale === 'he' ? 'חיפוש הזמנה או לקוח...' : 'Поиск заказа или клиента...'}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Select
                placeholder={locale === 'he' ? 'סטטוס' : 'Статус'}
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="all">{locale === 'he' ? 'כל הסטטוסים' : 'Все статусы'}</Option>
                <Option value="pending">{locale === 'he' ? 'ממתין' : 'Ожидает'}</Option>
                <Option value="packing">{locale === 'he' ? 'נארז' : 'Упаковывается'}</Option>
                <Option value="packed_pending_labels">{locale === 'he' ? 'ארוז - ממתין למדבקות' : 'Упакован - ждет этикеток'}</Option>
                <Option value="labels_printed">{locale === 'he' ? 'מדבקות הודפסו' : 'Этикетки напечатаны'}</Option>
                <Option value="completed">{locale === 'he' ? 'הושלם' : 'Завершен'}</Option>
                <Option value="shipped">{locale === 'he' ? 'נשלח' : 'Отправлен'}</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={6}>
              <DatePicker 
                style={{ width: '100%' }}
                value={selectedDate}
                onChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    // Auto-reload orders when date is selected
                    loadOrders(1);
                  }
                }}
                placeholder={locale === 'he' ? 'בחר תאריך' : 'Выберите дату'}
                format="DD/MM/YYYY"
                // Allow all dates including today and future
                allowClear={false}
              />
            </Col>
            <Col xs={24} sm={24} md={4}>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => {
                  setSearchText('');
                  setStatusFilter('all');
                  setSelectedDate(dayjs()); // Reset to today
                  loadOrders();
                }}
              >
                {locale === 'he' ? 'נקה מסננים' : 'Очистить'}
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Error Alert */}
        {error && !apiHealthy && (
          <Alert
            message={locale === 'he' ? 'שגיאת חיבור לשרת' : 'Ошибка подключения к серверу'}
            description={locale === 'he' ? 'מציג נתונים מקומיים' : 'Показываю локальные данные'}
            type="warning"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Orders Table */}
        <Card>
          <Spin spinning={loading} tip={locale === 'he' ? 'טוען הזמנות...' : 'Загружаю заказы...'}>
            <Table
              columns={columns}
              dataSource={orders}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalOrders,
                showSizeChanger: true,
                showQuickJumper: true,
                onChange: handlePageChange,
                onShowSizeChange: handlePageChange,
                showTotal: (total, range) => 
                  locale === 'he' 
                    ? `${range[0]}-${range[1]} מתוך ${total} הזמנות`
                    : `${range[0]}-${range[1]} из ${total} заказов`,
                pageSizeOptions: ['10', '20', '50', '100', '200'],
                showLessItems: true
              }}
              scroll={{ x: 1000 }}
              size="middle"
              locale={{
                emptyText: loading ? '' : (locale === 'he' ? 'אין הזמנות' : 'Нет заказов')
              }}
            />
          </Spin>
        </Card>

        {/* Order Details Modal */}
        <Modal
          title={selectedOrder ? 
            (locale === 'he' ? `פרטי הזמנה ${selectedOrder.orderNumber}` : `Детали заказа ${selectedOrder.orderNumber}`) : 
            (locale === 'he' ? 'פרטי הזמנה' : 'Детали заказа')
          }
          open={viewModalVisible}
          onCancel={() => {
            setViewModalVisible(false);
            setSelectedOrder(null);
            setOrderDetails(null);
          }}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              {locale === 'he' ? 'סגור' : 'Закрыть'}
            </Button>,
            selectedOrder && (selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
              <Button 
                key="pack" 
                type="primary" 
                icon={<ContainerOutlined />}
                onClick={() => {
                  handlePackOrder(selectedOrder);
                  setViewModalVisible(false);
                }}
              >
                {locale === 'he' ? 'ארוז' : 'Упаковать'}
              </Button>
            )
          ]}
          width={800}
        >
          <Spin spinning={detailsLoading}>
            {orderDetails && (
              <div>
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  title={locale === 'he' ? 'מידע כללי' : 'Общая информация'}
                >
                  <Descriptions.Item label={locale === 'he' ? 'מספר הזמנה' : 'Номер заказа'}>
                    <strong>{orderDetails.orderNumber}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'שם הלקוח' : 'Имя клиента'}>
                    {orderDetails.customerName}
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'סטטוס' : 'Статус'}>
                    <Tag color={getStatusColor(orderDetails.status)}>
                      {locale === 'he' 
                        ? { 
                            pending: 'ממתין',
                            packing: 'נארז',
                            packed_pending_labels: 'ארוז - ממתין למדבקות',
                            labels_printed: 'מדבקות הודפסו',
                            completed: 'הושלם',
                            shipped: 'נשלח'
                          }[orderDetails.status]
                        : { 
                            pending: 'Ожидает',
                            packing: 'Упаковывается',
                            packed_pending_labels: 'Упакован - ждет этикеток',
                            labels_printed: 'Этикетки напечатаны',
                            completed: 'Завершен',
                            shipped: 'Отправлен'
                          }[orderDetails.status]
                      }
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'כמות פריטים' : 'Количество товаров'}>
                    <Badge count={orderDetails.items} style={{ backgroundColor: '#52c41a' }} />
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'משקל משוער' : 'Примерный вес'}>
                    {orderDetails.weight ? `${orderDetails.weight.toFixed(1)} кг` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'סכום כולל' : 'Общая сумма'}>
                    {orderDetails.totalAmount ? 
                      `${orderDetails.totalAmount.toFixed(2)} ${orderDetails.currency || 'NIS'}` : 
                      '-'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label={locale === 'he' ? 'תאריך יצירה' : 'Дата создания'}>
                    {dayjs(orderDetails.createdAt).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                </Descriptions>

                <Divider>{locale === 'he' ? 'פעולות זמינות' : 'Доступные действия'}</Divider>
                
                <Space>
                  {orderDetails.status === 'pending' && (
                    <Button type="primary" ghost>
                      {locale === 'he' ? 'התחל עיבוד' : 'Начать обработку'}
                    </Button>
                  )}
                  {(orderDetails.status === 'pending' || orderDetails.status === 'processing') && (
                    <Button type="primary" icon={<ContainerOutlined />}>
                      {locale === 'he' ? 'ארוז הזמנה' : 'Упаковать заказ'}
                    </Button>
                  )}
                  {orderDetails.status === 'packed' && (
                    <Button type="primary">
                      {locale === 'he' ? 'הכן לשליחה' : 'Подготовить к отправке'}
                    </Button>
                  )}
                  <Button>
                    {locale === 'he' ? 'הדפס תווית' : 'Печать этикетки'}
                  </Button>
                  <Button>
                    {locale === 'he' ? 'היסטוריית שינויים' : 'История изменений'}
                  </Button>
                </Space>
              </div>
            )}
          </Spin>
        </Modal>

        {/* Packing Modal */}
        <Modal
          title={
            <div style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 20, fontWeight: 600 }}>
                {selectedOrder ? 
                  (locale === 'he' ? `הזמנה ${selectedOrder.orderNumber}` : `Заказ ${selectedOrder.orderNumber}`) : 
                  (locale === 'he' ? 'הזמנה' : 'Заказ')
                }
              </div>
              <SimpleProgressSteps
                steps={[
                  {
                    key: 'packing',
                    title: 'Упаковка',
                    titleHe: 'אריזה',
                    status: currentOrderStatus?.isPacked ? 'completed' : 'active' as const
                  },
                  {
                    key: 'labels',
                    title: 'Этикетки',
                    titleHe: 'תוויות',
                    status: currentOrderStatus?.barcodesPrinted ? 'completed' : 
                            currentOrderStatus?.isPacked ? 'active' : 'pending' as const
                  },
                  {
                    key: 'invoice',
                    title: 'Счет',
                    titleHe: 'חשбונית',
                    status: currentOrderStatus?.invoiceCreated ? 'completed' : 
                            currentOrderStatus?.barcodesPrinted ? 'active' : 'pending' as const
                  }
                ]}
                locale={locale as 'ru' | 'he'}
                onStepClick={(stepKey, stepIndex) => {
                  // Handle navigation between steps
                  if (stepKey === 'labels' && packingBoxes.length > 0) {
                    // Open labels modal
                    setPackingModalVisible(false);
                    setShowRegionSelector(true);
                  } else if (stepKey === 'invoice' && packingBoxes.length > 0) {
                    // Open invoice modal
                    setPackingModalVisible(false);
                    setShowInvoiceModal(true);
                  }
                }}
              />
            </div>
          }
          open={packingModalVisible}
          onCancel={() => {
            setPackingModalVisible(false);
            setSelectedOrder(null);
            setOrderItems([]);
            setPackingData({});
            setConnections([]);
            setConnectionPoints(new Map());
            setActiveConnectionStart(null);
            setDragPosition(null);
            setDragStartPosition(null);
          }}
          footer={[
            <Button key="cancel" onClick={() => setPackingModalVisible(false)}>
              {locale === 'he' ? 'ביטול' : 'Отмена'}
            </Button>,
            <Button 
              key="pack" 
              type="primary" 
              icon={<ContainerOutlined />}
              onClick={handleFinalizePacking}
            >
              {locale === 'he' ? 'אשר' : 'Подтвердить'}
            </Button>
          ]}
          width={1400}
          styles={{ body: { overflowX: 'auto', padding: '24px' } }}
        >
          <Spin spinning={detailsLoading}>
            {orderItems.length > 0 && (
              <div 
                ref={canvasContainerRef}
                style={{ 
                  position: 'relative', 
                  direction: locale === 'he' ? 'rtl' : 'ltr',
                  minHeight: '400px'
                }}
              >
                {/* SVG Connections */}
                <SVGConnections
                  connections={connections}
                  dragPosition={dragPosition}
                  dragStartPosition={dragStartPosition}
                  onConnectionClick={(connectionId) => {
                    setConnections(prev => {
                      const updated = prev.filter(conn => conn.id !== connectionId);
                      
                      // Renumber boxes after removing connection
                      setTimeout(() => {
                        const result = renumberBoxesWithConnections(updated);
                        
                        // Save the updated draft boxes after connection removal
                        if (selectedOrder) {
                          saveDraftBoxesFromConnections(updated, result.packingData);
                        }
                        
                        message.info(
                          locale === 'he' 
                            ? `חיבור הוסר. סה"כ ${result.totalBoxes} קופסאות` 
                            : `Соединение удалено. Всего ${result.totalBoxes} коробок`
                        );
                      }, 100);
                      
                      return updated;
                    });
                  }}
                />
                
                <div ref={packingTableRef}>
                  <Table
                    dataSource={orderItems}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 1200 }}
                    rowKey={(record) => record.unique_id || record.line_id || `${selectedOrder?.id}_L${record.line || record.item_id}`}
                    columns={[
                    {
                      title: locale === 'he' ? 'קטלוג' : 'Каталог',
                      dataIndex: 'catalog_number',
                      key: 'catalog_number',
                      width: 90,
                      render: (text) => text || '-'
                    },
                    {
                      title: locale === 'he' ? 'תיאור' : 'Описание',
                      dataIndex: 'description',
                      key: 'description',
                      width: 240,
                      render: (text, record) => (
                        <div>
                          <div style={{ 
                            maxWidth: '220px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}>
                            {text}
                          </div>
                          {record.is_split && record.original_quantity && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#8c8c8c',
                              marginTop: '2px'
                            }}>
                              {locale === 'he' 
                                ? `מתוך ${record.original_quantity} יחידות כוללות`
                                : `Из ${record.original_quantity} единиц всего`}
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      title: locale === 'he' ? 'כמות בהזמנה' : 'Количество в заказе',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 100,
                      align: 'center',
                      render: (qty) => <Badge count={qty} style={{ backgroundColor: '#1890ff' }} />
                    },
                    {
                      title: locale === 'he' ? 'מחיר (₪)' : 'Цена (₪)',
                      dataIndex: 'price_nis',
                      key: 'price_nis',
                      width: 80,
                      align: 'center',
                      render: (price) => price ? `₪${price.toFixed(2)}` : '-'
                    },
                    {
                      title: locale === 'he' ? 'אריזה' : 'Упаковать',
                      key: 'packing_quantity',
                      width: 130,
                      align: 'center',
                      render: (_, record) => {
                        const itemKey = record.unique_id || record.line_id || `${selectedOrder?.id}_L${record.line || record.item_id}`;
                        const currentData = packingData[itemKey] || { quantity: 0, boxNumber: 1 };
                        
                        // Calculate max quantity based on max-per-box if available
                        const maxPerBox = record.max_per_box || record.boxCapacity;
                        const effectiveMax = maxPerBox ? 
                          Math.min(record.quantity, maxPerBox * currentData.boxNumber) : 
                          record.quantity;
                        
                        // Auto-adjust quantity if it exceeds the new max
                        if (currentData.quantity > effectiveMax) {
                          handlePackingDataChange(itemKey, 'quantity', effectiveMax);
                        }
                        
                        return (
                          <Space direction="vertical" size="small">
                            <Space.Compact>
                              <Button
                                size="small"
                                icon={<MinusOutlined />}
                                onClick={() => handlePackingDataChange(itemKey, 'quantity', Math.max(0, currentData.quantity - 1))}
                                disabled={currentData.quantity <= 0}
                              />
                              <InputNumber
                                size="small"
                                min={0}
                                max={effectiveMax}
                                value={currentData.quantity}
                                onChange={(value) => handlePackingDataChange(itemKey, 'quantity', Math.min(value || 0, effectiveMax))}
                                style={{ width: 80, textAlign: 'center' }}
                              />
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handlePackingDataChange(itemKey, 'quantity', Math.min(currentData.quantity + 1, effectiveMax))}
                                disabled={currentData.quantity >= effectiveMax}
                              />
                            </Space.Compact>
                            {maxPerBox && (
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {locale === 'he' 
                                  ? `מקס: ${maxPerBox} יח׳/קופסה`
                                  : `Макс: ${maxPerBox} шт/коробка`}
                              </Text>
                            )}
                          </Space>
                        );
                      }
                    },
                    {
                      title: locale === 'he' ? 'קופסה' : 'Коробка',
                      key: 'box',
                      width: 180,
                      align: 'center',
                      fixed: 'right', // Fix column position to prevent floating
                      render: (_, record) => {
                        // For split items, show the pre-calculated box_label
                        if (record.is_split && record.box_label) {
                          return (
                            <div style={{ 
                              padding: '8px 16px',
                              border: '1px solid #1890ff',
                              borderRadius: '4px',
                              backgroundColor: '#e6f7ff',
                              color: '#1890ff',
                              fontWeight: 500,
                              textAlign: 'center',
                              fontSize: '13px',
                              lineHeight: '20px',
                              whiteSpace: 'nowrap'
                            }}>
                              {record.box_label}
                            </div>
                          );
                        }
                        
                        // For regular items, show interactive box selector
                        const itemKey = record.unique_id || record.line_id || `${selectedOrder?.id}_L${record.line || record.item_id}`;
                        const currentData = packingData[itemKey] || { quantity: 0, boxNumber: 1 };
                        
                        // Calculate max boxes based on max-per-box setting
                        const maxPerBox = record.max_per_box || record.boxCapacity;
                        const maxBoxes = maxPerBox ? Math.ceil(record.quantity / maxPerBox) : 10;
                        
                        // When box number changes, adjust quantity if needed
                        const handleBoxNumberChange = (newBoxNumber: number) => {
                          const validBoxNumber = Math.max(1, Math.min(newBoxNumber, maxBoxes));
                          handlePackingDataChange(itemKey, 'boxNumber', validBoxNumber);
                          
                          // Adjust quantity if it exceeds the new maximum
                          if (maxPerBox) {
                            const newMax = validBoxNumber * maxPerBox;
                            if (currentData.quantity > newMax) {
                              handlePackingDataChange(itemKey, 'quantity', Math.min(newMax, record.quantity));
                            }
                          }
                        };
                        
                        // Use Box X format instead of just number
                        const boxLabel = locale === 'he' 
                          ? `קופסה ${currentData.boxNumber}`
                          : `Коробка ${currentData.boxNumber}`;
                        
                        return (
                          <Space direction="vertical" size="small" align="center">
                            <Space.Compact>
                              <Button
                                size="small"
                                icon={<MinusOutlined />}
                                onClick={() => handleBoxNumberChange(currentData.boxNumber - 1)}
                                disabled={currentData.boxNumber <= 1}
                              />
                              <div style={{ 
                                padding: '4px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '2px',
                                backgroundColor: '#fafafa',
                                minWidth: '100px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 500,
                                lineHeight: '20px',
                                color: '#262626',
                                whiteSpace: 'nowrap'
                              }}>
                                {boxLabel}
                              </div>
                              <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleBoxNumberChange(currentData.boxNumber + 1)}
                                disabled={currentData.boxNumber >= maxBoxes}
                              />
                            </Space.Compact>
                            <Text type="secondary" style={{ fontSize: '11px', color: '#8c8c8c' }}>
                              {currentData.boxNumber}/{maxBoxes}
                            </Text>
                          </Space>
                        );
                      }
                    },
                    {
                      title: '',
                      key: 'connection',
                      width: 60,
                      render: (_, record) => {
                        const lineId = record.unique_id || record.line_id || `${selectedOrder?.id}_L${record.line || record.item_id}`;
                        const isConnected = connections.some(conn => conn.from === lineId || conn.to === lineId);
                        const isActive = activeConnectionStart === lineId;
                        
                        return (
                          <div 
                            style={{ 
                              position: 'relative', 
                              height: '40px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '0 10px'
                            }}
                          >
                            <div
                              data-connection-point="true"
                              data-point-id={lineId}
                              data-line-id={lineId}
                              className={`connection-point-inline ${isActive ? 'active' : ''} ${isConnected ? 'connected' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // If we're already dragging from another point, this should complete the connection
                                if (activeConnectionStart && activeConnectionStart !== lineId) {
                                  handleConnectionEnd(lineId);
                                } else if (!activeConnectionStart) {
                                  // Start new connection
                                  handleConnectionStart(lineId, e);
                                }
                              }}
                              onMouseUp={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onMouseEnter={(e) => {
                                if (activeConnectionStart && activeConnectionStart !== lineId) {
                                  e.currentTarget.style.transform = 'scale(1.3)';
                                  e.currentTarget.style.boxShadow = '0 0 12px rgba(24, 144, 255, 0.6)';
                                } else if (!activeConnectionStart) {
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '';
                              }}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: isActive ? '#1890ff' : (isConnected ? '#1890ff' : '#d9d9d9'),
                                border: `3px solid ${isActive ? '#0050b3' : (isConnected ? '#0050b3' : '#8c8c8c')}`,
                                cursor: 'crosshair',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? '0 0 8px rgba(24, 144, 255, 0.6)' : 'none',
                                position: 'relative',
                                zIndex: 1000,
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: isActive || isConnected ? '#fff' : '#fff',
                                  opacity: isActive || isConnected ? 1 : 0.8,
                                  transition: 'all 0.2s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    }
                  ]}
                  />
                </div>
              </div>
            )}
          </Spin>
        </Modal>

      </Space>
      
      <style>{`
        /* Connection point styles */
        button.connection-point-inline {
          position: relative;
          cursor: crosshair;
          user-select: none;
          -webkit-user-select: none;
          transition: all 0.2s ease;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        
        .connection-point-inline:hover {
          transform: scale(1.2);
          filter: brightness(1.2);
        }
        
        .connection-point-inline:active {
          transform: scale(0.95);
          animation: click-pulse 0.4s ease-out;
        }
        
        .connection-point-inline.active {
          animation: pulse 2s infinite;
          transform: scale(1.1);
        }
        
        .connection-point-inline.connected {
          background-color: #1890ff !important;
          border-color: #0050b3 !important;
          animation: pulse-connected 2s infinite;
        }
        
        @keyframes pulse-connected {
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
        
        @keyframes click-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.8);
            transform: scale(0.95);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(24, 144, 255, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 20px rgba(24, 144, 255, 0);
            transform: scale(1);
          }
        }
        
        #connection-canvas {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 10;
        }
        
        .ant-table-wrapper {
          position: relative;
          z-index: 1;
        }
        
        /* Animation for row reordering */
        .ant-table-tbody > tr {
          transition: all 0.5s ease-in-out;
        }
        
        .ant-table-tbody > tr.row-moving {
          background-color: #e6f7ff;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        /* Dragging cursor for entire document when connecting */
        body.connecting {
          cursor: crosshair !important;
        }
        
        body.connecting * {
          cursor: crosshair !important;
        }
      `}</style>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
      
      {/* Модал выбора региона */}
      <RegionSelector
        visible={showRegionSelector}
        onSelect={handleRegionSelect}
        onCancel={() => setShowRegionSelector(false)}
      />
      
      {/* Модал предпросмотра этикеток */}
      {selectedRegion && (
        <LabelPreview
          visible={showLabelPreview}
          orderId={selectedOrder?.orderNumber || ''}
          boxes={packingBoxes}
          region={selectedRegion}
          customerName={selectedOrder?.customerName || ''}
          customerCity={selectedOrder?.customerCity}
          onPrint={handlePrintComplete}
          onCancel={() => setShowLabelPreview(false)}
          onNavigateToStep={(stepKey) => {
            if (stepKey === 'packing') {
              // Go back to packing modal
              setShowLabelPreview(false);
              setPackingModalVisible(true);
            } else if (stepKey === 'invoice') {
              // Go to invoice modal
              setShowLabelPreview(false);
              setShowInvoiceModal(true);
            }
          }}
        />
      )}
      
      {/* Модал создания счета */}
      {showInvoiceModal && selectedOrder && (
        <InvoiceModal
          visible={showInvoiceModal}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          boxes={packingBoxes}
          customerName={selectedOrder.customerName || ''}
          customerData={selectedOrder.customer_id ? {
            customer_id: selectedOrder.customer_id,
            customer_name: selectedOrder.customerName
          } : orderDetails?.customer}
          onClose={() => setShowInvoiceModal(false)}
          onInvoiceCreated={handleInvoiceComplete}
        />
      )}

      {/* Новый Workflow Modal с линией сборки - временно отключен
      {showWorkflowModal && selectedOrder && (
        <PackingWorkflowModal
          visible={showWorkflowModal}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          customerName={selectedOrder.customerName || ''}
          customerData={orderDetails?.customer}
          orderItems={orderItems}
          packingData={packingData}
          locale={locale as 'ru' | 'he'}
          onClose={() => {
            setShowWorkflowModal(false);
            setSelectedOrder(null);
            setOrderItems([]);
            setPackingData({});
          }}
          onComplete={() => {
            setShowWorkflowModal(false);
            setSelectedOrder(null);
            setOrderItems([]);
            setPackingData({});
            loadOrders(); // Refresh orders list
            message.success(
              locale === 'he' ? 
                '✅ ההזמנה הושלמה בהצלחה!' : 
                '✅ Заказ успешно завершен!'
            );
          }}
          onPack={async (packData) => {
            // Handle packing completion
            setPackingData(packData);
            console.log('Packing completed with data:', packData);
          }}
        />
      )} */}
    </div>
  );
};