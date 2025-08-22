import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Typography, 
  Button, 
  Space, 
  Steps,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  Modal,
  notification,
  Progress,
  List,
  Tag,
  Descriptions
} from 'antd';
import { 
  ShoppingCartOutlined, 
  CheckCircleOutlined, 
  PrinterOutlined,
  BarcodeOutlined,
  InboxOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { RivhitItem, RivhitConverter, PackingItem } from '@packing/shared';
import { ItemSelector } from '../components/ItemSelector';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

// Моковые данные для тестирования на основе реальной структуры RIVHIT
const mockRivhitItems: RivhitItem[] = [
  {
    item_id: 1,
    item_name: "כיסונים עבודת יד (אריזת מלבן)",
    item_extended_description: "קרטון 11 יח'",
    item_part_num: "7290011585730",
    barcode: "7290011585730",
    item_group_id: 4,
    storage_id: 1,
    quantity: 25, // Положительное количество - товар в наличии
    cost_nis: 13.20,
    sale_nis: 15.50,
    currency_id: 93,
    cost_mtc: 1.00,
    sale_mtc: 1.00,
    picture_link: null,
    exempt_vat: false,
    avitem: 0,
    location: "A1-B2",
    is_serial: 0,
    sapak: 500005,
    item_name_en: "Handmade Cookies (Rectangular Pack)",
    item_order: 1
  },
  {
    item_id: 2,
    item_name: "כיסונים ביתי 900 גרם (פרמיום)",
    item_extended_description: "קרטון 12יח'",
    item_part_num: "7290011585723",
    barcode: "7290011585723",
    item_group_id: 10,
    storage_id: 1,
    quantity: -5, // Отрицательное количество - товар отсутствует
    cost_nis: 23.00,
    sale_nis: 24.50,
    currency_id: 93,
    cost_mtc: 1.00,
    sale_mtc: 1.07,
    picture_link: null,
    exempt_vat: false,
    avitem: 0,
    location: "B2-C3",
    is_serial: 0,
    sapak: 500005,
    item_name_en: "Home Cookies 900g (Premium)",
    item_order: 2
  },
  {
    item_id: 3,
    item_name: "חלה מתוקה 500 גרם",
    item_extended_description: "חלה טרייה אפויה היום",
    item_part_num: "7290011585740",
    barcode: "7290011585740",
    item_group_id: 2,
    storage_id: 2,
    quantity: 8,
    cost_nis: 12.00,
    sale_nis: 18.90,
    currency_id: 93,
    cost_mtc: 1.00,
    sale_mtc: 1.58,
    picture_link: null,
    exempt_vat: false,
    avitem: 0,
    location: "C1-A1",
    is_serial: 0,
    sapak: 500006,
    item_name_en: "Sweet Challah 500g",
    item_order: 3
  },
  {
    item_id: 4,
    item_name: "לחם מקמח מלא",
    item_extended_description: "לחם אורגני 100% מקמח מלא",
    item_part_num: "7290011585757",
    barcode: "7290011585757",
    item_group_id: 2,
    storage_id: 2,
    quantity: 12,
    cost_nis: 8.50,
    sale_nis: 12.90,
    currency_id: 93,
    cost_mtc: 1.00,
    sale_mtc: 1.52,
    picture_link: null,
    exempt_vat: false,
    avitem: 0,
    location: "C2-B1",
    is_serial: 0,
    sapak: 500006,
    item_name_en: "Whole Wheat Bread",
    item_order: 4
  },
  {
    item_id: 5,
    item_name: "מיץ תפוזים טבעי 1 ליטר",
    item_extended_description: "מיץ תפוזים סחוט טרי ללא תוספות",
    item_part_num: "7290011585764",
    barcode: "7290011585764",
    item_group_id: 3,
    storage_id: 3,
    quantity: 0, // אפס - סיים במלאי
    cost_nis: 15.00,
    sale_nis: 22.50,
    currency_id: 93,
    cost_mtc: 1.00,
    sale_mtc: 1.50,
    picture_link: null,
    exempt_vat: false,
    avitem: 0,
    location: "D1-A3",
    is_serial: 0,
    sapak: 500007,
    item_name_en: "Natural Orange Juice 1L",
    item_order: 5
  }
];

interface PrintJob {
  id: string;
  items: PackingItem[];
  status: 'pending' | 'printing' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export const PackingTestPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<PackingItem[]>([]);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printerStatus, setPrinterStatus] = useState({
    connected: false,
    model: 'Generic Thermal Printer',
    paperLevel: 85,
    ribbonLevel: 90
  });

  useEffect(() => {
    // Инициализация данных
    const initialItems = RivhitConverter.toPackingItems(mockRivhitItems);
    setPackingItems(initialItems);
    
    // Симуляция подключения принтера
    setTimeout(() => {
      setPrinterStatus(prev => ({ ...prev, connected: true }));
      notification.success({
        message: 'Принтер подключен',
        description: 'Принтер готов к печати этикеток',
        placement: 'topRight'
      });
    }, 2000);
  }, []);

  const handleItemsChange = (items: PackingItem[]) => {
    setPackingItems(items);
    const selected = items.filter(item => item.isPacked && item.isAvailable);
    setSelectedItems(selected);
  };

  const handlePrintLabels = async () => {
    if (selectedItems.length === 0) {
      notification.warning({
        message: 'אין פריטים נבחרים',
        description: 'בחר לפחות פריט אחד לפני הדפסת התוויות',
        placement: 'topRight'
      });
      return;
    }

    if (!printerStatus.connected) {
      notification.error({
        message: 'הפרינטר לא מחובר',
        description: 'נא לחבר את הפרינטר לפני הדפסה',
        placement: 'topRight'
      });
      return;
    }

    const jobId = `job_${Date.now()}`;
    const newPrintJob: PrintJob = {
      id: jobId,
      items: [...selectedItems],
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };

    setPrintJob(newPrintJob);
    setShowPrintModal(true);
    setCurrentStep(1);

    // Симуляция процесса печати
    await simulatePrintingProcess(newPrintJob);
  };

  const simulatePrintingProcess = async (job: PrintJob) => {
    try {
      // Обновляем статус на "печатаем"
      setPrintJob(prev => prev ? { ...prev, status: 'printing' } : null);

      // Симуляция процесса печати с прогрессом
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setPrintJob(prev => prev ? { ...prev, progress: i } : null);
      }

      // Завершение печати
      setPrintJob(prev => prev ? { 
        ...prev, 
        status: 'completed', 
        progress: 100,
        endTime: new Date()
      } : null);

      setCurrentStep(2);

      notification.success({
        message: 'הדפסה הושלמה בהצלחה!',
        description: `הודפסו ${job.items.length} תוויות`,
        placement: 'topRight',
        duration: 5
      });

    } catch (error) {
      setPrintJob(prev => prev ? { 
        ...prev, 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      } : null);

      notification.error({
        message: 'שגיאה בהדפסה',
        description: error instanceof Error ? error.message : 'Unknown error',
        placement: 'topRight'
      });
    }
  };

  const handleCompleteOrder = () => {
    notification.success({
      message: 'הזמנה הושלמה!',
      description: 'כל הפריטים הנבחרים ארוזים וההזמנה מוכנה למשלוח',
      placement: 'topRight'
    });
    setCurrentStep(3);
  };

  const resetTest = () => {
    setCurrentStep(0);
    setPrintJob(null);
    setShowPrintModal(false);
    const initialItems = RivhitConverter.toPackingItems(mockRivhitItems);
    setPackingItems(initialItems);
    setSelectedItems([]);
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'finish';
    if (step === currentStep) return 'process';
    return 'wait';
  };

  const availableItems = packingItems.filter(item => item.isAvailable);
  const unavailableItems = packingItems.filter(item => !item.isAvailable);
  const packedItemsCount = selectedItems.length;
  const totalValue = selectedItems.reduce((sum, item) => sum + (item.sale_nis * item.packedQuantity), 0);

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <Content style={{ padding: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* כותרת */}
          <div style={{ textAlign: 'center' }}>
            <Title level={1}>🧪 מבחן תהליך אריזת הזמנה</Title>
            <Text type="secondary">
              בחירת פריטים, סימון זמינות והדפסת תוויות
            </Text>
          </div>

          {/* שלבי התהליך */}
          <Card>
            <Steps current={currentStep} size="small">
              <Step 
                title="בחירת פריטים" 
                description="סמן פריטים זמינים לאריזה"
                status={getStepStatus(0)}
                icon={<ShoppingCartOutlined />}
              />
              <Step 
                title="הדפסת תוויות" 
                description="הדפס תוויות עם ברקודים"
                status={getStepStatus(1)}
                icon={<PrinterOutlined />}
              />
              <Step 
                title="סיום אריזה" 
                description="סיים את תהליך האריזה"
                status={getStepStatus(2)}
                icon={<InboxOutlined />}
              />
              <Step 
                title="הושלם" 
                description="ההזמנה מוכנה למשלוח"
                status={getStepStatus(3)}
                icon={<CheckCircleOutlined />}
              />
            </Steps>
          </Card>

          {/* סטטיסטיקות */}
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="פריטים זמינים"
                  value={availableItems.length}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="פריטים לא זמינים"
                  value={unavailableItems.length}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="נבחרו לאריזה"
                  value={packedItemsCount}
                  prefix={<InboxOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="ערך כולל"
                  value={totalValue}
                  precision={2}
                  prefix="₪"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* סטטוס הפרינטר */}
          <Card size="small">
            <Row align="middle" justify="space-between">
              <Col>
                <Space>
                  <PrinterOutlined style={{ fontSize: '16px', color: printerStatus.connected ? '#52c41a' : '#ff4d4f' }} />
                  <Text strong>{printerStatus.model}</Text>
                  <Tag color={printerStatus.connected ? 'green' : 'red'}>
                    {printerStatus.connected ? 'מחובר' : 'לא מחובר'}
                  </Tag>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Text type="secondary">נייר: {printerStatus.paperLevel}%</Text>
                  <Text type="secondary">סרט: {printerStatus.ribbonLevel}%</Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* בורר הפריטים */}
          <ItemSelector
            items={mockRivhitItems}
            onItemsChange={handleItemsChange}
            readOnly={currentStep >= 2}
            showSummary={true}
          />

          {/* כפתורי פעולה */}
          <Card>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<BarcodeOutlined />}
                onClick={handlePrintLabels}
                disabled={selectedItems.length === 0 || !printerStatus.connected || currentStep >= 2}
                loading={printJob?.status === 'printing'}
              >
                הדפס תוויות ({selectedItems.length})
              </Button>
              
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteOrder}
                disabled={selectedItems.length === 0 || currentStep < 2}
                style={{ backgroundColor: currentStep >= 2 ? '#52c41a' : undefined }}
              >
                סיים אריזה
              </Button>

              <Button
                size="large"
                onClick={resetTest}
              >
                איפוס מבחן
              </Button>
            </Space>
          </Card>

          {/* הודעות סטטוס */}
          {unavailableItems.length > 0 && (
            <Alert
              message={`${unavailableItems.length} פריטים לא זמינים במלאי`}
              description="הפריטים הבאים לא זמינים ולא ניתן לארוז אותם כרגע"
              type="warning"
              showIcon
              closable
            />
          )}

          {currentStep === 3 && (
            <Alert
              message="🎉 ההזמנה הושלמה בהצלחה!"
              description={`ארוזו ${packedItemsCount} פריטים בשווי כולל של ₪${totalValue.toFixed(2)}`}
              type="success"
              showIcon
              action={
                <Button size="small" type="primary" onClick={resetTest}>
                  התחל מבחן חדש
                </Button>
              }
            />
          )}
        </Space>

        {/* מודל הדפסה */}
        <Modal
          title="🖨️ הדפסת תוויות"
          open={showPrintModal}
          footer={null}
          onCancel={() => setShowPrintModal(false)}
          width={600}
          style={{ direction: 'rtl' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {printJob && (
              <>
                <Descriptions title="פרטי עבודת הדפסה" bordered size="small">
                  <Descriptions.Item label="מזהה עבודה">{printJob.id}</Descriptions.Item>
                  <Descriptions.Item label="מספר תוויות">{printJob.items.length}</Descriptions.Item>
                  <Descriptions.Item label="סטטוס">
                    <Tag color={
                      printJob.status === 'completed' ? 'green' :
                      printJob.status === 'printing' ? 'blue' :
                      printJob.status === 'failed' ? 'red' : 'orange'
                    }>
                      {printJob.status === 'completed' ? 'הושלם' :
                       printJob.status === 'printing' ? 'מדפיס' :
                       printJob.status === 'failed' ? 'נכשל' : 'ממתין'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>

                {printJob.status === 'printing' && (
                  <div>
                    <Text>התקדמות הדפסה:</Text>
                    <Progress 
                      percent={printJob.progress} 
                      status="active"
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                )}

                <Divider>פריטים להדפסה</Divider>
                
                <List
                  size="small"
                  dataSource={printJob.items}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.item_name}
                        description={
                          <Space>
                            <Text type="secondary">ברקוד: {item.barcode}</Text>
                            <Text type="secondary">כמות: {item.packedQuantity}</Text>
                            <Text type="secondary">מיקום: {item.location}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />

                {printJob.status === 'completed' && (
                  <Alert
                    message="הדפסה הושלמה בהצלחה!"
                    description={`${printJob.items.length} תוויות הודפסו בהצלחה`}
                    type="success"
                    showIcon
                  />
                )}

                {printJob.status === 'failed' && (
                  <Alert
                    message="שגיאה בהדפסה"
                    description={printJob.error}
                    type="error"
                    showIcon
                  />
                )}
              </>
            )}
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
};