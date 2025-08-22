import React, { useState } from 'react';
import { Modal, Row, Col, Card, Button, Space, Typography, Badge, Spin, message, Image } from 'antd';
import { PrinterOutlined, InboxOutlined, CheckCircleOutlined, ZoomInOutlined } from '@ant-design/icons';
import { PackingBox, DeliveryRegion } from '@packing/shared';
import { apiService } from '../services/api.service';

const { Title, Text } = Typography;

interface LabelPreviewProps {
  visible: boolean;
  orderId: string | number;
  boxes: PackingBox[];
  region: DeliveryRegion;
  customerName: string;
  customerCity?: string;
  onPrint: () => void;
  onCancel: () => void;
}

interface GeneratedLabel {
  boxNumber: number;
  imageData: string;
  preview: string;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({
  visible,
  orderId,
  boxes,
  region,
  customerName,
  customerCity,
  onPrint,
  onCancel
}) => {
  const [labels, setLabels] = useState<GeneratedLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ [key: number]: boolean }>({});

  // Генерация всех этикеток при открытии
  React.useEffect(() => {
    if (visible && boxes.length > 0) {
      generateAllLabels();
    }
  }, [visible, boxes]);

  // Сортируем коробки один раз для использования во всем компоненте
  const sortedBoxes = React.useMemo(() => 
    [...boxes].sort((a, b) => a.boxNumber - b.boxNumber), 
    [boxes]
  );

  const generateAllLabels = async () => {
    setLoading(true);
    try {
      const generatedLabels: GeneratedLabel[] = [];
      
      for (let i = 0; i < sortedBoxes.length; i++) {
        const box = sortedBoxes[i];
        const correctBoxNumber = i + 1; // Правильный номер коробки (1, 2, 3...)
        
        const response = await fetch('http://localhost:3001/api/print/box-label-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            boxNumber: correctBoxNumber, // Используем правильный номер
            totalBoxes: sortedBoxes.length,
            customerName,
            customerCity,
            items: box.items,
            region,
            format: 'standard'
          })
        }).then(res => res.json());

        if (response.success) {
          generatedLabels.push({
            boxNumber: correctBoxNumber, // Используем правильный номер
            imageData: response.preview,
            preview: response.preview // Используем то же изображение для превью
          });
        }
      }
      
      setLabels(generatedLabels);
    } catch (error) {
      console.error('Error generating labels:', error);
      message.error('Ошибка генерации этикеток');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPrint = async () => {
    setPrinting(true);
    setPrintStatus({});
    
    try {
      // Отправляем все этикетки на печать
      const response = await fetch('http://localhost:3001/api/print/batch-print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          labels: labels.map(label => ({
            boxNumber: label.boxNumber,
            imageData: label.imageData
          })),
          region,
          customerName
        })
      }).then(res => res.json());

      if (response.success) {
        // Обновляем статус печати для каждой коробки
        const statusMap: { [key: number]: boolean } = {};
        response.results.forEach((result: any) => {
          statusMap[result.boxNumber] = result.success;
        });
        setPrintStatus(statusMap);
        
        const successCount = Object.values(statusMap).filter(s => s).length;
        message.success(`Напечатано ${successCount} из ${boxes.length} этикеток`);
        
        // Если все успешно напечатано, вызываем callback
        if (successCount === boxes.length) {
          setTimeout(() => {
            onPrint();
          }, 2000);
        }
      } else {
        message.error('Ошибка печати этикеток');
      }
    } catch (error) {
      console.error('Error printing labels:', error);
      message.error('Не удалось напечатать этикетки');
    } finally {
      setPrinting(false);
    }
  };

  const getRegionName = (region: DeliveryRegion): string => {
    const names: Record<DeliveryRegion, string> = {
      [DeliveryRegion.SOUTH1]: 'Юг 1 / דרום 1',
      [DeliveryRegion.SOUTH2]: 'Юг 2 / דרום 2',
      [DeliveryRegion.NORTH1]: 'Север 1 / צפון 1',
      [DeliveryRegion.NORTH2]: 'Север 2 / צפון 2'
    };
    return names[region] || region;
  };

  return (
    <Modal
      title={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            Предпросмотр этикеток коробок
          </Title>
          <Space>
            <Text type="secondary">Заказ #{orderId}</Text>
            <Badge color="blue" text={getRegionName(region)} />
            <Badge count={`${sortedBoxes.length} коробок`} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={labels.length > 6 ? 1400 : 1200}
      style={{ maxWidth: '95vw' }}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={printing}>
          Отмена
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handleBatchPrint}
          loading={printing}
          disabled={loading || labels.length === 0}
        >
          Напечатать баркоды
        </Button>
      ]}
    >
      <Spin spinning={loading} tip="Генерация этикеток...">
        <div style={{ minHeight: 400 }}>
          {labels.length > 0 && (
            <Row gutter={[16, 16]}>
              {labels.map((label) => {
                const isPrinted = printStatus[label.boxNumber];
                // Adaptive column sizes based on number of labels
                const colProps = labels.length <= 3 
                  ? { xs: 24, sm: 12, md: 8, lg: 8 }
                  : labels.length <= 6
                  ? { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }
                  : { xs: 24, sm: 12, md: 6, lg: 4, xl: 3 };
                
                return (
                  <Col key={label.boxNumber} {...colProps}>
                    <Card
                      hoverable
                      cover={
                        <div style={{ 
                          position: 'relative',
                          padding: '8px',
                          background: '#f0f2f5'
                        }}>
                          <Image
                            src={label.preview}
                            alt={`Box ${label.boxNumber}`}
                            style={{ width: '100%', height: 'auto' }}
                            preview={{
                              mask: <ZoomInOutlined style={{ fontSize: 24 }} />
                            }}
                          />
                          {isPrinted !== undefined && (
                            <Badge
                              status={isPrinted ? 'success' : 'error'}
                              text={isPrinted ? 'Напечатано' : 'Ошибка'}
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: 'white',
                                padding: '2px 8px',
                                borderRadius: 4
                              }}
                            />
                          )}
                        </div>
                      }
                      styles={{ body: { padding: '12px' } }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <InboxOutlined />
                          <Text strong>Коробка {label.boxNumber}/{sortedBoxes.length}</Text>
                        </Space>
                        {sortedBoxes[label.boxNumber - 1] && (
                          <Text type="secondary">
                            {sortedBoxes[label.boxNumber - 1].items.length} товаров
                          </Text>
                        )}
                        {isPrinted && (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
          
          {!loading && labels.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              color: '#999'
            }}>
              <InboxOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>Нет этикеток для отображения</p>
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  );
};