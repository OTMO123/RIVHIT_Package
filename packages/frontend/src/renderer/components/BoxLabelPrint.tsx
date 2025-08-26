import React, { useState } from 'react';
import { Button, Modal, Card, Badge, Spin, message, Space, Radio, Statistic, Row, Col } from 'antd';
import { PrinterOutlined, InboxOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { PackingBox, PackingItem, DeliveryRegion } from '@packing/shared';
import { apiService } from '../services/api.service';
import { RegionSelector } from './RegionSelector';

interface BoxLabelPrintProps {
  orderId: string | number;
  items: PackingItem[];
  customerName: string;
  customerCity?: string;
  boxGroups?: Map<number, number[]>; // Группы коробок из системы линков
  onPrintComplete?: (success: boolean) => void;
}

export const BoxLabelPrint: React.FC<BoxLabelPrintProps> = ({
  orderId,
  items,
  customerName,
  customerCity,
  boxGroups,
  onPrintComplete
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [labelFormat, setLabelFormat] = useState<'standard' | 'compact'>('standard');
  const [printResults, setPrintResults] = useState<any[]>([]);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<DeliveryRegion | null>(null);

  // Автоматическое распределение товаров по коробкам
  const assignBoxes = async () => {
    setIsLoading(true);
    try {
      // Если есть группы из системы линков, используем их
      if (boxGroups && boxGroups.size > 0) {
        const boxesFromGroups: PackingBox[] = [];
        let boxNumber = 1;
        
        boxGroups.forEach((itemIds, groupId) => {
          const boxItems = itemIds
            .map(itemId => items.find(item => item.item_id === itemId))
            .filter(item => item && item.isPacked && item.isAvailable)
            .map(item => ({
              itemId: item!.item_id,
              name: item!.item_name,
              nameHebrew: item!.item_name,  // Using item_name as fallback
              nameRussian: item!.item_name,  // Using item_name as fallback
              quantity: item!.packedQuantity || item!.quantity,
              catalogNumber: item!.item_part_num || undefined,
              barcode: item!.barcode || undefined
            }));
          
          if (boxItems.length > 0) {
            boxesFromGroups.push({
              boxId: `BOX_${Date.now()}_${boxNumber}`,
              boxNumber,
              orderId,
              items: boxItems,
              isFull: boxItems.length >= 10,
              isPrinted: false
            });
            boxNumber++;
          }
        });
        
        setBoxes(boxesFromGroups);
        message.success(`Товары распределены по ${boxesFromGroups.length} коробкам согласно группировке`);
      } else {
        // Стандартное автоматическое распределение
        const response = await apiService.post('/api/print/assign-boxes', {
          items: items.filter(item => item.isPacked && item.isAvailable),
          maxPerBox: 10
        });

        if (response.data.success) {
          setBoxes(response.data.boxes);
          message.success(`Товары распределены по ${response.data.boxes.length} коробкам`);
        } else {
          message.error('Ошибка распределения товаров');
        }
      }
    } catch (error) {
      console.error('Error assigning boxes:', error);
      message.error('Не удалось распределить товары по коробкам');
    } finally {
      setIsLoading(false);
    }
  };

  // Открытие модального окна
  const showModal = async () => {
    setIsModalVisible(true);
    await assignBoxes();
  };

  // Печать этикеток коробок
  const handlePrint = async () => {
    if (boxes.length === 0) {
      message.warning('Нет коробок для печати');
      return;
    }

    // Показываем селектор региона если еще не выбран
    if (!selectedRegion) {
      setShowRegionSelector(true);
      return;
    }

    setIsPrinting(true);
    setPrintResults([]);

    try {
      // Используем EZPL endpoint для прямой печати
      const response = await apiService.post('/api/print/box-labels-ezpl', {
        orderId,
        boxes: boxes.map(box => ({
          ...box,
          items: box.items.map(item => ({
            name: item.name,
            nameHebrew: item.nameHebrew || item.name,
            nameRussian: item.nameRussian,
            quantity: item.quantity,
            barcode: item.barcode,
            catalogNumber: item.catalogNumber || item.barcode
          }))
        })),
        customerName,
        customerCity,
        format: labelFormat,
        region: selectedRegion
      });

      if (response.data.success) {
        setPrintResults(response.data.results);
        message.success(response.data.message);
        
        if (onPrintComplete) {
          onPrintComplete(true);
        }
      } else {
        message.error('Ошибка печати этикеток');
        if (onPrintComplete) {
          onPrintComplete(false);
        }
      }
    } catch (error) {
      console.error('Error printing box labels:', error);
      message.error('Не удалось напечатать этикетки');
      if (onPrintComplete) {
        onPrintComplete(false);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Генерация превью этикетки (HTML визуализация)
  const handlePreview = async (boxNumber: number) => {
    const box = boxes.find(b => b.boxNumber === boxNumber);
    if (!box) return;

    try {
      // Используем новый HTML endpoint для визуализации
      const response = await apiService.post('/api/print/box-label-html', {
        orderId,
        boxNumber: box.boxNumber,
        totalBoxes: boxes.length,
        customerCompany: '', // TODO: Add company if available
        customerName,
        customerCity,
        region: selectedRegion,
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        items: box.items.map(item => ({
          name: item.name,
          nameHebrew: item.nameHebrew || item.name,
          nameRussian: item.nameRussian,
          quantity: item.quantity,
          barcode: item.barcode,
          catalogNumber: item.catalogNumber || item.barcode
        }))
      });

      // Открываем HTML визуализацию в новом окне
      if (response.data.success && response.data.html) {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(response.data.html);
          previewWindow.document.close();
        }
      }
    } catch (error) {
      console.error('Error generating HTML preview:', error);
      message.error('Не удалось создать превью');
    }
  };

  // Показать все этикетки в одном окне
  const handlePreviewAll = async () => {
    if (boxes.length === 0) {
      message.warning('Нет коробок для превью');
      return;
    }

    try {
      // Используем endpoint для множественных этикеток
      const response = await apiService.post('/api/print/box-labels-html', {
        orderId,
        customerCompany: '', // TODO: Add company if available
        customerName,
        customerCity,
        region: selectedRegion,
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        boxes: boxes.map(box => ({
          boxNumber: box.boxNumber,
          items: box.items.map(item => ({
            name: item.name,
            nameHebrew: item.nameHebrew || item.name,
            nameRussian: item.nameRussian,
            quantity: item.quantity,
            barcode: item.barcode,
            catalogNumber: item.catalogNumber || item.barcode
          }))
        }))
      });

      // Открываем HTML визуализацию всех этикеток
      if (response.data.success && response.data.html) {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(response.data.html);
          previewWindow.document.close();
        }
      }
    } catch (error) {
      console.error('Error generating HTML preview for all boxes:', error);
      message.error('Не удалось создать превью всех коробок');
    }
  };

  // Подсчет статистики
  const totalItems = boxes.reduce((sum, box) => sum + box.items.length, 0);
  const printedBoxes = printResults.filter(r => r.success).length;
  const failedBoxes = printResults.filter(r => !r.success).length;

  // Обработчик выбора региона
  const handleRegionSelect = (region: DeliveryRegion) => {
    setSelectedRegion(region);
    setShowRegionSelector(false);
    message.success(`Выбран регион: ${getRegionName(region)}`);
    // После выбора региона продолжаем печать
    setTimeout(() => handlePrint(), 500);
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
    <>
      <Button
        type="primary"
        icon={<PrinterOutlined />}
        onClick={showModal}
        size="large"
        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
      >
        Печать этикеток коробок
      </Button>

      <Modal
        title={
          <Space>
            <InboxOutlined style={{ fontSize: '24px' }} />
            <span>Печать этикеток для коробок</span>
          </Space>
        }
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Отмена
          </Button>,
          <Button
            key="preview-all"
            icon={<InboxOutlined />}
            onClick={handlePreviewAll}
            disabled={boxes.length === 0 || !selectedRegion}
          >
            Превью всех коробок
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            loading={isPrinting}
            disabled={boxes.length === 0}
          >
            Печать всех этикеток
          </Button>
        ]}
      >
        {/* Выбор формата */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <span>Формат этикетки:</span>
            <Radio.Group
              value={labelFormat}
              onChange={(e) => setLabelFormat(e.target.value)}
              disabled={isPrinting}
            >
              <Radio value="standard">Стандартный (10x10 см)</Radio>
              <Radio value="compact">Компактный (7x7 см)</Radio>
            </Radio.Group>
          </Space>
        </Card>

        {/* Статистика */}
        {boxes.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic 
                title="Всего коробок" 
                value={boxes.length} 
                prefix={<InboxOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Всего товаров" 
                value={totalItems}
              />
            </Col>
            {printResults.length > 0 && (
              <>
                <Col span={6}>
                  <Statistic 
                    title="Напечатано" 
                    value={printedBoxes}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Ошибки" 
                    value={failedBoxes}
                    valueStyle={{ color: failedBoxes > 0 ? '#ff4d4f' : undefined }}
                    prefix={<ExclamationCircleOutlined />}
                  />
                </Col>
              </>
            )}
          </Row>
        )}

        {/* Загрузка */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="Распределение товаров по коробкам..." />
          </div>
        )}

        {/* Список коробок */}
        {!isLoading && boxes.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {boxes.map((box) => {
              const printResult = printResults.find(r => r.boxNumber === box.boxNumber);
              
              return (
                <Card
                  key={box.boxId}
                  size="small"
                  style={{ marginBottom: 8 }}
                  title={
                    <Space>
                      <InboxOutlined />
                      <span>Коробка #{box.boxNumber}</span>
                      {box.isFull && <Badge status="warning" text="Заполнена" />}
                      {printResult?.success && <Badge status="success" text="Напечатано" />}
                      {printResult && !printResult.success && <Badge status="error" text="Ошибка" />}
                    </Space>
                  }
                  extra={
                    <Button
                      size="small"
                      onClick={() => handlePreview(box.boxNumber)}
                      disabled={isPrinting}
                    >
                      Превью
                    </Button>
                  }
                >
                  <div style={{ fontSize: '12px' }}>
                    <strong>Товары ({box.items.length}):</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {box.items.slice(0, 3).map((item, idx) => (
                        <li key={idx}>
                          {item.nameHebrew || item.name} - {item.quantity} шт.
                        </li>
                      ))}
                      {box.items.length > 3 && (
                        <li style={{ fontStyle: 'italic' }}>
                          ...и еще {box.items.length - 3} товаров
                        </li>
                      )}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Сообщение если нет коробок */}
        {!isLoading && boxes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <InboxOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <p>Нет товаров для упаковки</p>
          </div>
        )}
      </Modal>

      {/* Модал выбора региона */}
      <RegionSelector
        visible={showRegionSelector}
        onSelect={handleRegionSelect}
        onCancel={() => setShowRegionSelector(false)}
      />
    </>
  );
};