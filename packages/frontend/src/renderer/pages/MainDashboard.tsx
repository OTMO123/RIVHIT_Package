import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Spin } from 'antd';
import {
  ContainerOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useI18n } from '../i18n/i18n';
import { apiService } from '../services/api.service';

const { Title, Text } = Typography;

interface DashboardStats {
  newOrders: number;
  inProgress: number;
  completedToday: number;
  labelsPrinted: number;
}

export const MainDashboard: React.FC = () => {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DashboardStats>({
    newOrders: 12,
    inProgress: 3,
    completedToday: 28,
    labelsPrinted: 145
  });
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load only first page for stats calculation to reduce API load
      const result = await apiService.getOrdersPaginated({
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        page: 1,
        pageSize: 50 // Load more for better stats accuracy
      });
      
      const orders = result.data;
      const newOrders = orders.filter(o => o.status === 'pending').length;
      const inProgress = orders.filter(o => o.status === 'processing').length;
      const completedToday = orders.filter(o => o.status === 'packed' || o.status === 'shipped').length;
      
      // Estimate total based on first page
      const totalEstimate = result.pagination.total;
      const estimationFactor = totalEstimate / Math.max(orders.length, 1);
      
      setStats({
        newOrders: Math.round(newOrders * estimationFactor),
        inProgress: Math.round(inProgress * estimationFactor),
        completedToday: Math.round(completedToday * estimationFactor),
        labelsPrinted: 145 // This would come from printer service
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* Welcome Header */}
        <Card>
          <Title level={2} style={{ margin: 0, textAlign: 'center' }}>
            🎯 RIVHIT Packing System
          </Title>
          <Text type="secondary" style={{ fontSize: '16px', display: 'block', textAlign: 'center' }}>
            {locale === 'he' && 'ברוכים הבאים למערכת אריזה של RIVHIT'}
            {locale === 'ru' && 'Добро пожаловать в систему упаковки RIVHIT'}
            {locale === 'en' && 'Welcome to RIVHIT Packing System'}
            {locale === 'ar' && 'مرحباً بك في نظام تعبئة RIVHIT'}
          </Text>
        </Card>


        {/* Quick Summary */}
        <Card>
          <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
            📊 {locale === 'he' ? 'סיכום עבודה' : locale === 'ru' ? 'Сводка по работе' : locale === 'en' ? 'Work Summary' : 'ملخص العمل'}
          </Title>
          <Spin spinning={loading}>
            <Row gutter={16} justify="center">
              <Col span={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <ClockCircleOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{stats.newOrders}</div>
                  <div style={{ color: '#666' }}>
                    {locale === 'he' ? 'הזמנות חדשות' : locale === 'ru' ? 'Новые заказы' : locale === 'en' ? 'New Orders' : 'طلبات جديدة'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <ContainerOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>{stats.inProgress}</div>
                  <div style={{ color: '#666' }}>
                    {locale === 'he' ? 'בתהליך' : locale === 'ru' ? 'В процессе' : locale === 'en' ? 'In Progress' : 'قيد التنفيذ'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{stats.completedToday}</div>
                  <div style={{ color: '#666' }}>
                    {locale === 'he' ? 'הושלם היום' : locale === 'ru' ? 'Выполнено сегодня' : locale === 'en' ? 'Completed Today' : 'اكتمل اليوم'}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <PrinterOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>{stats.labelsPrinted}</div>
                  <div style={{ color: '#666' }}>
                    {locale === 'he' ? 'תוויות נדפסו' : locale === 'ru' ? 'Этикеток напечатано' : locale === 'en' ? 'Labels Printed' : 'ملصقات مطبوعة'}
                  </div>
                </div>
              </Col>
            </Row>
          </Spin>
        </Card>

      </Space>
    </div>
  );
};
