import React from 'react';
import { Card, Typography, Button } from 'antd';
import { ArrowLeftOutlined, ContainerOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export const PackingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <ContainerOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '24px' }} />
          <Title level={2}>Страница упаковки</Title>
          <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '24px' }}>
            Здесь будет процесс упаковки заказов с сканированием товаров
          </Text>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
            size="large"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Вернуться на главную
          </Button>
        </div>
      </Card>
    </div>
  );
};