/**
 * PrinterTestPage - Страница для тестирования поиска принтеров
 */

import React, { useState } from 'react';
import { Card, Typography, Space, message, Alert } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrinterDiscovery from '../components/PrinterDiscovery';
import { useI18n } from '../i18n/i18n';

const { Title, Text } = Typography;

interface PrinterInfo {
  ip: string;
  port: number;
  status: 'connected' | 'error';
  model?: string;
  responseTime?: number;
}

export const PrinterTestPage: React.FC = () => {
  const { locale } = useI18n();
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterInfo | null>(null);

  const handlePrinterSelect = (printer: PrinterInfo) => {
    setSelectedPrinter(printer);
    message.success(
      locale === 'ru' 
        ? `Принтер настроен: ${printer.ip}:${printer.port}` 
        : `Printer configured: ${printer.ip}:${printer.port}`
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          <PrinterOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          {locale === 'ru' ? 'Тестирование поиска принтеров' : 'Printer Discovery Test'}
        </Title>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Информация о текущем принтере */}
          {selectedPrinter && (
            <Alert
              message={locale === 'ru' ? 'Выбранный принтер' : 'Selected Printer'}
              description={
                <Space direction="vertical">
                  <div>
                    <strong>{locale === 'ru' ? 'IP адрес:' : 'IP Address:'}</strong> {selectedPrinter.ip}:{selectedPrinter.port}
                  </div>
                  <div>
                    <strong>{locale === 'ru' ? 'Модель:' : 'Model:'}</strong> {selectedPrinter.model || 'GoDEX Label Printer'}
                  </div>
                  <div>
                    <strong>{locale === 'ru' ? 'Статус:' : 'Status:'}</strong> 
                    <span style={{ color: '#52c41a', marginLeft: 8 }}>
                      {locale === 'ru' ? 'Подключен' : 'Connected'}
                    </span>
                  </div>
                </Space>
              }
              type="success"
              showIcon
            />
          )}

          {/* Компонент поиска принтеров */}
          <PrinterDiscovery onPrinterSelect={handlePrinterSelect} />

          {/* Справочная информация */}
          <Card>
            <Title level={4}>
              {locale === 'ru' ? 'Инструкция по использованию' : 'Usage Instructions'}
            </Title>
            <Space direction="vertical">
              <Text>
                <strong>1.</strong> {locale === 'ru' 
                  ? 'Нажмите "Автоматический поиск в сети" для поиска всех доступных принтеров' 
                  : 'Click "Auto Search Network" to find all available printers'}
              </Text>
              <Text>
                <strong>2.</strong> {locale === 'ru' 
                  ? 'Или введите конкретный IP адрес в поле ниже и нажмите "Тест"' 
                  : 'Or enter a specific IP address in the field below and click "Test"'}
              </Text>
              <Text>
                <strong>3.</strong> {locale === 'ru' 
                  ? 'Поддерживаются IP адреса с ведущими нулями (192.168.014.200)' 
                  : 'IP addresses with leading zeros are supported (192.168.014.200)'}
              </Text>
              <Text>
                <strong>4.</strong> {locale === 'ru' 
                  ? 'После обнаружения принтера нажмите "Выбрать" для его настройки' 
                  : 'After discovering a printer, click "Select" to configure it'}
              </Text>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default PrinterTestPage;