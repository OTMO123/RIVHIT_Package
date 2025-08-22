import React from 'react';
import { Card, Typography, Button } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export const PrintingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <PrinterOutlined style={{ fontSize: '64px', color: '#fa8c16', marginBottom: '24px' }} />
          <Title level={2}>Страница печати</Title>
          <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '24px' }}>
            Здесь будет управление принтером и печать этикеток
          </Text>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
            size="large"
            style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
          >
            Вернуться на главную
          </Button>
        </div>
      </Card>
    </div>
  );
};