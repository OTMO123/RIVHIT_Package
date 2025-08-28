import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, message, Spin } from 'antd';
import { 
  ContainerOutlined, 
  PrinterOutlined, 
  FileTextOutlined,
  ArrowRightOutlined,
  CheckCircleFilled
} from '@ant-design/icons';
import { AssemblyLineProgress, AssemblyStep } from './AssemblyLineProgress';
import { LabelPreview } from './LabelPreview';
import { InvoiceModal } from './InvoiceModal';
import { PackingBox, DeliveryRegion } from '@packing/shared';

interface PackingWorkflowModalProps {
  visible: boolean;
  orderId: string | number;
  orderNumber: string;
  customerName: string;
  customerData?: any;
  orderItems: any[];
  packingData: any;
  locale?: 'ru' | 'he';
  onClose: () => void;
  onComplete: () => void;
  onPack: (data: any) => Promise<void>;
}

type WorkflowStep = 'packing' | 'labels' | 'invoice';

export const PackingWorkflowModal: React.FC<PackingWorkflowModalProps> = ({
  visible,
  orderId,
  orderNumber,
  customerName,
  customerData,
  orderItems,
  packingData,
  locale = 'ru',
  onClose,
  onComplete,
  onPack
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('packing');
  const [stepIndex, setStepIndex] = useState(0);
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [labelsPrinted, setLabelsPrinted] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Define assembly line steps
  const assemblySteps: AssemblyStep[] = [
    {
      id: 'packing',
      title: 'Упаковка',
      titleHe: 'אריזה',
      icon: <ContainerOutlined style={{ fontSize: '24px', color: currentStep === 'packing' ? '#fff' : '#bfbfbf' }} />,
      status: stepIndex > 0 ? 'completed' : stepIndex === 0 ? 'active' : 'pending'
    },
    {
      id: 'labels',
      title: 'Этикетки',
      titleHe: 'תוויות',
      icon: <PrinterOutlined style={{ fontSize: '24px', color: currentStep === 'labels' ? '#fff' : '#bfbfbf' }} />,
      status: stepIndex > 1 ? 'completed' : stepIndex === 1 ? 'active' : 'pending'
    },
    {
      id: 'invoice',
      title: 'Счет-фактура',
      titleHe: 'חשבונית',
      icon: <FileTextOutlined style={{ fontSize: '24px', color: currentStep === 'invoice' ? '#fff' : '#bfbfbf' }} />,
      status: stepIndex > 2 ? 'completed' : stepIndex === 2 ? 'active' : 'pending'
    }
  ];

  // Update step index when currentStep changes
  useEffect(() => {
    const index = assemblySteps.findIndex(step => step.id === currentStep);
    setStepIndex(index);
  }, [currentStep]);

  // Handle packing completion
  const handlePackingComplete = async () => {
    setLoading(true);
    try {
      // Prepare boxes data from packing
      const packedBoxes: PackingBox[] = [];
      const packedItems = orderItems.filter(item => {
        const itemKey = item.unique_id || item.line_id || `${orderId}_L${item.line || item.item_id}`;
        return packingData[itemKey]?.isPacked;
      });

      // Group items into boxes (simplified logic - you can enhance this)
      let currentBox: PackingBox = {
        boxId: `${orderId}_box_1`,
        boxNumber: 1,
        orderId: orderId,
        items: [],
        isFull: false,
        isPrinted: false
      };

      packedItems.forEach((item, index) => {
        const itemKey = item.unique_id || item.line_id || `${orderId}_L${item.line || item.item_id}`;
        const packData = packingData[itemKey];
        
        currentBox.items.push({
          itemId: item.item_id,
          name: item.description || item.item_name,
          nameHebrew: item.description_hebrew || item.name_hebrew,
          nameRussian: item.description_russian || item.name_russian,
          quantity: packData.quantity || item.quantity,
          catalogNumber: item.catalog_number,
          barcode: item.barcode || item.sku,
          price: item.price || item.sale_nis || 0,
          sale_nis: item.sale_nis || item.price || 0
        });

        // Create new box every 10 items (you can adjust this logic)
        if ((index + 1) % 10 === 0 && index < packedItems.length - 1) {
          currentBox.isFull = true;
          packedBoxes.push(currentBox);
          currentBox = {
            boxId: `${orderId}_box_${packedBoxes.length + 1}`,
            boxNumber: packedBoxes.length + 1,
            orderId: orderId,
            items: [],
            isFull: false,
            isPrinted: false
          };
        }
      });

      // Add the last box
      if (currentBox.items.length > 0) {
        packedBoxes.push(currentBox);
      }

      setBoxes(packedBoxes);
      
      // Call the onPack callback
      await onPack(packingData);
      
      // Move to labels step with animation
      setTimeout(() => {
        setCurrentStep('labels');
        setShowLabelPreview(true);
      }, 500);
      
      message.success(locale === 'he' ? 'אריזה הושלמה!' : 'Упаковка завершена!');
    } catch (error) {
      console.error('Error completing packing:', error);
      message.error(locale === 'he' ? 'שגיאה בהשלמת האריזה' : 'Ошибка завершения упаковки');
    } finally {
      setLoading(false);
    }
  };

  // Handle labels printing completion
  const handleLabelsPrinted = () => {
    setLabelsPrinted(true);
    setShowLabelPreview(false);
    
    // Move to invoice step with animation
    setTimeout(() => {
      setCurrentStep('invoice');
      setShowInvoiceModal(true);
    }, 500);
    
    message.success(locale === 'he' ? 'תוויות הודפסו!' : 'Этикетки напечатаны!');
  };

  // Handle invoice creation completion
  const handleInvoiceCreated = () => {
    setInvoiceCreated(true);
    setShowInvoiceModal(false);
    
    // Show completion message
    message.success({
      content: locale === 'he' ? 
        '🎉 ההזמנה הושלמה בהצלחה!' : 
        '🎉 Заказ успешно завершен!',
      duration: 3,
      icon: <CheckCircleFilled style={{ color: '#52c41a' }} />
    });
    
    // Call completion callback after a delay
    setTimeout(() => {
      onComplete();
      onClose();
    }, 2000);
  };

  // Get current step content
  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 'packing':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <ContainerOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <h3>{locale === 'he' ? 'אריזת הפריטים' : 'Упаковка товаров'}</h3>
            <p style={{ marginBottom: 24 }}>
              {locale === 'he' 
                ? 'בחר את הפריטים שנארזו ולחץ על "סיום אריזה"' 
                : 'Выберите упакованные товары и нажмите "Завершить упаковку"'}
            </p>
            
            <div style={{ 
              background: '#f0f2f5', 
              padding: 16, 
              borderRadius: 8, 
              marginBottom: 24,
              maxHeight: 300,
              overflowY: 'auto' 
            }}>
              {orderItems.map((item, index) => {
                const itemKey = item.unique_id || item.line_id || `${orderId}_L${item.line || item.item_id}`;
                const isPacked = packingData[itemKey]?.isPacked;
                
                return (
                  <div 
                    key={itemKey} 
                    style={{ 
                      padding: 8, 
                      background: isPacked ? '#f6ffed' : '#fff',
                      border: isPacked ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                      borderRadius: 4,
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{item.description || item.item_name}</span>
                    <span style={{ color: isPacked ? '#52c41a' : '#8c8c8c' }}>
                      {isPacked ? '✓ Упакован' : 'Ожидает'}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <Button 
              type="primary" 
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={handlePackingComplete}
              loading={loading}
            >
              {locale === 'he' ? 'סיום אריזה' : 'Завершить упаковку'}
            </Button>
          </div>
        );
        
      case 'labels':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <PrinterOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <h3>{locale === 'he' ? 'הדפסת תוויות' : 'Печать этикеток'}</h3>
            <p>{locale === 'he' ? 'מכין תוויות להדפסה...' : 'Подготовка этикеток к печати...'}</p>
            {boxes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p>{locale === 'he' ? `${boxes.length} קופסאות מוכנות להדפסה` : `${boxes.length} коробок готово к печати`}</p>
              </div>
            )}
          </div>
        );
        
      case 'invoice':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <FileTextOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <h3>{locale === 'he' ? 'יצירת חשבונית' : 'Создание счета-фактуры'}</h3>
            <p>{locale === 'he' ? 'מכין חשבונית...' : 'Подготовка счета-фактуры...'}</p>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Modal
        title={null}
        visible={visible && !showLabelPreview && !showInvoiceModal}
        onCancel={onClose}
        width={800}
        footer={null}
        bodyStyle={{ padding: 0 }}
        closable={true}
        maskClosable={false}
      >
        <AssemblyLineProgress 
          currentStep={stepIndex}
          steps={assemblySteps}
          locale={locale}
        />
        
        <div style={{ minHeight: 400 }}>
          {getCurrentStepContent()}
        </div>
      </Modal>

      {/* Label Preview Modal */}
      {showLabelPreview && (
        <LabelPreview
          visible={showLabelPreview}
          orderId={orderId}
          boxes={boxes}
          region={DeliveryRegion.SOUTH1} // You can make this dynamic
          customerName={customerName}
          customerCity={customerData?.city}
          onPrint={handleLabelsPrinted}
          onCancel={() => {
            setShowLabelPreview(false);
            setCurrentStep('packing');
          }}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          visible={showInvoiceModal}
          orderId={orderId}
          orderNumber={orderNumber}
          boxes={boxes}
          customerName={customerName}
          customerData={customerData}
          onClose={() => {
            setShowInvoiceModal(false);
            setCurrentStep('labels');
          }}
          onInvoiceCreated={handleInvoiceCreated}
        />
      )}
    </>
  );
};