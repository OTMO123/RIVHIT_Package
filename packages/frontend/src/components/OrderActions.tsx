import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { OrderActionsProps } from '../types/order.interfaces';

// Single Responsibility Principle - отвечает только за действия
export const OrderActions: React.FC<OrderActionsProps> = ({
  onRefresh,
  loading
}) => {
  return (
    <Button
      icon={<ReloadOutlined />}
      onClick={onRefresh}
      loading={loading}
    >
      רענן
    </Button>
  );
};