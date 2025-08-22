import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { OrderSearchProps } from '../types/order.interfaces';

// Single Responsibility Principle - отвечает только за поиск
export const OrderSearch: React.FC<OrderSearchProps> = ({
  searchText,
  onSearchChange,
  onClear
}) => {
  return (
    <Input
      placeholder="חיפוש לפי מספר מסמך, לקוח או תאריך"
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => onSearchChange(e.target.value)}
      onClear={onClear}
      style={{ width: 300 }}
      allowClear
    />
  );
};