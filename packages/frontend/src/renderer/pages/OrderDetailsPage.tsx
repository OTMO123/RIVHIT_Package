import React, { useEffect, useState } from 'react';
import { 
  Layout, 
  Card, 
  Typography, 
  Descriptions, 
  Button, 
  Space, 
  Tag, 
  Alert,
  Divider,
  Row,
  Col,
  Statistic
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrdersStore } from '../store/orders.store';
import { RivhitItem, DocumentStatus, DocumentType, PackingItem, RivhitConverter } from '@packing/shared';
import { ItemSelector } from '../components/ItemSelector';
import { PrintActions } from '../components/PrintActions';
import { apiService } from '../services/api.service';

const { Content } = Layout;
const { Title, Text } = Typography;

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = id ? parseInt(id) : 0;
  const { 
    selectedOrder, 
    orderItems, 
    orderCustomer, 
    loading, 
    error,
    selectOrder 
  } = useOrdersStore();

  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [allItemsPacked, setAllItemsPacked] = useState(false);
  const [splitOrderItems, setSplitOrderItems] = useState<RivhitItem[]>([]);

  // Helper function to split items based on max capacity
  const splitItemsByMaxCapacity = async (items: RivhitItem[]): Promise<RivhitItem[]> => {
    console.group('🔄 Starting item splitting process for OrderDetailsPage');
    console.log(`📋 Processing ${items.length} items for potential splitting`);
    
    const splitItems: RivhitItem[] = [];
    let totalSplits = 0;
    
    // Fetch max per box settings
    const maxSettings = await apiService.getMaxPerBoxSettings();
    console.log('📦 Max per box settings loaded:', maxSettings?.length || 0, 'settings');
    
    for (const item of items) {
      const catalogNumber = (item as any).catalog_number || item.item_part_num;
      
      // Find max capacity for this catalog number
      const maxSetting = maxSettings?.find(s => 
        s.catalogNumber === catalogNumber || 
        s.rivhitId === item.item_id
      );
      
      const maxCapacity = maxSetting?.maxQuantity;
      
      if (maxCapacity && item.quantity > maxCapacity) {
        // Item needs to be split
        const fullBoxes = Math.floor(item.quantity / maxCapacity);
        const remainder = item.quantity % maxCapacity;
        const totalBoxes = fullBoxes + (remainder > 0 ? 1 : 0);
        
        console.log(`✂️ Splitting item ${catalogNumber}: ${item.quantity} units into ${totalBoxes} boxes (max: ${maxCapacity})`);
        
        // Create rows for full boxes
        for (let i = 0; i < fullBoxes; i++) {
          const splitItem: RivhitItem = {
            ...item,
            quantity: maxCapacity,
            original_quantity: item.quantity,
            max_per_box: maxCapacity,
            is_split: true,
            split_index: i + 1,
            split_total: totalBoxes,
            unique_id: `${(item as any).line_id || item.item_id}_split_${i + 1}`,
            item_id: item.item_id, // Ensure item_id is preserved for split items
            line_id: (item as any).line_id || item.item_id, // Keep original line_id for reference
            catalog_number: (item as any).catalog_number || item.item_part_num, // Preserve catalog_number
            box_label: `Box ${i + 1}/${totalBoxes}`
          } as any;
          splitItems.push(splitItem);
        }
        
        // Create row for remainder if exists
        if (remainder > 0) {
          const remainderItem: RivhitItem = {
            ...item,
            quantity: remainder,
            original_quantity: item.quantity,
            max_per_box: maxCapacity,
            is_split: true,
            split_index: fullBoxes + 1,
            split_total: totalBoxes,
            unique_id: `${(item as any).line_id || item.item_id}_split_${fullBoxes + 1}`,
            item_id: item.item_id, // Ensure item_id is preserved for split items
            line_id: (item as any).line_id || item.item_id,
            catalog_number: (item as any).catalog_number || item.item_part_num, // Preserve catalog_number
            box_label: `Box ${fullBoxes + 1}/${totalBoxes} (Partial)`
          } as any;
          splitItems.push(remainderItem);
        }
        
        totalSplits++;
      } else {
        // Item fits in one box or no max capacity defined
        splitItems.push({
          ...item,
          is_split: false,
          original_quantity: item.quantity,
          unique_id: (item as any).line_id || item.item_id,
          item_id: item.item_id, // Ensure item_id is preserved
          line_id: (item as any).line_id || item.item_id,
          catalog_number: (item as any).catalog_number || item.item_part_num
        } as any);
      }
    }
    
    console.log(`📈 Splitting complete: ${items.length} items → ${splitItems.length} rows`);
    console.groupEnd();
    return splitItems;
  };

  useEffect(() => {
    if (orderId) {
      selectOrder(orderId);
    }
  }, [orderId, selectOrder]);

  // Split items when orderItems change
  useEffect(() => {
    const processSplitItems = async () => {
      if (orderItems && orderItems.length > 0) {
        const split = await splitItemsByMaxCapacity(orderItems);
        setSplitOrderItems(split);
      }
    };
    processSplitItems();
  }, [orderItems]);

  useEffect(() => {
    const packedCount = packingItems.filter(item => item.isPacked && item.isAvailable).length;
    const availableCount = packingItems.filter(item => item.isAvailable).length;
    setAllItemsPacked(availableCount > 0 && packedCount === availableCount);
  }, [packingItems]);

  const handleItemsChange = (items: PackingItem[]) => {
    setPackingItems(items);
  };

  const getDocumentTypeText = (type: DocumentType): string => {
    switch (type) {
      case DocumentType.QUOTE: return 'הצעת מחיר';
      case DocumentType.ORDER: return 'הזמנה';
      case DocumentType.DELIVERY_NOTE: return 'תעודת משלוח';
      case DocumentType.INVOICE: return 'חשבונית';
      case DocumentType.RECEIPT: return 'קבלה';
      case DocumentType.CREDIT_NOTE: return 'זיכוי';
      case DocumentType.RETURN: return 'החזרה';
      default: return 'לא ידוע';
    }
  };

  const getStatusText = (status: DocumentStatus): string => {
    switch (status) {
      case DocumentStatus.DRAFT: return 'טיוטה';
      case DocumentStatus.PENDING: return 'ממתין';
      case DocumentStatus.APPROVED: return 'מאושר';
      case DocumentStatus.IN_PROGRESS: return 'בטיפול';
      case DocumentStatus.PACKED: return 'ארוז';
      case DocumentStatus.READY_FOR_DELIVERY: return 'מוכן למשלוח';
      case DocumentStatus.DELIVERED: return 'נמסר';
      case DocumentStatus.CANCELLED: return 'בוטל';
      case DocumentStatus.RETURNED: return 'הוחזר';
      default: return 'לא ידוע';
    }
  };

  const getStatusColor = (status: DocumentStatus): string => {
    switch (status) {
      case DocumentStatus.PENDING: return 'blue';
      case DocumentStatus.APPROVED: return 'green';
      case DocumentStatus.IN_PROGRESS: return 'orange';
      case DocumentStatus.PACKED: return 'purple';
      case DocumentStatus.READY_FOR_DELIVERY: return 'cyan';
      case DocumentStatus.DELIVERED: return 'success';
      case DocumentStatus.CANCELLED: return 'red';
      case DocumentStatus.RETURNED: return 'volcano';
      default: return 'default';
    }
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      const packingData = {
        packedItems: packingItems
          .filter(item => item.isPacked && item.isAvailable)
          .map(item => ({
            item_id: item.item_id,
            packed_quantity: item.packedQuantity || item.quantity,
            notes: item.notes,
            reason: item.reason
          })),
        packer: 'user', // Можно заменить на текущего пользователя
        packaging_date: new Date().toISOString()
      };

      const response = await fetch(`/api/orders/${selectedOrder.document_number}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PACKED',
          packingData
        })
      });

      if (response.ok) {
        console.log('Order status updated to PACKED');
        // Можно добавить уведомление об успехе
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handlePrintComplete = (jobId: string, type: 'shipping' | 'product' | 'box') => {
    console.log(`Print completed: ${type} job ${jobId} for order ${selectedOrder?.document_number}`);
  };


  if (loading.selectedOrder || loading.items || loading.customer) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>טוען...</div>;
  }

  if (error) {
    return (
      <Alert
        message="שגיאה"
        description={error}
        type="error"
        showIcon
        style={{ margin: '24px' }}
      />
    );
  }

  if (!selectedOrder) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>הזמנה לא נמצאה</Text>
      </div>
    );
  }

  const packedItemsCount = packingItems.filter(item => item.isPacked && item.isAvailable).length;
  const availableItemsCount = packingItems.filter(item => item.isAvailable).length;
  const totalValue = packingItems
    .filter(item => item.isAvailable)
    .reduce((sum, item) => sum + (item.sale_nis * Math.abs(item.quantity)), 0);

  return (
    <Layout style={{ height: '100vh', direction: 'rtl' }}>
      <Content style={{ padding: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/')}
              size="large"
            >
              חזרה לרשימה
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              הזמנה #{selectedOrder.document_number}
            </Title>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleCompleteOrder}
                disabled={!allItemsPacked}
                style={{ backgroundColor: allItemsPacked ? '#52c41a' : undefined }}
              >
                סיום אריזה
              </Button>
            </Space>
          </div>

          {/* Status and Statistics */}
          <Row gutter={16}>
            <Col span={18}>
              <Card>
                <Descriptions title="פרטי הזמנה" column={3} bordered>
                  <Descriptions.Item label="סוג מסמך">
                    <Tag color="blue">{getDocumentTypeText(selectedOrder.document_type)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="סטטוס">
                    <Tag color={getStatusColor(selectedOrder.status!)}>
                      {getStatusText(selectedOrder.status!)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="תאריך הנפקה">
                    {new Date(selectedOrder.issue_date).toLocaleDateString('he-IL')}
                  </Descriptions.Item>
                  <Descriptions.Item label="תאריך יעד">
                    {selectedOrder.due_date ? 
                      new Date(selectedOrder.due_date).toLocaleDateString('he-IL') : 
                      'לא צוין'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="סכום כולל">
                    ₪{selectedOrder.total_amount?.toFixed(2) || '0.00'}
                  </Descriptions.Item>
                  <Descriptions.Item label="הערות">
                    {selectedOrder.comments || 'אין הערות'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="התקדמות אריזה"
                  value={packedItemsCount}
                  suffix={`/ ${availableItemsCount}`}
                  prefix={<CheckOutlined />}
                  valueStyle={{ color: allItemsPacked ? '#3f8600' : '#1890ff' }}
                />
                <Divider />
                <Statistic
                  title="ערך פריטים זמינים"
                  value={totalValue}
                  precision={2}
                  prefix="₪"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Customer Information */}
          {orderCustomer && (
            <Card title="פרטי לקוח">
              <Descriptions column={2}>
                <Descriptions.Item label="שם">
                  {orderCustomer.first_name} {orderCustomer.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="טלפון">
                  {orderCustomer.phone}
                </Descriptions.Item>
                <Descriptions.Item label="כתובת">
                  {orderCustomer.address}, {orderCustomer.city}
                </Descriptions.Item>
                <Descriptions.Item label="אימייל">
                  {orderCustomer.email || 'לא צוין'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Print Actions */}
          {packingItems.length > 0 && (
            <PrintActions
              orderId={selectedOrder.document_number?.toString() || '0'}
              items={packingItems}
              customerName={orderCustomer ? `${orderCustomer.first_name} ${orderCustomer.last_name}` : undefined}
              onPrintComplete={handlePrintComplete}
            />
          )}

          {/* Items Selection */}
          {splitOrderItems.length > 0 && (
            <ItemSelector
              items={splitOrderItems}
              onItemsChange={handleItemsChange}
              showSummary={true}
              showPrintActions={false} // Уже есть PrintActions выше
              orderId={selectedOrder.document_number?.toString() || '0'}
              customerName={orderCustomer ? `${orderCustomer.first_name} ${orderCustomer.last_name}` : undefined}
            />
          )}

          {/* Completion Status */}
          {allItemsPacked && (
            <Alert
              message="כל הפריטים הזמינים ארוזים!"
              description="ניתן כעת להדפיס תוויות ולסיים את תהליך האריזה. השתמש בלוח הבקרה של ההדפסה למעלה להדפסת תוויות."
              type="success"
              showIcon
              action={
                <Button size="small" type="primary" onClick={handleCompleteOrder}>
                  סיום אריזה
                </Button>
              }
            />
          )}
        </Space>

      </Content>
    </Layout>
  );
};