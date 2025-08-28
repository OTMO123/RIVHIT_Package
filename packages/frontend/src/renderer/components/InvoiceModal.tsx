import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Space, 
  Typography, 
  message, 
  Alert,
  Descriptions,
  Divider,
  Spin
} from 'antd';
import { 
  FileDoneOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { PackingBox } from '@packing/shared';
import { SimpleProgressSteps } from './SimpleProgressSteps';

const { Title, Text } = Typography;

interface InvoiceModalProps {
  visible: boolean;
  orderId: string | number;
  orderNumber: string;
  boxes: PackingBox[];
  customerName: string;
  customerData?: any;
  onClose: () => void;
  onInvoiceCreated?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  visible,
  orderId,
  orderNumber,
  boxes,
  customerName,
  customerData,
  onClose,
  onInvoiceCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);

  // Собираем все товары из всех коробок
  const allItems = boxes.flatMap(box => box.items);
  const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = allItems.reduce((sum, item) => sum + (item.quantity * (item.price || item.sale_nis || 0)), 0);

  const createInvoice = async () => {
    setLoading(true);
    try {
      // Подготавливаем данные для создания счета
      const invoiceItems = allItems.map(item => ({
        item_id: item.itemId,
        item_name: item.name || item.nameHebrew || 'Unknown Item',
        quantity: item.quantity,
        price: item.price || item.sale_nis || 0,
        cost_nis: item.cost_nis || 0,
        barcode: item.barcode,
        catalogNumber: item.catalogNumber
      }));

      const cleanOrderNumber = orderNumber.replace(/[^\d]/g, ''); // Только цифры
      
      const requestData = {
        orderNumber: cleanOrderNumber,
        items: invoiceItems,
        customer_id: customerData?.customer_id // Отправляем только customer_id напрямую
      };

      console.log('📡 Sending invoice request:', requestData);

      const response = await fetch('http://localhost:3001/api/invoices/create-from-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Счет-фактура (חשבונית) успешно создан!');
        setInvoiceCreated(true);
        onInvoiceCreated?.();
        
        // Закрываем модал через 2 секунды после успешного создания
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        message.error(`Ошибка создания счета: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      message.error('Ошибка при создании счета-фактуры');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 20, fontWeight: 600 }}>
            Заказ #{orderNumber}
          </div>
          <SimpleProgressSteps
            steps={[
              {
                key: 'packing',
                title: 'Упаковка',
                titleHe: 'אריזה',
                status: 'completed' as const
              },
              {
                key: 'labels',
                title: 'Этикетки',
                titleHe: 'תוויות',
                status: 'completed' as const
              },
              {
                key: 'invoice',
                title: 'Счет',
                titleHe: 'חשבונית',
                status: invoiceCreated ? 'completed' : 'active' as const
              }
            ]}
            locale={'ru'}
            onStepClick={(stepKey) => {
              // Navigation is handled by parent component
              console.log('Navigate to step:', stepKey);
            }}
          />
        </div>
      }
      visible={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Отмена
        </Button>,
        <Button
          key="create"
          type="primary"
          icon={<FileTextOutlined />}
          onClick={createInvoice}
          loading={loading}
          disabled={invoiceCreated}
          style={{ 
            backgroundColor: invoiceCreated ? '#52c41a' : undefined,
            borderColor: invoiceCreated ? '#52c41a' : undefined
          }}
        >
          {invoiceCreated ? 'Счет создан' : 'Создать חשבונית'}
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Заказ успешно упакован!"
          description="Этикетки коробок напечатаны. Теперь создайте счет-фактуру для завершения заказа."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />

        <Divider />

        <Descriptions title="Информация о заказе" bordered size="small">
          <Descriptions.Item label="Номер заказа" span={3}>
            <Text strong style={{ fontSize: '16px' }}>#{orderNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Клиент" span={3}>
            {customerName}
          </Descriptions.Item>
          <Descriptions.Item label="Коробок">
            {boxes.length}
          </Descriptions.Item>
          <Descriptions.Item label="Товаров">
            {allItems.length}
          </Descriptions.Item>
          <Descriptions.Item label="Количество">
            {totalQuantity} шт
          </Descriptions.Item>
          <Descriptions.Item label="Общая сумма" span={3}>
            <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
              ₪{totalAmount.toFixed(2)}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" tip="Создание счета-фактуры..." />
          </div>
        )}

        {invoiceCreated && (
          <Alert
            message="Счет-фактура создан!"
            description="Документ успешно сохранен в системе RIVHIT."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}

        <Alert
          message="Следующий шаг"
          description="После создания счета-фактуры заказ будет полностью завершен и готов к отправке."
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  );
};