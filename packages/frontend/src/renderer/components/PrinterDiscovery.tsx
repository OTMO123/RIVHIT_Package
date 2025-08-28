/**
 * PrinterDiscovery Component - Автоматический поиск GoDEX принтеров
 */

import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  List, 
  Typography, 
  Space, 
  Badge, 
  message, 
  Spin,
  Input,
  Form,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  WifiOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { useI18n } from '../i18n/i18n';

const { Title, Text } = Typography;

interface PrinterInfo {
  ip: string;
  port: number;
  status: 'connected' | 'error';
  model?: string;
  responseTime?: number;
}

interface PrinterDiscoveryProps {
  onPrinterSelect?: (printer: PrinterInfo) => void;
}

export const PrinterDiscovery: React.FC<PrinterDiscoveryProps> = ({ onPrinterSelect }) => {
  const { t, locale } = useI18n();
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingIP, setTestingIP] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);
  const [form] = Form.useForm();

  /**
   * Автоматический поиск принтеров
   */
  const handleAutoSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/printers/quick-scan');
      const data = await response.json();
      
      if (data.success) {
        setPrinters(data.data);
        if (data.data.length > 0) {
          message.success(
            locale === 'ru' 
              ? `Найдено ${data.data.length} принтеров` 
              : `Found ${data.data.length} printers`
          );
        } else {
          message.warning(
            locale === 'ru' 
              ? 'Принтеры не найдены в сети' 
              : 'No printers found in network'
          );
        }
      } else {
        message.error(
          locale === 'ru' 
            ? 'Ошибка поиска принтеров' 
            : 'Error searching printers'
        );
      }
    } catch (error) {
      console.error('Ошибка поиска принтеров:', error);
      message.error(
        locale === 'ru' 
          ? 'Не удалось выполнить поиск' 
          : 'Failed to search'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Тестирование конкретного IP адреса
   */
  const handleTestIP = async (values: { ip: string; port?: number }) => {
    const { ip, port = 9101 } = values;
    
    setTestingIP(ip);
    setTestLoading(true);
    
    try {
      const response = await fetch('/api/printers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip, port })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        message.success(
          locale === 'ru' 
            ? `Принтер ${ip}:${port} найден!` 
            : `Printer ${ip}:${port} found!`
        );
        
        // Добавляем в список найденных принтеров
        setPrinters(prev => {
          const exists = prev.find(p => p.ip === data.data.ip && p.port === data.data.port);
          if (exists) {
            return prev; // Уже есть в списке
          }
          return [...prev, data.data];
        });
        
      } else {
        message.error(
          locale === 'ru' 
            ? `Принтер ${ip}:${port} недоступен` 
            : `Printer ${ip}:${port} not available`
        );
      }
    } catch (error) {
      console.error('Ошибка тестирования принтера:', error);
      message.error(
        locale === 'ru' 
          ? 'Ошибка тестирования' 
          : 'Test failed'
      );
    } finally {
      setTestingIP('');
      setTestLoading(false);
    }
  };

  /**
   * Выбор принтера
   */
  const handleSelectPrinter = (printer: PrinterInfo) => {
    message.success(
      locale === 'ru' 
        ? `Выбран принтер: ${printer.ip}:${printer.port}` 
        : `Selected printer: ${printer.ip}:${printer.port}`
    );
    
    onPrinterSelect?.(printer);
  };

  /**
   * Форматирование времени отклика
   */
  const formatResponseTime = (responseTime?: number): string => {
    if (!responseTime) return '';
    return responseTime < 100 ? 'быстро' : responseTime < 500 ? 'нормально' : 'медленно';
  };

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        <PrinterOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        {locale === 'ru' ? 'Поиск GoDEX принтеров' : 'GoDEX Printer Discovery'}
      </Title>

      {/* Автоматический поиск */}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={handleAutoSearch}
          size="large"
          style={{ width: '100%' }}
        >
          {locale === 'ru' ? 'Автоматический поиск в сети' : 'Auto Search Network'}
        </Button>

        <Divider>{locale === 'ru' ? 'или' : 'or'}</Divider>

        {/* Ручное тестирование IP */}
        <Card size="small" title={locale === 'ru' ? 'Тестировать конкретный IP' : 'Test Specific IP'}>
          <Form
            form={form}
            onFinish={handleTestIP}
            layout="vertical"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="ip"
                  label={locale === 'ru' ? 'IP адрес' : 'IP Address'}
                  rules={[
                    { required: true, message: locale === 'ru' ? 'Введите IP адрес' : 'Enter IP address' }
                  ]}
                >
                  <Input
                    placeholder="192.168.014.200"
                    disabled={testLoading}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="port"
                  label={locale === 'ru' ? 'Порт' : 'Port'}
                  initialValue={9101}
                >
                  <Input
                    type="number"
                    placeholder="9101"
                    disabled={testLoading}
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label=" ">
                  <Button
                    type="default"
                    icon={testLoading ? <SyncOutlined spin /> : <WifiOutlined />}
                    htmlType="submit"
                    loading={testLoading}
                    style={{ width: '100%' }}
                  >
                    {locale === 'ru' ? 'Тест' : 'Test'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Список найденных принтеров */}
        {printers.length > 0 && (
          <Card 
            size="small" 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                {locale === 'ru' ? 'Найденные принтеры' : 'Found Printers'} 
                <Badge count={printers.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
          >
            <List
              dataSource={printers}
              renderItem={(printer) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      onClick={() => handleSelectPrinter(printer)}
                      icon={<CheckCircleOutlined />}
                    >
                      {locale === 'ru' ? 'Выбрать' : 'Select'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge
                        status={printer.status === 'connected' ? 'success' : 'error'}
                        text={
                          <Space>
                            <PrinterOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                            <Text strong>{printer.ip}:{printer.port}</Text>
                          </Space>
                        }
                      />
                    }
                    title={printer.model || 'GoDEX Label Printer'}
                    description={
                      <Space>
                        <Text type="secondary">
                          {locale === 'ru' ? 'Отклик:' : 'Response:'} {formatResponseTime(printer.responseTime)}
                        </Text>
                        {printer.responseTime && (
                          <Text type="secondary">({printer.responseTime}ms)</Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Справочная информация */}
        <Card size="small" type="inner">
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Space direction="vertical" size="small">
              <div>
                <strong>{locale === 'ru' ? 'Поддержка IP форматов:' : 'Supported IP formats:'}</strong>
              </div>
              <div>• 192.168.14.200 (стандартный)</div>
              <div>• 192.168.014.200 (с ведущими нулями)</div>
              <div>• {locale === 'ru' ? 'Порты: 9100, 9101, 9102' : 'Ports: 9100, 9101, 9102'}</div>
            </Space>
          </Text>
        </Card>
      </Space>
    </Card>
  );
};

export default PrinterDiscovery;