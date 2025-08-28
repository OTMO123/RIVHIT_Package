import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceModal } from '../InvoiceModal';
import * as apiService from '../../services/api.service';

// Mock API service
jest.mock('../../services/api.service');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock Ant Design components
jest.mock('antd', () => {
  const actualAntd = jest.requireActual('antd');
  return {
    ...actualAntd,
    Modal: ({ children, open, onCancel, title, ...props }: any) =>
      open ? (
        <div data-testid="invoice-modal" role="dialog" aria-label={title} {...props}>
          <div data-testid="modal-header">{title}</div>
          <button data-testid="modal-close" onClick={onCancel}>
            ×
          </button>
          <div data-testid="modal-body">{children}</div>
        </div>
      ) : null,
    Form: ({ children, onFinish, form }: any) => (
      <form data-testid="invoice-form" onSubmit={(e) => { e.preventDefault(); onFinish({}); }}>
        {children}
      </form>
    ),
    'Form.Item': ({ children, label, name, required }: any) => (
      <div data-testid={`form-item-${name}`} className="form-item">
        {label && <label htmlFor={name}>{label}{required && ' *'}</label>}
        {React.cloneElement(children, { name, id: name, required })}
      </div>
    ),
    Input: ({ value, onChange, placeholder, disabled, ...props }: any) => (
      <input
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`input-${props.name || 'input'}`}
        {...props}
      />
    ),
    'Input.TextArea': ({ value, onChange, rows, ...props }: any) => (
      <textarea
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        rows={rows}
        data-testid={`textarea-${props.name || 'textarea'}`}
        {...props}
      />
    ),
    Select: ({ value, onChange, children, placeholder, disabled, ...props }: any) => (
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        data-testid={`select-${props.name || 'select'}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    ),
    'Select.Option': ({ children, value }: any) => (
      <option value={value}>{children}</option>
    ),
    DatePicker: ({ value, onChange, disabled, ...props }: any) => (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        data-testid={`datepicker-${props.name || 'date'}`}
        {...props}
      />
    ),
    Button: ({ children, onClick, loading, disabled, type, htmlType, ...props }: any) => (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        type={htmlType || 'button'}
        data-loading={loading}
        data-type={type}
        data-testid={props['data-testid'] || 'button'}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    ),
    Table: ({ columns, dataSource, loading, ...props }: any) => (
      <div data-testid="invoice-items-table" data-loading={loading}>
        <table>
          <thead>
            <tr>
              {columns?.map((col: any, idx: number) => (
                <th key={idx}>{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataSource?.map((item: any, idx: number) => (
              <tr key={idx} data-testid={`table-row-${idx}`}>
                {columns?.map((col: any, colIdx: number) => (
                  <td key={colIdx}>
                    {typeof col.render === 'function' 
                      ? col.render(item[col.dataIndex], item, idx)
                      : item[col.dataIndex]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    Divider: ({ children }: any) => <hr data-testid="divider">{children}</hr>,
    Typography: {
      Title: ({ children, level }: any) => 
        React.createElement(`h${level || 1}`, { 'data-testid': 'typography-title' }, children),
      Text: ({ children, type, strong }: any) => 
        <span data-testid="typography-text" data-type={type} data-strong={strong}>
          {children}
        </span>
    },
    Space: ({ children, direction = 'horizontal' }: any) => (
      <div data-testid="space" data-direction={direction}>
        {children}
      </div>
    ),
    notification: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn()
    },
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      loading: jest.fn()
    }
  };
});

describe('InvoiceModal', () => {
  const mockOrder = {
    orderId: '39641',
    orderNumber: '39641',
    customerName: 'Test Customer Ltd.',
    customerData: {
      customer_id: 12345,
      customer_name: 'Test Customer Ltd.',
      customer_name_en: 'Test Customer Ltd.',
      phone: '050-1234567',
      email: 'test@customer.com',
      city: 'Tel Aviv',
      address: 'Rothschild Blvd 1',
      tax_id: '123456789'
    },
    items: [
      {
        item_id: '1',
        item_name: 'Blini Classic',
        item_name_hebrew: 'בליני קלאסי',
        quantity: 12,
        price: 25.0,
        total: 300.0,
        catalog_number: 'BLN001',
        barcode: '7290012345678',
        exempt_vat: false
      },
      {
        item_id: '2', 
        item_name: 'Pelmeni Beef',
        item_name_hebrew: 'פלמני בקר',
        quantity: 8,
        price: 36.0,
        total: 288.0,
        catalog_number: 'PLM001',
        barcode: '7290012345679',
        exempt_vat: false
      }
    ],
    totalAmount: 588.0,
    vatAmount: 99.96,
    totalWithVat: 687.96,
    currency: 'NIS',
    orderDate: '2025-01-01',
    deliveryDate: '2025-01-02'
  };

  const defaultProps = {
    open: true,
    order: mockOrder,
    onCancel: jest.fn(),
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses (READ-ONLY operations)
    mockApiService.prepareInvoiceData.mockResolvedValue({
      success: true,
      invoiceData: {
        invoice_number: 'INV-39641',
        customer_data: mockOrder.customerData,
        items: mockOrder.items,
        totals: {
          subtotal: 588.0,
          vat: 99.96,
          total: 687.96
        },
        issue_date: '2025-01-15',
        due_date: '2025-02-14'
      }
    });
    
    mockApiService.validateInvoiceData.mockResolvedValue({
      valid: true,
      warnings: [],
      errors: []
    });
  });

  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByTestId('invoice-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-header')).toHaveTextContent(/Create Invoice/);
    });

    it('should not render modal when closed', () => {
      render(<InvoiceModal {...defaultProps} open={false} />);
      
      expect(screen.queryByTestId('invoice-modal')).not.toBeInTheDocument();
    });

    it('should display order information in header', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByText(/Order #39641/)).toBeInTheDocument();
      expect(screen.getByText(/Test Customer Ltd\./)).toBeInTheDocument();
    });

    it('should close modal when close button clicked', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const closeButton = screen.getByTestId('modal-close');
      await userEvent.click(closeButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Invoice Form', () => {
    it('should display invoice form with customer data', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('input-customerName')).toHaveValue('Test Customer Ltd.');
        expect(screen.getByTestId('input-taxId')).toHaveValue('123456789');
        expect(screen.getByTestId('input-address')).toHaveValue('Rothschild Blvd 1');
        expect(screen.getByTestId('input-city')).toHaveValue('Tel Aviv');
      });
    });

    it('should pre-populate invoice date with current date', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const today = new Date().toISOString().split('T')[0];
      expect(screen.getByTestId('datepicker-issueDate')).toHaveValue(today);
    });

    it('should calculate due date based on payment terms', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const paymentTermsSelect = screen.getByTestId('select-paymentTerms');
      await userEvent.selectOptions(paymentTermsSelect, '30');
      
      await waitFor(() => {
        const expectedDueDate = new Date();
        expectedDueDate.setDate(expectedDueDate.getDate() + 30);
        const expectedDateString = expectedDueDate.toISOString().split('T')[0];
        
        expect(screen.getByTestId('datepicker-dueDate')).toHaveValue(expectedDateString);
      });
    });

    it('should allow editing customer information', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const addressInput = screen.getByTestId('input-address');
      
      await userEvent.clear(addressInput);
      await userEvent.type(addressInput, 'New Address 123');
      
      expect(addressInput).toHaveValue('New Address 123');
    });

    it('should validate required fields', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const customerNameInput = screen.getByTestId('input-customerName');
      
      await userEvent.clear(customerNameInput);
      
      // Form should show validation error
      const form = screen.getByTestId('invoice-form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        // Should prevent submission and show error
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Invoice Items Table', () => {
    it('should display all order items in table', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('invoice-items-table')).toBeInTheDocument();
        expect(screen.getByText('Blini Classic')).toBeInTheDocument();
        expect(screen.getByText('Pelmeni Beef')).toBeInTheDocument();
      });
    });

    it('should show item details correctly', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        // Check quantities
        expect(screen.getByText('12')).toBeInTheDocument(); // Blini quantity
        expect(screen.getByText('8')).toBeInTheDocument(); // Pelmeni quantity
        
        // Check prices
        expect(screen.getByText('25.00')).toBeInTheDocument(); // Blini price
        expect(screen.getByText('36.00')).toBeInTheDocument(); // Pelmeni price
        
        // Check totals
        expect(screen.getByText('300.00')).toBeInTheDocument(); // Blini total
        expect(screen.getByText('288.00')).toBeInTheDocument(); // Pelmeni total
      });
    });

    it('should display Hebrew item names when available', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('בליני קלאסי')).toBeInTheDocument();
        expect(screen.getByText('פלמני בקר')).toBeInTheDocument();
      });
    });

    it('should handle items with VAT exemption', async () => {
      const orderWithVATExempt = {
        ...mockOrder,
        items: [
          { 
            ...mockOrder.items[0], 
            exempt_vat: true 
          },
          mockOrder.items[1]
        ]
      };
      
      render(<InvoiceModal {...defaultProps} order={orderWithVATExempt} />);
      
      await waitFor(() => {
        expect(screen.getByText(/VAT Exempt/)).toBeInTheDocument();
      });
    });

    it('should show catalog numbers and barcodes', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('BLN001')).toBeInTheDocument();
        expect(screen.getByText('PLM001')).toBeInTheDocument();
        expect(screen.getByText('7290012345678')).toBeInTheDocument();
        expect(screen.getByText('7290012345679')).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Totals', () => {
    it('should calculate and display subtotal correctly', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Subtotal.*588\.00/)).toBeInTheDocument();
      });
    });

    it('should calculate VAT correctly', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/VAT.*99\.96/)).toBeInTheDocument();
      });
    });

    it('should display total with VAT', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total.*687\.96/)).toBeInTheDocument();
      });
    });

    it('should update totals when VAT rate changes', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const vatRateInput = screen.getByTestId('input-vatRate');
      
      await userEvent.clear(vatRateInput);
      await userEvent.type(vatRateInput, '0'); // 0% VAT
      
      await waitFor(() => {
        expect(screen.getByText(/VAT.*0\.00/)).toBeInTheDocument();
        expect(screen.getByText(/Total.*588\.00/)).toBeInTheDocument();
      });
    });

    it('should handle discount application', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const discountInput = screen.getByTestId('input-discount');
      
      await userEvent.clear(discountInput);
      await userEvent.type(discountInput, '10'); // 10% discount
      
      await waitFor(() => {
        expect(screen.getByText(/Discount.*58\.80/)).toBeInTheDocument(); // 10% of 588
        expect(screen.getByText(/Total.*619\.16/)).toBeInTheDocument(); // (588 - 58.8) * 1.17
      });
    });
  });

  describe('Invoice Preview (READ-ONLY)', () => {
    it('should show preview of invoice data', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      expect(mockApiService.prepareInvoiceData).toHaveBeenCalledWith(
        mockOrder.orderId,
        expect.objectContaining({
          customer: expect.any(Object),
          items: expect.any(Array),
          totals: expect.any(Object)
        })
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Invoice Preview/)).toBeInTheDocument();
        expect(screen.getByText('INV-39641')).toBeInTheDocument();
      });
    });

    it('should validate invoice data before preview', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      expect(mockApiService.validateInvoiceData).toHaveBeenCalled();
    });

    it('should show validation warnings', async () => {
      mockApiService.validateInvoiceData.mockResolvedValue({
        valid: true,
        warnings: ['Customer tax ID format may be incorrect'],
        errors: []
      });
      
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Customer tax ID format may be incorrect/)).toBeInTheDocument();
      });
    });

    it('should prevent preview if validation errors exist', async () => {
      mockApiService.validateInvoiceData.mockResolvedValue({
        valid: false,
        warnings: [],
        errors: ['Customer name is required', 'Invalid tax ID format']
      });
      
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Invalid tax ID format/)).toBeInTheDocument();
        expect(screen.queryByText(/Invoice Preview/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Actions', () => {
    it('should enable prepare button only when form is valid', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      
      // Should be enabled initially with valid data
      expect(prepareButton).not.toBeDisabled();
      
      // Clear required field
      const customerNameInput = screen.getByTestId('input-customerName');
      await userEvent.clear(customerNameInput);
      
      // Should be disabled
      await waitFor(() => {
        expect(prepareButton).toBeDisabled();
      });
    });

    it('should show loading state during preparation', async () => {
      mockApiService.prepareInvoiceData.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ 
            success: true, 
            invoiceData: { invoice_number: 'INV-39641' } 
          }), 100)
        )
      );
      
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      await userEvent.click(prepareButton);
      
      expect(prepareButton).toHaveAttribute('data-loading', 'true');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should call onSuccess after successful preparation', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      await userEvent.click(prepareButton);
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({
          success: true,
          invoiceData: expect.objectContaining({
            invoice_number: 'INV-39641'
          })
        });
      });
    });

    it('should cancel and close modal', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors during preparation', async () => {
      mockApiService.prepareInvoiceData.mockRejectedValue(new Error('API Error'));
      
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      await userEvent.click(prepareButton);
      
      await waitFor(() => {
        expect(require('antd').notification.error).toHaveBeenCalledWith({
          message: 'Invoice Preparation Failed',
          description: expect.stringContaining('API Error')
        });
      });
    });

    it('should handle validation API errors', async () => {
      mockApiService.validateInvoiceData.mockRejectedValue(new Error('Validation service unavailable'));
      
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      await waitFor(() => {
        expect(require('antd').message.error).toHaveBeenCalledWith(
          'Unable to validate invoice data'
        );
      });
    });

    it('should handle missing order data gracefully', () => {
      render(<InvoiceModal {...defaultProps} order={null} />);
      
      expect(screen.getByText('No order data available')).toBeInTheDocument();
      expect(screen.getByTestId('prepare-invoice-btn')).toBeDisabled();
    });

    it('should handle orders with no items', () => {
      const orderWithNoItems = { ...mockOrder, items: [] };
      
      render(<InvoiceModal {...defaultProps} order={orderWithNoItems} />);
      
      expect(screen.getByText('No items to invoice')).toBeInTheDocument();
      expect(screen.getByTestId('prepare-invoice-btn')).toBeDisabled();
    });

    it('should handle network timeouts', async () => {
      mockApiService.prepareInvoiceData.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      await userEvent.click(prepareButton);
      
      await waitFor(() => {
        expect(require('antd').notification.error).toHaveBeenCalledWith({
          message: 'Invoice Preparation Failed',
          description: expect.stringContaining('timeout')
        });
      });
    });
  });

  describe('Data Security (READ-ONLY)', () => {
    it('should only prepare invoice data without creating actual invoice', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const prepareButton = screen.getByTestId('prepare-invoice-btn');
      await userEvent.click(prepareButton);
      
      expect(mockApiService.prepareInvoiceData).toHaveBeenCalled();
      expect(mockApiService.createInvoice).not.toHaveBeenCalled(); // Should not create
    });

    it('should validate data without modifying database', async () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const previewButton = screen.getByText('Preview Invoice');
      await userEvent.click(previewButton);
      
      expect(mockApiService.validateInvoiceData).toHaveBeenCalled();
      expect(mockApiService.updateOrderStatus).not.toHaveBeenCalled(); // Should not update
    });

    it('should display read-only warning', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByText(/Preview Only - No Invoice Will Be Created/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const modal = screen.getByTestId('invoice-modal');
      expect(modal).toHaveAttribute('aria-label', expect.stringContaining('Create Invoice'));
    });

    it('should have proper form field labels', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByText('Customer Name *')).toBeInTheDocument();
      expect(screen.getByText('Tax ID *')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    it('should indicate required fields properly', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const requiredFields = screen.getAllByText(content => content.includes('*'));
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const customerNameInput = screen.getByTestId('input-customerName');
      customerNameInput.focus();
      
      expect(customerNameInput).toHaveFocus();
      
      userEvent.tab();
      
      const taxIdInput = screen.getByTestId('input-taxId');
      expect(taxIdInput).toHaveFocus();
    });

    it('should provide screen reader friendly table', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const table = screen.getByTestId('invoice-items-table');
      expect(table).toHaveAttribute('role', 'table');
    });
  });

  describe('Internationalization', () => {
    it('should display Hebrew item names', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByText('בליני קלאסי')).toBeInTheDocument();
      expect(screen.getByText('פלמני בקר')).toBeInTheDocument();
    });

    it('should format currency correctly', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      expect(screen.getByText(/588\.00 NIS/)).toBeInTheDocument();
      expect(screen.getByText(/687\.96 NIS/)).toBeInTheDocument();
    });

    it('should handle RTL text direction for Hebrew', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const hebrewElements = screen.getAllByText(/[\u0590-\u05FF]/);
      
      hebrewElements.forEach(element => {
        expect(element).toHaveStyle({ direction: 'rtl' });
      });
    });

    it('should format dates according to locale', () => {
      render(<InvoiceModal {...defaultProps} />);
      
      const today = new Date().toLocaleDateString('he-IL');
      expect(screen.getByDisplayValue(today)).toBeInTheDocument();
    });
  });
});