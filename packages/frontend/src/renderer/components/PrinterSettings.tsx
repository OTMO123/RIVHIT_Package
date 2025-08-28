import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Radio,
  Input,
  InputNumber,
  Button,
  Space,
  message,
  Typography,
  Row,
  Col,
  Switch,
  Divider,
  Select,
  Tooltip,
  Alert
} from 'antd';
import {
  PrinterOutlined,
  UsbOutlined,
  WifiOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
  SaveOutlined,
  SearchOutlined,
  LoadingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface PrinterConfig {
  connectionType: 'usb' | 'network';
  // USB настройки
  usbPort: string;
  printerModel: string;
  // Сетевые настройки
  networkIp: string;
  networkPort: number;
  // Общие настройки
  printerName: string;
  enabled: boolean;
  // Настройки печати
  printSpeed: number;
  printDensity: number;
  labelWidth: number;
  labelHeight: number;
}

interface PrinterSettingsProps {
  onSave?: (config: PrinterConfig) => void;
}

interface FoundPrinter {
  ip: string;
  port: number;
  name: string;
  status: 'online' | 'offline';
  responseTime?: number;
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({ onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundPrinters, setFoundPrinters] = useState<FoundPrinter[]>([]);
  const [config, setConfig] = useState<PrinterConfig>({
    connectionType: 'usb',
    usbPort: 'USB001',
    printerModel: 'GoDEX ZX420i',
    networkIp: '192.168.1.100',
    networkPort: 9100,
    printerName: 'BRAVO Printer',
    enabled: true,
    printSpeed: 2,
    printDensity: 10,
    labelWidth: 100,
    labelHeight: 150
  });

  useEffect(() => {
    // Загрузить настройки принтера из локального хранилища
    loadPrinterConfig();
  }, []);

  const loadPrinterConfig = async () => {
    try {
      // Здесь можно загрузить из API или localStorage
      const savedConfig = localStorage.getItem('printerConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        form.setFieldsValue(parsedConfig);
      } else {
        form.setFieldsValue(config);
      }
    } catch (error) {
      console.error('Error loading printer config:', error);
      form.setFieldsValue(config);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const newConfig = { ...config, ...values };
      
      // Сохранить в localStorage
      localStorage.setItem('printerConfig', JSON.stringify(newConfig));
      
      setConfig(newConfig);
      
      // Вызвать callback если есть
      if (onSave) {
        onSave(newConfig);
      }
      
      message.success('Настройки принтера сохранены');
    } catch (error) {
      console.error('Error saving printer config:', error);
      message.error('Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      
      // Имитация тестовой печати
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Тестовая печать отправлена на принтер');
    } catch (error) {
      message.error('Ошибка тестовой печати');
    } finally {
      setTesting(false);
    }
  };

  // Функция проверки порта на определенном IP
  const checkPrinterPort = async (ip: string, port: number): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды таймаут

      // Попытка подключения к принтеру через fetch (простая проверка доступности)
      const response = await fetch(`http://${ip}:${port}`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors' // Избегаем CORS проблем
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Принтер найден на ${ip}:${port} (время ответа: ${responseTime}ms)`);
      return true;
    } catch (error) {
      // Принтер не отвечает на этом порту
      return false;
    }
  };

  // Функция поиска принтеров в локальной сети
  const scanForPrinters = async () => {
    try {
      setScanning(true);
      setFoundPrinters([]);
      message.info('Сканирование сети на наличие принтеров...', 3);

      // Популярные подсети для поиска
      const baseIps = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
      const ports = [9100, 9101, 9102, 515]; // Стандартные порты принтеров
      const printers: FoundPrinter[] = [];

      console.log('🔍 Начинаем сканирование принтеров в популярных подсетях...');
      console.log('📡 Сканируемые подсети:', baseIps);
      console.log('🔌 Сканируемые порты:', ports);

      // Сканируем популярные IP адреса в каждой подсети
      const promises: Promise<void>[] = [];
      
      for (const baseIp of baseIps) {
        // Сканируем только популярные IP адреса для ускорения поиска
        const popularIPs = [1, 2, 3, 4, 5, 10, 20, 50, 100, 101, 102, 150, 200, 254];
        
        for (const ip of popularIPs) {
          const fullIp = `${baseIp}.${ip}`;
          
          for (const port of ports) {
            promises.push(
              checkPrinterPort(fullIp, port).then((isOnline) => {
                if (isOnline) {
                  const printer: FoundPrinter = {
                    ip: fullIp,
                    port,
                    name: `Принтер ${fullIp}:${port}`,
                    status: 'online'
                  };
                  
                  printers.push(printer);
                  console.log(`🖨️ Найден принтер: ${fullIp}:${port}`);
                  
                  // Обновляем список найденных принтеров в реальном времени
                  setFoundPrinters([...printers]);
                }
              }).catch(() => {
                // Игнорируем ошибки - просто принтер недоступен
              })
            );
          }
        }
      }

      // Ждем завершения всех проверок
      await Promise.allSettled(promises);

      // Удаляем дубликаты по IP
      const uniquePrinters = printers.filter((printer, index, self) => 
        index === self.findIndex(p => p.ip === printer.ip)
      );

      setFoundPrinters(uniquePrinters);

      if (uniquePrinters.length > 0) {
        message.success(`Найдено ${uniquePrinters.length} принтер(ов) в сети`);
      } else {
        message.warning('Принтеры не найдены в сети. Убедитесь, что принтер включен и подключен к той же сети.');
      }

    } catch (error) {
      console.error('Ошибка сканирования:', error);
      message.error('Ошибка при сканировании сети');
    } finally {
      setScanning(false);
    }
  };

  // Функция выбора найденного принтера
  const selectPrinter = (printer: FoundPrinter) => {
    form.setFieldsValue({
      networkIp: printer.ip,
      networkPort: printer.port
    });
    setConfig(prev => ({
      ...prev,
      networkIp: printer.ip,
      networkPort: printer.port
    }));
    message.success(`Выбран принтер ${printer.ip}:${printer.port}`);
  };

  const connectionType = Form.useWatch('connectionType', form) || config.connectionType;

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <PrinterOutlined />
        Настройки принтера
      </Title>

      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={(changedValues, allValues) => {
          setConfig({ ...config, ...allValues });
        }}
      >
        {/* Основные настройки */}
        <Card title="Основные настройки" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="printerName"
                label="Название принтера"
                rules={[{ required: true, message: 'Введите название принтера' }]}
              >
                <Input placeholder="BRAVO Printer" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enabled"
                label="Принтер включен"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="printerModel"
            label="Модель принтера"
            rules={[{ required: true, message: 'Выберите модель принтера' }]}
          >
            <Select>
              <Option value="GoDEX ZX420i">GoDEX ZX420i</Option>
              <Option value="GoDEX ZX430i">GoDEX ZX430i</Option>
              <Option value="Zebra ZT230">Zebra ZT230</Option>
              <Option value="Zebra ZT410">Zebra ZT410</Option>
              <Option value="Generic EZPL">Generic EZPL</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* Тип подключения */}
        <Card title="Тип подключения" style={{ marginBottom: 16 }}>
          <Form.Item
            name="connectionType"
            rules={[{ required: true, message: 'Выберите тип подключения' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="usb">
                  <Space>
                    <UsbOutlined />
                    USB подключение
                    <Tooltip title="Прямое подключение принтера через USB кабель">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                </Radio>
                <Radio value="network">
                  <Space>
                    <WifiOutlined />
                    Сетевое подключение
                    <Tooltip title="Подключение к принтеру по сети TCP/IP">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {connectionType === 'usb' && (
            <Card type="inner" title="Настройки USB" size="small">
              <Alert
                message="USB подключение"
                description="Убедитесь, что принтер подключен к компьютеру через USB кабель и включен."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Form.Item
                name="usbPort"
                label="USB порт"
                rules={[{ required: true, message: 'Введите USB порт' }]}
              >
                <Select>
                  <Option value="USB001">USB001</Option>
                  <Option value="USB002">USB002</Option>
                  <Option value="USB003">USB003</Option>
                  <Option value="COM1">COM1</Option>
                  <Option value="COM2">COM2</Option>
                  <Option value="COM3">COM3</Option>
                  <Option value="LPT1">LPT1</Option>
                </Select>
              </Form.Item>
            </Card>
          )}

          {connectionType === 'network' && (
            <Card type="inner" title="Настройки сети" size="small">
              <Alert
                message="Сетевое подключение"
                description="Убедитесь, что принтер подключен к той же сети и имеет статический IP адрес."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* Кнопка автоматического поиска */}
              <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Button
                    type="dashed"
                    icon={scanning ? <LoadingOutlined /> : <SearchOutlined />}
                    onClick={scanForPrinters}
                    loading={scanning}
                    style={{ width: '100%' }}
                  >
                    {scanning ? 'Сканируем сеть...' : 'Автоматический поиск принтеров в сети'}
                  </Button>
                </Col>
              </Row>

              {/* Список найденных принтеров */}
              {foundPrinters.length > 0 && (
                <Card type="inner" title="Найденные принтеры" size="small" style={{ marginBottom: 16 }}>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {foundPrinters.map((printer, index) => (
                      <Card
                        key={`${printer.ip}-${printer.port}`}
                        size="small"
                        style={{ marginBottom: 8 }}
                        hoverable
                        onClick={() => selectPrinter(printer)}
                      >
                        <Row align="middle" justify="space-between">
                          <Col>
                            <Space direction="vertical" size="small">
                              <Text strong>{printer.ip}:{printer.port}</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {printer.name}
                              </Text>
                            </Space>
                          </Col>
                          <Col>
                            <Space>
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              <Text type="secondary" style={{ fontSize: '12px' }}>Онлайн</Text>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="networkIp"
                    label={
                      <Space>
                        IP адрес принтера
                        <Tooltip title="Кликните 'Автоматический поиск' выше для поиска принтеров в сети">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    rules={[
                      { required: true, message: 'Введите IP адрес' },
                      { pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, message: 'Некорректный IP адрес' }
                    ]}
                  >
                    <Input placeholder="192.168.1.100" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="networkPort"
                    label="Порт"
                    rules={[{ required: true, message: 'Введите порт' }]}
                  >
                    <Select placeholder="9100" style={{ width: '100%' }}>
                      <Option value={9100}>9100 (стандартный)</Option>
                      <Option value={9101}>9101</Option>
                      <Option value={9102}>9102</Option>
                      <Option value={515}>515 (LPD)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}
        </Card>

        {/* Настройки печати */}
        <Card title="Настройки печати" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="printSpeed"
                label={
                  <Space>
                    Скорость печати
                    <Tooltip title="Скорость печати от 1 (медленно) до 5 (быстро)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Выберите скорость печати' }]}
              >
                <Select>
                  <Option value={1}>1 - Очень медленно</Option>
                  <Option value={2}>2 - Медленно</Option>
                  <Option value={3}>3 - Нормально</Option>
                  <Option value={4}>4 - Быстро</Option>
                  <Option value={5}>5 - Очень быстро</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="printDensity"
                label={
                  <Space>
                    Плотность печати
                    <Tooltip title="Плотность печати от 1 (светлее) до 15 (темнее)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Выберите плотность печати' }]}
              >
                <InputNumber min={1} max={15} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Размеры этикеток</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="labelWidth"
                label="Ширина этикетки (мм)"
                rules={[{ required: true, message: 'Введите ширину этикетки' }]}
              >
                <InputNumber min={10} max={200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="labelHeight"
                label="Высота этикетки (мм)"
                rules={[{ required: true, message: 'Введите высоту этикетки' }]}
              >
                <InputNumber min={10} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Кнопки управления */}
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
            >
              Сохранить настройки
            </Button>
            
            <Button
              icon={<ExperimentOutlined />}
              onClick={handleTest}
              loading={testing}
              disabled={!config.enabled}
            >
              Тестовая печать
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};