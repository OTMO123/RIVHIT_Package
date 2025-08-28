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
  InboxOutlined,
  FileDoneOutlined
} from '@ant-design/icons';
import { PackingItem } from '@packing/shared';
import { BoxLabelPrint } from './BoxLabelPrint';
import { PrinterSettings } from './PrinterSettings';

const { Text, Title } = Typography;

interface PrintActionsProps {
  orderId: string;
  items: PackingItem[];
  customerName?: string;
  customerCity?: string;
  customerData?: any; // Full customer data for invoice
  disabled?: boolean;
  onPrintComplete?: (jobId: string, type: 'shipping' | 'product' | 'box' | 'invoice') => void;
  orderNumber?: string; // Order number for invoice reference
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
  customerData,
  disabled = false,
  onPrintComplete,
  orderNumber
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [lastPrintJob, setLastPrintJob] = useState<string | null>(null);
  const [lastPrintError, setLastPrintError] = useState<string | null>(null);

  // Фильтруем только упакованные товары для печати
  const printableItems = items.filter(item => 
    item.isPacked && 
    item.isAvailable && 
    item.packedQuantity > 0
  );

  const handlePrintError = (error: string, context: string) => {
    console.error(`💥 [PRINT ERROR] ${context}:`, error);
    setLastPrintError(error);
    
    // Show error modal with printer settings button
    Modal.error({
      title: 'Ошибка печати',
      content: (
        <div>
          <Alert
            message="Не удалось напечатать этикетки"
            description={`${error}${context ? ` (${context})` : ''}`}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Text type="secondary">
            Возможные причины:
          </Text>
          <ul style={{ marginTop: 8, marginBottom: 16 }}>
            <li>Принтер выключен или недоступен</li>
            <li>Проблемы с сетевым подключением</li>
            <li>Неверные настройки принтера</li>
            <li>Проблемы с сетью или VPN</li>
          </ul>
        </div>
      ),
      okText: 'Настройки принтера',
      onOk: () => {
        console.log('🔧 [PRINT ERROR] Opening printer settings...');
        setShowPrinterSettings(true);
      }
    });
  };

