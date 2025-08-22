import React from 'react';
import { Table, Button, Tag } from 'antd';
import { RivhitDocument } from '@packing/shared';
import { OrderTableProps } from '../types/order.interfaces';
import type { ColumnsType } from 'antd/es/table';

// Single Responsibility Principle - отвечает только за отображение таблицы
export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  onOrderSelect,
  displayService
}) => {
  const columns: ColumnsType<RivhitDocument> = [
    {
      title: 'מספר מסמך',
      dataIndex: 'document_number',
      key: 'document_number',
      width: 120,
      sorter: (a, b) => (a.document_number ?? 0) - (b.document_number ?? 0),
      render: (text: number) => (
        <span style={{ fontWeight: 'bold' }}>{text}</span>
      )
    },
    {
      title: 'סוג מסמך',
      dataIndex: 'document_type',
      key: 'document_type',
      width: 100,
      render: (type: number) => (
        <Tag color="blue">{displayService.formatDocumentType(type)}</Tag>
      ),
      filters: [
        { text: 'הזמנה', value: 1 },
        { text: 'חשבונית', value: 2 },
        { text: 'תעודת משלוח', value: 3 },
        { text: 'החזרה', value: 4 }
      ],
      onFilter: (value, record) => record.document_type === value
    },
    {
      title: 'תאריך',
      dataIndex: 'issue_date',
      key: 'issue_date',
      width: 120,
      sorter: (a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime(),
      render: (date: string) => displayService.formatDate(date)
    },
    {
      title: 'שעה',
      dataIndex: 'document_time',
      key: 'document_time',
      width: 100,
      render: (time: string) => time
    },
    {
      title: 'לקוח',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 100,
      render: (customerId: number) => (
        <span>{customerId}</span>
      )
    },
    {
      title: 'סכום',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      sorter: (a, b) => (a.total_amount ?? 0) - (b.total_amount ?? 0),
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>
          {displayService.formatAmount(amount)}
        </span>
      )
    },
    {
      title: 'פעולות',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => onOrderSelect(record)}
        >
          בחר
        </Button>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={orders}
      loading={loading}
      rowKey="document_number"
      scroll={{ x: 800 }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} מתוך ${total} הזמנות`
      }}
      locale={{
        emptyText: 'לא נמצאו הזמנות',
        filterTitle: 'סינון',
        filterConfirm: 'אישור',
        filterReset: 'אפס',
        selectAll: 'בחר הכל',
        selectInvert: 'הפוך בחירה'
      }}
      style={{ direction: 'rtl' }}
    />
  );
};