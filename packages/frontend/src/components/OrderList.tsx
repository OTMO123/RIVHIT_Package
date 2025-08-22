import React, { useState, useEffect, useMemo } from 'react';
import { Table, Card, Input, Button, Space, Tag, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { RivhitDocument } from '@packing/shared';
import { 
  OrderListProps,
  IOrderDisplayService,
  IOrderFilterService,
  OrderEventHandlers
} from '../types/order.interfaces';
import { OrderServiceFactory } from '../services/order.services';
import { OrderSearch } from './OrderSearch';
import { OrderTable } from './OrderTable';
import { OrderActions } from './OrderActions';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

// Single Responsibility Principle - компонент только управляет состоянием
export const OrderList: React.FC<OrderListProps> = ({
  orders,
  loading,
  onOrderSelect,
  onRefresh
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredOrders, setFilteredOrders] = useState<RivhitDocument[]>(orders);

  // Dependency Inversion Principle - зависим от абстракций, а не от конкретных реализаций
  const displayService = useMemo<IOrderDisplayService>(() => 
    OrderServiceFactory.createDisplayService(), []);
  const filterService = useMemo<IOrderFilterService>(() => 
    OrderServiceFactory.createFilterService(), []);

  useEffect(() => {
    const filtered = filterService.filterByText(orders, searchText);
    setFilteredOrders(filtered);
  }, [searchText, orders, filterService]);

  // Single Responsibility Principle - каждый обработчик отвечает за одну функцию
  const eventHandlers: OrderEventHandlers = useMemo(() => ({
    onSearch: (text: string) => setSearchText(text),
    onSelect: onOrderSelect,
    onRefresh: onRefresh,
    onClearSearch: () => setSearchText('')
  }), [onOrderSelect, onRefresh]);

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>
            רשימת הזמנות
          </Title>
          <Space>
            <OrderSearch
              searchText={searchText}
              onSearchChange={eventHandlers.onSearch}
              onClear={eventHandlers.onClearSearch}
            />
            <OrderActions
              onRefresh={eventHandlers.onRefresh}
              loading={loading}
            />
          </Space>
        </Space>
      </div>

      <OrderTable
        orders={filteredOrders}
        loading={loading}
        onOrderSelect={eventHandlers.onSelect}
        displayService={displayService}
      />
    </Card>
  );
};