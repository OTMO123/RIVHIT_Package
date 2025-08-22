import React, { useState } from 'react';
import { 
  Button, 
  Space, 
  Modal, 
  message, 
  Typography, 
  Card,
  Spin,
  Alert,
  Descriptions,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import { 
  PrinterOutlined, 
  FileTextOutlined, 
  BarcodeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { PackingItem } from '@packing/shared';
import { BoxLabelPrint } from './BoxLabelPrint';

const { Text, Title } = Typography;

interface PrintActionsProps {
  orderId: string;
  items: PackingItem[];
  customerName?: string;
  customerCity?: string;
  disabled?: boolean;
  onPrintComplete?: (jobId: string, type: 'shipping' | 'product' | 'box') => void;
}

interface PrinterStatus {
  connected: boolean;
  model: string;
  paperLevel: number;
  ribbonLevel: number;
  temperature: number;
  isReady: boolean;
  lastError?: string;
}

export const PrintActions: React.FC<PrintActionsProps> = ({
  orderId,
  items,
  customerName = 'לקוח',
  customerCity,
  disabled = false,
  onPrintComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lastPrintJob, setLastPrintJob] = useState<string | null>(null);

  // Фильтруем только упакованные товары для печати
  const printableItems = items.filter(item => 
    item.isPacked && 
    item.isAvailable && 
    item.packedQuantity > 0
  );

  const checkPrinterStatus = async () => {
    try {
      const response = await fetch('/api/print/status');
      const data = await response.json();
      
      if (data.success) {
        setPrinterStatus(data.status);
        return data.status.isReady;
      } else {
        message.error('Не удалось проверить статус принтера');
        return false;
      }
    } catch (error) {
      message.error('Ошибка подключения к принтеру');
      return false;
    }
  };

  const printShippingLabel = async () => {
    if (printableItems.length === 0) {
      message.warning('Нет товаров для печати этикетки доставки');
      return;
    }

    setIsLoading(true);
    try {
      // Проверяем статус принтера
      const isReady = await checkPrinterStatus();
      if (!isReady) {
        Modal.confirm({
          title: 'Принтер не готов',
          content: 'Принтер не готов к печати. Продолжить?',
          onOk: () => proceedWithShippingPrint(),
          onCancel: () => setIsLoading(false)
        });
        return;
      }

      await proceedWithShippingPrint();
    } catch (error) {
      console.error('Error printing shipping label:', error);
      message.error('Ошибка при печати этикетки доставки');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithShippingPrint = async () => {
    try {
      const response = await fetch('/api/print/shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          customerName,
          items: printableItems,
          copies: 1
        })
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Этикетка доставки отправлена на печать');
        setLastPrintJob(data.jobId);
        onPrintComplete?.(data.jobId, 'shipping');
        
        // Обновляем статус заказа в RIVHIT API
        await updateOrderStatus('shipping_label_printed', data.jobId, 'shipping');
      } else {
        message.error(`Ошибка печати: ${data.error}`);
      }
    } catch (error) {
      message.error('Ошибка при отправке на печать');
    }
  };

  const printProductLabels = async () => {
    if (printableItems.length === 0) {
      message.warning('Нет товаров для печати этикеток');
      return;
    }

    setIsLoading(true);
    try {
      // Проверяем статус принтера
      const isReady = await checkPrinterStatus();
      if (!isReady) {
        Modal.confirm({
          title: 'Принтер не готов',
          content: 'Принтер не готов к печати. Продолжить?',
          onOk: () => proceedWithProductPrint(),
          onCancel: () => setIsLoading(false)
        });
        return;
      }

      await proceedWithProductPrint();
    } catch (error) {
      console.error('Error printing product labels:', error);
      message.error('Ошибка при печати этикеток товаров');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithProductPrint = async () => {
    try {
      const response = await fetch('/api/print/product-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          items: printableItems,
          options: {
            copies: 1,
            labelSize: 'medium',
            includeBarcodes: true,
            includeText: true,
            includeQuantity: true,
            includePrices: true
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        message.success(`Этикетки товаров отправлены на печать (${data.printedItems} шт.)`);
        setLastPrintJob(data.jobId);
        onPrintComplete?.(data.jobId, 'product');
        
        // Обновляем статус заказа в RIVHIT API
        await updateOrderStatus('product_labels_printed', data.jobId, 'product');
      } else {
        message.error(`Ошибка печати: ${data.error}`);
      }
    } catch (error) {
      message.error('Ошибка при отправке на печать');
    }
  };

  const testPrint = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/print/test', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('Тестовая печать отправлена');
      } else {
        message.error(`Ошибка тестовой печати: ${data.error}`);
      }
    } catch (error) {
      message.error('Ошибка при тестовой печати');
    } finally {
      setIsLoading(false);
    }
  };

  const showPrinterStatus = async () => {
    await checkPrinterStatus();
    setShowStatusModal(true);
  };

  const getStatusBadge = (status: PrinterStatus) => {
    if (!status.connected) {
      return <Badge status="error" text="Не подключен" />;
    }
    if (!status.isReady) {
      return <Badge status="warning" text="Не готов" />;
    }
    return <Badge status="success" text="Готов к печати" />;
  };

  const getLevelColor = (level: number) => {
    if (level < 20) return '#ff4d4f';
    if (level < 50) return '#faad14';
    return '#52c41a';
  };

  // Обновление статуса заказа в RIVHIT API
  const updateOrderStatus = async (status: string, jobId: string, printType: 'shipping' | 'product') => {
    try {
      const packingData = {
        packedItems: printableItems.map(item => ({
          item_id: item.item_id,
          packed_quantity: item.packedQuantity,
          notes: item.notes,
          reason: item.reason
        })),
        packer: 'system', // Можно заменить на текущего пользователя
        packaging_date: new Date().toISOString(),
        print_jobs: [{
          job_id: jobId,
          type: printType,
          timestamp: new Date().toISOString()
        }]
      };

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          packingData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`Order status updated: ${status}`);
      } else {
        console.warn('Failed to update order status, will retry later:', data.error);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Не показываем ошибку пользователю, так как печать уже прошла успешно
    }
  };

  return (
    <>
      <Card 
        title={
          <Space>
            <PrinterOutlined />
            <Text strong>Печать этикеток</Text>
            <Text type="secondary">({printableItems.length} товаров готово)</Text>
          </Space>
        }
        size="small"
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={showPrinterStatus}
            type="text"
          >
            Статус принтера
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {printableItems.length === 0 && (
            <Alert
              message="Нет товаров для печати"
              description="Выберите и отметьте товары для печати этикеток"
              type="warning"
              showIcon
            />
          )}
          
          <Space wrap>
            <Tooltip title="Печать этикетки доставки для всего заказа">
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={printShippingLabel}
                loading={isLoading}
                disabled={disabled || printableItems.length === 0}
              >
                Этикетка доставки
              </Button>
            </Tooltip>

            <Tooltip title="Печать этикеток для каждого товара отдельно">
              <Button
                icon={<BarcodeOutlined />}
                onClick={printProductLabels}
                loading={isLoading}
                disabled={disabled || printableItems.length === 0}
              >
                Этикетки товаров ({printableItems.length})
              </Button>
            </Tooltip>

            <Divider type="vertical" />

            <BoxLabelPrint
              orderId={orderId}
              items={printableItems}
              customerName={customerName}
              customerCity={customerCity}
              onPrintComplete={(success) => {
                if (success) {
                  message.success('Этикетки коробок успешно напечатаны');
                  onPrintComplete?.('box_labels', 'box');
                }
              }}
            />

            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={testPrint}
              loading={isLoading}
              disabled={disabled}
              type="text"
            >
              Тест
            </Button>
          </Space>

          {lastPrintJob && (
            <Alert
              message={`Последнее задание печати: ${lastPrintJob}`}
              type="info"
              closable
              onClose={() => setLastPrintJob(null)}
            />
          )}
        </Space>
      </Card>

      {/* Модальное окно статуса принтера */}
      <Modal
        title="Статус принтера GoDEX ZX420"
        open={showStatusModal}
        onCancel={() => setShowStatusModal(false)}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={checkPrinterStatus}>
            Обновить
          </Button>,
          <Button key="close" onClick={() => setShowStatusModal(false)}>
            Закрыть
          </Button>
        ]}
        width={600}
      >
        {printerStatus ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered size="small">
              <Descriptions.Item label="Статус" span={3}>
                {getStatusBadge(printerStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="Модель">
                {printerStatus.model}
              </Descriptions.Item>
              <Descriptions.Item label="Температура">
                {printerStatus.temperature}°C
              </Descriptions.Item>
              <Descriptions.Item label="Подключение">
                {printerStatus.connected ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Уровень бумаги">
                <Text style={{ color: getLevelColor(printerStatus.paperLevel) }}>
                  {printerStatus.paperLevel}%
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Уровень ленты">
                <Text style={{ color: getLevelColor(printerStatus.ribbonLevel) }}>
                  {printerStatus.ribbonLevel}%
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {printerStatus.lastError && (
              <Alert
                message="Последняя ошибка"
                description={printerStatus.lastError}
                type="error"
                showIcon
              />
            )}

            {!printerStatus.isReady && (
              <Alert
                message="Принтер не готов к печати"
                description="Проверьте подключение, уровень бумаги и ленты"
                type="warning"
                showIcon
              />
            )}
          </Space>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin tip="Проверка статуса принтера..." />
          </div>
        )}
      </Modal>
    </>
  );
};