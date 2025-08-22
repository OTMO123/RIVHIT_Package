import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderList } from '../OrderList';
import { RivhitDocument } from '@packing/shared';

// Mock Ant Design components
jest.mock('antd', () => ({
  Table: ({ columns, dataSource, loading, rowKey, onRow, ...props }: any) => (
    <div data-testid="order-table" data-loading={loading}>
      {dataSource?.map((item: any) => (
        <div key={item[rowKey]} data-testid="order-row">
          <span>{item.document_number}</span>
          <span>{item.customer_id}</span>
          <button onClick={() => props.onOrderSelect?.(item)}>בחר</button>
        </div>
      ))}
    </div>
  ),
  Card: ({ children }: any) => <div data-testid="order-card">{children}</div>,
  Input: ({ onChange, value, ...props }: any) => (
    <input
      data-testid="search-input"
      onChange={(e) => onChange?.(e)}
      value={value}
      {...props}
    />
  ),
  Button: ({ onClick, loading, children, ...props }: any) => (
    <button
      data-testid={props['data-testid'] || 'button'}
      onClick={onClick}
      disabled={loading}
    >
      {children}
    </button>
  ),
  Space: ({ children }: any) => <div>{children}</div>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Typography: {
    Title: ({ children }: any) => <h1>{children}</h1>
  }
}));

const mockOrders: RivhitDocument[] = [
  {
    document_type: 1,
    document_number: 123,
    issue_date: '2023-01-01',
    total_amount: 100,
    customer_id: 1,
    currency_id: 1
  },
  {
    document_type: 2,
    document_number: 124,
    issue_date: '2023-01-02',
    total_amount: 200,
    customer_id: 2,
    currency_id: 1
  }
];

describe('OrderList', () => {
  const defaultProps = {
    orders: mockOrders,
    loading: false,
    onOrderSelect: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render order list with correct title', () => {
      render(<OrderList {...defaultProps} />);
      
      expect(screen.getByText('רשימת הזמנות')).toBeInTheDocument();
      expect(screen.getByTestId('order-table')).toBeInTheDocument();
    });

    it('should render all orders', () => {
      render(<OrderList {...defaultProps} />);
      
      const orderRows = screen.getAllByTestId('order-row');
      expect(orderRows).toHaveLength(2);
    });

    it('should show loading state', () => {
      render(<OrderList {...defaultProps} loading={true} />);
      
      const table = screen.getByTestId('order-table');
      expect(table).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Search functionality', () => {
    it('should filter orders by document number', async () => {
      render(<OrderList {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: '123' } });

      await waitFor(() => {
        expect(screen.getByText('123')).toBeInTheDocument();
        expect(screen.queryByText('124')).not.toBeInTheDocument();
      });
    });

    it('should filter orders by customer ID', async () => {
      render(<OrderList {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: '2' } });

      await waitFor(() => {
        expect(screen.getByText('124')).toBeInTheDocument();
        expect(screen.queryByText('123')).not.toBeInTheDocument();
      });
    });

    it('should clear search filter', async () => {
      render(<OrderList {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: '123' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('123')).toBeInTheDocument();
        expect(screen.getByText('124')).toBeInTheDocument();
      });
    });
  });

  describe('Order selection', () => {
    it('should call onOrderSelect when order is selected', () => {
      render(<OrderList {...defaultProps} />);
      
      const selectButtons = screen.getAllByText('בחר');
      fireEvent.click(selectButtons[0]);

      expect(defaultProps.onOrderSelect).toHaveBeenCalledWith(mockOrders[0]);
    });

    it('should call onOrderSelect with correct order data', () => {
      render(<OrderList {...defaultProps} />);
      
      const selectButtons = screen.getAllByText('בחר');
      fireEvent.click(selectButtons[1]);

      expect(defaultProps.onOrderSelect).toHaveBeenCalledWith(mockOrders[1]);
    });
  });

  describe('Refresh functionality', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      render(<OrderList {...defaultProps} />);
      
      const refreshButton = screen.getByText('רענן');
      fireEvent.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe('Empty state', () => {
    it('should handle empty orders array', () => {
      render(<OrderList {...defaultProps} orders={[]} />);
      
      const table = screen.getByTestId('order-table');
      expect(table).toBeInTheDocument();
      expect(screen.queryByTestId('order-row')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid search input gracefully', async () => {
      render(<OrderList {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'invalid-search' } });

      await waitFor(() => {
        expect(screen.queryByTestId('order-row')).not.toBeInTheDocument();
      });
    });
  });
});