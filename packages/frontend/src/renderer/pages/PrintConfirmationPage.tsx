import React from 'react';
import { Layout, Card, Typography, Space, Button, Result } from 'antd';
import { CheckCircleOutlined, HomeOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Content } = Layout;
const { Title, Text } = Typography;

export const PrintConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const orderId = searchParams.get('orderId');
  const jobId = searchParams.get('jobId');
  const printType = searchParams.get('type');

  const handleBackToOrders = () => {
    navigate('/');
  };

  const handleViewOrder = () => {
    if (orderId) {
      navigate(`/orders/${orderId}`);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <Content style={{ padding: '24px' }}>
        <Card style={{ maxWidth: '600px', margin: '0 auto', marginTop: '100px' }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="הדפסה הושלמה בהצלחה!"
            subTitle={
              <Space direction="vertical" style={{ textAlign: 'center' }}>
                <Text>
                  {printType === 'shipping' 
                    ? 'תווית המשלוח הודפסה בהצלחה'
                    : 'תוויות המוצרים הודפסו בהצלחה'
                  }
                </Text>
                {orderId && (
                  <Text type="secondary">
                    הזמנה #{orderId}
                  </Text>
                )}
                {jobId && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    מזהה משימה: {jobId}
                  </Text>
                )}
              </Space>
            }
            extra={
              <Space>
                <Button 
                  type="primary" 
                  icon={<HomeOutlined />}
                  onClick={handleBackToOrders}
                >
                  חזרה לרשימת הזמנות
                </Button>
                {orderId && (
                  <Button 
                    icon={<PrinterOutlined />}
                    onClick={handleViewOrder}
                  >
                    חזרה להזמנה
                  </Button>
                )}
              </Space>
            }
          />
        </Card>
      </Content>
    </Layout>
  );
};