import React, { useState } from 'react';
import { Modal, Row, Col, Card, Button, Space, Typography, Badge, Spin, message, Tooltip } from 'antd';
import { PrinterOutlined, InboxOutlined, CheckCircleOutlined, ZoomInOutlined, ExpandOutlined } from '@ant-design/icons';
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

interface ScaleConfig {
  scale: number;
  containerWidth: string;
  containerHeight: string;
  cardWidth: string;
  gutter: [number, number];
  columns: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  iconSize: number;
  textSize: number;
  modalWidth: number | string;
}

// Function to get scale configuration based on number of labels
const getScaleConfig = (labelCount: number): ScaleConfig => {
  if (labelCount === 1) {
    return {
      scale: 0.8,
      containerWidth: '320px',
      containerHeight: '320px',
      cardWidth: '340px',
      gutter: [16, 16],
      columns: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24, xxl: 24 },
      iconSize: 16,
      textSize: 14,
      modalWidth: 450
    };
  } else if (labelCount === 2) {
    return {
      scale: 0.45,
      containerWidth: '180px',
      containerHeight: '180px',
      cardWidth: '200px',
      gutter: [16, 16],
      columns: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12, xxl: 12 },
      iconSize: 14,
      textSize: 13,
      modalWidth: '80%'
    };
  } else if (labelCount <= 4) {
    return {
      scale: 0.35,
      containerWidth: '140px',
      containerHeight: '140px',
      cardWidth: '160px',
      gutter: [12, 12],
      columns: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6, xxl: 6 },
      iconSize: 13,
      textSize: 12,
      modalWidth: '90%'
    };
  } else {
    return {
      scale: 0.3,
      containerWidth: '120px',
      containerHeight: '120px',
      cardWidth: '140px',
      gutter: [16, 16],
      columns: { xs: 24, sm: 12, md: 8, lg: 6, xl: 4, xxl: 3 },
      iconSize: 12,
      textSize: 12,
      modalWidth: '95%'
    };
  }
};

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
  const [selectedLabel, setSelectedLabel] = useState<GeneratedLabel | null>(null);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);

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

  // Calculate scale configuration based on number of labels
  const scaleConfig = React.useMemo(() => 
    getScaleConfig(labels.length), 
    [labels.length]
  );

  const generateAllLabels = async () => {
    setLoading(true);
    try {
      const generatedLabels: GeneratedLabel[] = [];
      
      for (let i = 0; i < sortedBoxes.length; i++) {
        const box = sortedBoxes[i];
        const correctBoxNumber = i + 1; // Правильный номер коробки (1, 2, 3...)
        
        const response = await fetch('http://localhost:3001/api/print/box-label-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            boxNumber: correctBoxNumber, // Используем правильный номер
            totalBoxes: sortedBoxes.length,
            customerCompany: '',
            customerName,
            customerCity,
            region,
            deliveryDate: new Date().toLocaleDateString('he-IL'),
            items: box.items.map(item => ({
              name: item.name,
              nameHebrew: item.nameHebrew || item.name,
              nameRussian: item.nameRussian,
              quantity: item.quantity,
              barcode: item.barcode,
              catalogNumber: item.catalogNumber || item.barcode
            }))
          })
        }).then(res => res.json());

        if (response.success && response.html) {
          // Modify HTML to ensure square viewport
          const modifiedHtml = response.html
            .replace('<body>', '<body style="margin:0;padding:0;width:400px;height:400px;overflow:hidden;display:flex;justify-content:center;align-items:center;">')
            .replace('min-height: 100vh', 'height: 400px')
            .replace('padding: 20px', 'padding: 0');
          
          generatedLabels.push({
            boxNumber: correctBoxNumber, // Используем правильный номер
            imageData: modifiedHtml,    // Store modified HTML
            preview: modifiedHtml        // Same for preview
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
      const response = await fetch('http://localhost:3001/api/print/box-labels-ezpl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          boxes: sortedBoxes.map((box, index) => ({
            ...box,
            boxNumber: index + 1
          })),
          region,
          customerName,
          customerCity,
          totalBoxes: sortedBoxes.length
        })
      }).then(res => res.json());

      if (response.success) {
        // Обновляем статус печати для каждой коробки
        const statusMap: { [key: number]: boolean } = {};
        sortedBoxes.forEach((_, index) => {
          statusMap[index + 1] = true; // Mark all as successful if the batch succeeded
        });
        setPrintStatus(statusMap);
        
        message.success(`Напечатано ${sortedBoxes.length} этикеток`);
        
        // Если все успешно напечатано, вызываем callback и закрываем модал
        setTimeout(() => {
          onPrint();
          onCancel(); // Закрываем текущий модал после успешной печати
        }, 2000);
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

  const handleLabelClick = (label: GeneratedLabel) => {
    setSelectedLabel(label);
    setZoomModalVisible(true);
  };

  const handleZoomModalClose = () => {
    setZoomModalVisible(false);
    setSelectedLabel(null);
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
      width={scaleConfig.modalWidth}
      style={{ maxWidth: '1600px' }}
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
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
            <Row gutter={scaleConfig.gutter}>
              {labels.map((label) => {
                const isPrinted = printStatus[label.boxNumber];
                // Use dynamic columns from scale config
                const colProps = scaleConfig.columns;
                
                return (
                  <Col key={label.boxNumber} {...colProps}>
                    <Card
                      hoverable
                      onClick={() => handleLabelClick(label)}
                      styles={{ 
                        body: { padding: '8px' },
                        cover: { overflow: 'visible' }
                      }}
                      style={{ width: scaleConfig.cardWidth, margin: '0 auto', cursor: 'pointer' }}
                      cover={
                        <Tooltip title="Нажмите для увеличения">
                          <div style={{ 
                            position: 'relative',
                            padding: '0',
                            background: '#f0f2f5',
                            width: scaleConfig.containerWidth,
                            height: scaleConfig.containerHeight,
                            margin: '0 auto',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              transform: `scale(${scaleConfig.scale})`,
                              transformOrigin: 'top left',
                              width: '400px',
                              height: '400px'
                            }}>
                              <iframe
                                srcDoc={label.preview}
                                title={`Box ${label.boxNumber}`}
                                scrolling="no"
                                style={{ 
                                  width: '400px', 
                                  height: '400px',
                                  border: 'none',
                                  background: 'white',
                                  pointerEvents: 'none',
                                  display: 'block'
                                }}
                                sandbox="allow-same-origin"
                              />
                            </div>
                            <ExpandOutlined style={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              fontSize: `${scaleConfig.iconSize}px`,
                              color: '#1890ff',
                              background: 'white',
                              padding: '2px',
                              borderRadius: '2px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} />
                            {isPrinted !== undefined && (
                              <Badge
                                status={isPrinted ? 'success' : 'error'}
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  transform: 'scale(0.8)'
                                }}
                              />
                            )}
                          </div>
                        </Tooltip>
                      }
                    >
                      <div style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: `${scaleConfig.textSize}px` }}>
                          <InboxOutlined style={{ fontSize: `${scaleConfig.iconSize}px`, marginRight: '4px' }} />
                          Коробка {label.boxNumber}/{sortedBoxes.length}
                        </Text>
                        {sortedBoxes[label.boxNumber - 1] && (
                          <div>
                            <Text type="secondary" style={{ fontSize: `${scaleConfig.textSize - 1}px` }}>
                              {sortedBoxes[label.boxNumber - 1].items.length} товаров
                            </Text>
                          </div>
                        )}
                      </div>
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

      {/* Modal for zoomed label view */}
      <Modal
        title={selectedLabel ? `Коробка ${selectedLabel.boxNumber}` : ''}
        visible={zoomModalVisible}
        onCancel={handleZoomModalClose}
        width={450}
        footer={[
          <Button key="close" onClick={handleZoomModalClose}>
            Закрыть
          </Button>
        ]}
        centered
      >
        {selectedLabel && (
          <div style={{ 
            width: '400px',
            height: '400px',
            margin: '0 auto',
            overflow: 'hidden',
            background: '#f0f2f5',
            padding: '0'
          }}>
            <iframe
              srcDoc={selectedLabel.preview}
              title={`Box ${selectedLabel.boxNumber} Full Size`}
              scrolling="no"
              style={{ 
                width: '400px', 
                height: '400px',
                border: 'none',
                background: 'white',
                display: 'block'
              }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </Modal>
    </Modal>
  );
};