  const checkPrinterStatus = async () => {
    console.log('🔍 [PRINTER STATUS] Checking printer status...');
    try {
      const response = await fetch('/api/print/status');
      const data = await response.json();
      
      console.log('📡 [PRINTER STATUS] Response:', data);
      
      if (data.success) {
        setPrinterStatus(data.status);
        console.log(`✅ [PRINTER STATUS] Status retrieved, isReady: ${data.status.isReady}`);
        return data.status.isReady;
      } else {
        console.error('❌ [PRINTER STATUS] Failed to get status:', data.error);
        handlePrintError(data.error || 'Не удалось проверить статус принтера', 'Проверка статуса');
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('💥 [PRINTER STATUS] Network error:', errorMsg);
      handlePrintError(`Ошибка подключения к принтеру: ${errorMsg}`, 'Сетевая ошибка');
      return false;
    }
  };

  const printShippingLabel = async () => {
    console.log('🏷️ [SHIPPING LABEL] Начинаем печать этикетки доставки...');
    console.log('📋 [SHIPPING LABEL] Параметры:', {
      orderId,
      customerName,
      printableItemsCount: printableItems.length,
      items: printableItems.map(item => ({ 
        id: item.item_id, 
        description: item.item_name,
        quantity: item.quantity 
      }))
    });

    if (printableItems.length === 0) {
      console.warn('⚠️ [SHIPPING LABEL] Нет товаров для печати');
      message.warning('Нет товаров для печати этикетки доставки');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 [SHIPPING LABEL] Проверяем статус принтера...');
      // Проверяем статус принтера
      const isReady = await checkPrinterStatus();
      console.log('📡 [SHIPPING LABEL] Статус принтера:', isReady);
      
      if (!isReady) {
        console.warn('⚠️ [SHIPPING LABEL] Принтер не готов, показываем подтверждение');
        Modal.confirm({
          title: 'Принтер не готов',
          content: 'Принтер не готов к печати. Продолжить?',
          onOk: () => {
            console.log('✅ [SHIPPING LABEL] Пользователь подтвердил печать');
            proceedWithShippingPrint();
          },
          onCancel: () => {
            console.log('❌ [SHIPPING LABEL] Пользователь отменил печать');
            setIsLoading(false);
          }
        });
        return;
      }

      console.log('✅ [SHIPPING LABEL] Принтер готов, продолжаем печать');
      await proceedWithShippingPrint();
    } catch (error) {
      console.error('🚨 [SHIPPING LABEL] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      message.error(`Ошибка при печати этикетки доставки: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log('🏁 [SHIPPING LABEL] Завершение печати этикетки');
      setIsLoading(false);
    }
  };

  const proceedWithShippingPrint = async () => {
    console.log('🚀 [SHIPPING PRINT] Отправляем запрос на печать этикетки...');
    
    const requestData = {
      orderId,
      customerName,
      items: printableItems,
      copies: 1
    };
    
    console.log('📦 [SHIPPING PRINT] Данные запроса:', requestData);
    
    try {
      console.log('🌐 [SHIPPING PRINT] Отправляем POST /api/print/shipping-label');
      
      const response = await fetch('/api/print/shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📡 [SHIPPING PRINT] Ответ сервера:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error('❌ [SHIPPING PRINT] HTTP ошибка:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 [SHIPPING PRINT] Данные ответа:', data);
      
      if (data.success) {
        console.log('✅ [SHIPPING PRINT] Печать успешна, jobId:', data.jobId);
        message.success('Этикетка доставки отправлена на печать');
        setLastPrintJob(data.jobId);
        onPrintComplete?.(data.jobId, 'shipping');
        
        // Обновляем статус заказа в RIVHIT API
        console.log('🔄 [SHIPPING PRINT] Обновляем статус заказа...');
        await updateOrderStatus('shipping_label_printed', data.jobId, 'shipping');
      } else {
        console.error('❌ [SHIPPING PRINT] Ошибка в ответе:', data.error);
        handlePrintError(data.error || 'Неизвестная ошибка печати', 'Печать этикетки доставки');
      }
    } catch (error) {
      console.error('🚨 [SHIPPING PRINT] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      handlePrintError(error instanceof Error ? error.message : String(error), 'Отправка на печать');
    }
  };

  const printProductLabels = async () => {
    console.log('🔥 [FRONTEND DEBUG] =====================================');
    console.log('🔥 [FRONTEND DEBUG] PRODUCT LABELS PRINT BUTTON CLICKED!');
    console.log('🔥 [FRONTEND DEBUG] This should be visible in browser console!');
    console.log('🔥 [FRONTEND DEBUG] =====================================');
    
    console.log('🔍 [PRODUCT PRINT] Checking printable items...');
    console.log('📋 [PRODUCT PRINT] All items:', items.length);
    console.log('📦 [PRODUCT PRINT] Filtered printable items:', printableItems.length);
    console.log('🔍 [PRODUCT PRINT] Items details:', items.map(item => ({
      id: item.item_id,
      isPacked: item.isPacked,
      isAvailable: item.isAvailable, 
      packedQuantity: item.packedQuantity,
      name: item.item_name
    })));
    
    if (printableItems.length === 0) {
      console.warn('⚠️ [PRODUCT PRINT] No printable items found');
      console.log('🔥 [FRONTEND DEBUG] About to show warning message...');
      message.warning('Нет товаров для печати этикеток. Убедитесь, что товары упакованы (isPacked=true, isAvailable=true, packedQuantity>0)');
      
      // Show detailed modal with printer settings button for debugging
      Modal.warning({
        title: 'Нет товаров для печати',
        content: (
          <div>
            <Alert
              message="Товары не готовы к печати"
              description={`Из ${items.length} товаров, 0 готовы к печати. Проверьте, что товары упакованы.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Text type="secondary">
              Требования для печати:
            </Text>
            <ul style={{ marginTop: 8, marginBottom: 16 }}>
              <li>isPacked = true (товар упакован)</li>
              <li>isAvailable = true (товар доступен)</li>
              <li>packedQuantity &gt; 0 (упакованное количество больше нуля)</li>
            </ul>
          </div>
        ),
        okText: 'Настройки принтера',
        onOk: () => {
          console.log('🔧 [PRODUCT PRINT] Opening printer settings for debugging...');
          setShowPrinterSettings(true);
        }
      });
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
    console.log('🔥 [FRONTEND DEBUG] =====================================');
    console.log('🔥 [FRONTEND DEBUG] PROCEEDING WITH PRODUCT PRINT!');
    console.log('🔥 [FRONTEND DEBUG] This means items are ready for printing!');
    console.log('🔥 [FRONTEND DEBUG] =====================================');
    
    console.log('🔍 [PRODUCT PRINT] Starting product labels print...');
    console.log('📋 [PRODUCT PRINT] Items to print:', printableItems.length);
    console.log('📦 [PRODUCT PRINT] Printable items details:', printableItems);
    
    try {
      const requestData = {
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
      };
      
      console.log('📦 [PRODUCT PRINT] Request data:', requestData);
      console.log('🌐 [PRODUCT PRINT] Using enhanced API service for comprehensive logging...');
      
      // Use enhanced API service to forward backend logs to frontend console
      const data = await fetch('/api/print/product-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      }).then(async (response) => {
        console.log('📡 [PRODUCT PRINT] Response status:', response.status);
        console.log('📡 [PRODUCT PRINT] Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📄 [PRODUCT PRINT] Raw response text:', responseText);
        
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ [PRODUCT PRINT] JSON parse error:', parseError);
          throw new Error('Invalid JSON response from server');
        }
        
        // Forward any backend debug logs to frontend console
        if (data.debug) {
          console.log('🔍 [BACKEND DEBUG] Debug info from server:', data.debug);
        }
        
        if (data.logs && Array.isArray(data.logs)) {
          console.log('🔍 [BACKEND LOGS] Server logs:');
          data.logs.forEach((log: any, index: number) => {
            console.log(`🔍 [BACKEND LOG ${index + 1}]`, log);
          });
        }
        
        if (!response.ok) {
          console.error('❌ [PRODUCT PRINT] HTTP error:', response.status, data);
          throw new Error(`HTTP ${response.status}: ${data?.error || response.statusText}`);
        }
        
        return data;
      });
      
      console.log('📦 [PRODUCT PRINT] Final response data:', data);
      
      if (data.success) {
        console.log('✅ [PRODUCT PRINT] Print job successful');
        message.success(`Этикетки товаров отправлены на печать (${data.printedItems} шт.)`);
        setLastPrintJob(data.jobId);
        onPrintComplete?.(data.jobId, 'product');
        
        // Обновляем статус заказа в RIVHIT API
        console.log('🔄 [PRODUCT PRINT] Updating order status...');
        await updateOrderStatus('product_labels_printed', data.jobId, 'product');
      } else {
        console.error('❌ [PRODUCT PRINT] Error in response:', data.error);
        handlePrintError(data.error || 'Неизвестная ошибка печати', 'Печать этикеток товаров');
      }
    } catch (error) {
      console.error('🚨 [PRODUCT PRINT] Critical error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Ensure error modal appears with printer settings button
      handlePrintError(
        error instanceof Error ? error.message : 'Ошибка сети',
        'Печать этикеток товаров'
      );
    }
  };

  const testPrint = async () => {
    console.log('🖨️ [TEST PRINT] Начинаем тестовую печать...');
    console.log('📋 [TEST PRINT] Текущие параметры:', {
      orderId,
      customerName,
      itemsCount: items.length,
      disabled
    });
    
    setIsLoading(true);
    try {
      console.log('🌐 [TEST PRINT] Отправляем запрос на /api/print/test');
      
      const response = await fetch('/api/print/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📡 [TEST PRINT] Ответ сервера:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error('❌ [TEST PRINT] HTTP ошибка:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 [TEST PRINT] Данные ответа:', data);
      
      if (data.success) {
        console.log('✅ [TEST PRINT] Тестовая печать успешна');
        message.success('Тестовая печать отправлена');
      } else {
        console.error('❌ [TEST PRINT] Ошибка в ответе:', data.error);
        handlePrintError(data.error || 'Неизвестная ошибка тестовой печати', 'Тестовая печать');
      }
    } catch (error) {
      console.error('🚨 [TEST PRINT] Критическая ошибка:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      handlePrintError(
        error instanceof Error ? error.message : 'Ошибка сети',
        'Тестовая печать'
      );
    } finally {
      console.log('🏁 [TEST PRINT] Завершение тестовой печати');
      setIsLoading(false);
    }
  };

  // Создание счета-фактуры (חשבונית)
  const createInvoice = async () => {
    console.log('🔵 [FRONTEND] Starting invoice creation');
    console.log('📋 Available data:', {
      orderNumber,
      orderId,
      customerName,
      customerData,
      printableItems_count: printableItems.length,
      printableItems
    });

    if (printableItems.length === 0) {
      message.warning('Нет товаров для создания счета-фактуры');
      return;
    }

    if (!orderNumber) {
      console.error('❌ No order number provided');
      message.error('Не указан номер заказа');
      return;
    }

    Modal.confirm({
      title: 'Создание счета-фактуры (חשבונית)',
      content: (
        <Space direction="vertical">
          <Text>Будет создан счет-фактура для заказа {orderNumber}</Text>
          <Text type="secondary">Товаров: {printableItems.length}</Text>
          <Text type="secondary">
            Общее количество: {printableItems.reduce((sum, item) => sum + item.packedQuantity, 0)}
          </Text>
        </Space>
      ),
      okText: 'Создать חשבונית',
      cancelText: 'Отмена',
      onOk: async () => {
        setIsLoading(true);
        try {
          // Подготавливаем данные для создания счета
          const invoiceItems = printableItems.map(item => {
            const invoiceItem = {
              item_id: item.item_id,
              item_name: item.item_name || item.item_extended_description || 'Unknown Item',
              quantity: item.packedQuantity, // Используем фактически упакованное количество
              price: item.sale_nis || (item as any).price || 0,
              cost_nis: item.cost_nis || 0
            };
            console.log('📦 Prepared item:', invoiceItem);
            return invoiceItem;
          });

          const cleanOrderNumber = orderNumber.replace(/[^\d]/g, ''); // Только цифры
          
          const requestData = {
            orderNumber: cleanOrderNumber,
            items: invoiceItems,
            customerData: customerData || { 
              customer_id: orderId,
              customer_name: customerName 
            }
          };

          console.log('📡 [FRONTEND] Sending request to backend:', JSON.stringify(requestData, null, 2));

          const response = await fetch('/api/invoices/create-from-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });

          const data = await response.json();
          
          if (data.success) {
            message.success('Счет-фактура (חשבונית) успешно создан!');
            onPrintComplete?.('invoice_created', 'invoice');
            
            // Автоматически печатаем этикетки после создания счета
            Modal.confirm({
              title: 'Печать этикеток',
              content: 'Счет создан. Напечатать этикетки для товаров?',
              okText: 'Печать',
              cancelText: 'Позже',
              onOk: () => printProductLabels()
            });
          } else if (data.preparedData) {
            // Если запись отключена, показываем подготовленные данные
            Modal.info({
              title: 'Данные для счета-фактуры подготовлены',
              content: (
                <div>
                  <Alert 
                    message="Создание счетов отключено в безопасном режиме" 
                    description={data.enableWrites}
                    type="warning"
                    showIcon
                  />
                  <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                    {JSON.stringify(data.preparedData, null, 2)}
                  </pre>
                </div>
              ),
              width: 600
            });
          } else {
            message.error(`Ошибка создания счета: ${data.error}`);
          }
        } catch (error) {
          console.error('Error creating invoice:', error);
          message.error('Ошибка при создании счета-фактуры');
        } finally {
          setIsLoading(false);
        }
      }
    });
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
            <Tooltip title="Создать счет-фактуру (חשבונית) и затем печатать">
              <Button
                type="primary"
                icon={<FileDoneOutlined />}
                onClick={createInvoice}
                loading={isLoading}
                disabled={disabled || printableItems.length === 0}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Создать חשבונית
              </Button>
            </Tooltip>

            <Divider type="vertical" />

            <Tooltip title="Печать этикетки доставки для всего заказа">
              <Button
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

            <Tooltip title="Создать счет-фактуру (חשבונית) и сохранить в RIVHIT">
              <Button
                type="primary"
                danger
                icon={<FileDoneOutlined />}
                onClick={createInvoice}
                loading={isLoading}
                disabled={disabled || printableItems.length === 0}
              >
                Создать חשבונית
              </Button>
            </Tooltip>

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

      {/* Модальное окно настроек принтера */}
      <Modal
        title="Настройки принтера"
        open={showPrinterSettings}
        onCancel={() => setShowPrinterSettings(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <PrinterSettings
          onSave={(config) => {
            console.log('🔧 [PRINTER SETTINGS] Settings saved:', config);
            message.success('Настройки принтера сохранены');
            setShowPrinterSettings(false);
            // Можно перезапустить проверку статуса после изменения настроек
            setTimeout(() => checkPrinterStatus(), 1000);
          }}
        />
      </Modal>
    </>
  );
};