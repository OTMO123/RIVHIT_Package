import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingWorkflowModal } from '../PackingWorkflowModal';
import * as apiService from '../../services/api.service';

// Mock API service
jest.mock('../../services/api.service');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock Ant Design components that might have issues in tests
jest.mock('antd', () => {
  const actualAntd = jest.requireActual('antd');
  return {
    ...actualAntd,
    Modal: ({ children, open, onCancel, ...props }: any) =>
      open ? (
        <div data-testid="modal" {...props}>
          <button data-testid="modal-close" onClick={onCancel}>
            Close
          </button>
          {children}
        </div>
      ) : null,
    Steps: ({ current, children }: any) => (
      <div data-testid="steps" data-current={current}>
        {children}
      </div>
    ),
    Button: ({ children, onClick, loading, disabled, ...props }: any) => (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        data-loading={loading}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    ),
    Input: ({ onChange, value, ...props }: any) => (
      <input
        onChange={(e) => onChange?.(e)}
        value={value}
        {...props}
      />
    ),
    Select: ({ onChange, value, children, ...props }: any) => (
      <select
        onChange={(e) => onChange?.(e.target.value)}
        value={value}
        {...props}
      >
        {children}
      </select>
    ),
    notification: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn()
    }
  };
});

describe('PackingWorkflowModal', () => {
  const mockOrder = {
    orderId: '39641',
    orderNumber: '39641',
    customerName: 'Test Customer',
    customerCity: 'Tel Aviv',
    items: [
      {
        item_id: '1',
        item_name: 'Blini',
        item_name_hebrew: 'בליני',
        item_name_russian: 'Блины',
        quantity: 12,
        packed_quantity: 0,
        barcode: '7290012345678',
        catalog_number: 'BLN001',
        price: 25.0
      },
      {
        item_id: '2',
        item_name: 'Pelmeni',
        item_name_hebrew: 'פלמני',
        item_name_russian: 'Пельмени',
        quantity: 8,
        packed_quantity: 0,
        barcode: '7290012345679',
        catalog_number: 'PLM001',
        price: 36.0
      }
    ],
    totalAmount: 636.0,
    currency: 'NIS',
    orderDate: '2025-01-01',
    deliveryDate: '2025-01-02'
  };

  const defaultProps = {
    open: true,
    order: mockOrder,
    onCancel: jest.fn(),
    onComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockApiService.getDraftBoxes.mockResolvedValue([]);
    mockApiService.getDraftPackingData.mockResolvedValue({});
    mockApiService.saveDraftBoxes.mockResolvedValue();
    mockApiService.saveDraftPackingData.mockResolvedValue();
    mockApiService.updateOrderStatus.mockResolvedValue({ success: true });
    mockApiService.generateBoxLabels.mockResolvedValue({ success: true, labels: [] });
  });

  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('Order #39641')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(<PackingWorkflowModal {...defaultProps} open={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should display order information correctly', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('Tel Aviv')).toBeInTheDocument();
      expect(screen.getByText('636.0 NIS')).toBeInTheDocument();
    });

    it('should display all order items', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      expect(screen.getByText('Blini')).toBeInTheDocument();
      expect(screen.getByText('Pelmeni')).toBeInTheDocument();
      expect(screen.getByText('בליני')).toBeInTheDocument(); // Hebrew
      expect(screen.getByText('Пельмени')).toBeInTheDocument(); // Russian
    });
  });

  describe('Step Navigation', () => {
    it('should start at step 1 (packing)', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const steps = screen.getByTestId('steps');
      expect(steps).toHaveAttribute('data-current', '0'); // 0-indexed
    });

    it('should navigate to next step when items are packed', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Pack all items
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      const nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        const steps = screen.getByTestId('steps');
        expect(steps).toHaveAttribute('data-current', '1');
      });
    });

    it('should not allow navigation if items not fully packed', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Pack only partially
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '5'); // Partial packing
      
      const nextButton = screen.getByText('Next: Box Configuration');
      expect(nextButton).toBeDisabled();
    });

    it('should allow navigation back to previous step', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Navigate to step 2
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      const nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        const backButton = screen.getByText('Back to Packing');
        expect(backButton).toBeInTheDocument();
      });
      
      const backButton = screen.getByText('Back to Packing');
      await userEvent.click(backButton);
      
      await waitFor(() => {
        const steps = screen.getByTestId('steps');
        expect(steps).toHaveAttribute('data-current', '0');
      });
    });
  });

  describe('Packing Step', () => {
    it('should update item quantities correctly', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '10');
      
      expect(quantityInputs[0]).toHaveValue('10');
    });

    it('should not allow quantities greater than ordered', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '15'); // More than ordered (12)
      
      // Should be capped at ordered quantity
      await waitFor(() => {
        expect(quantityInputs[0]).toHaveValue('12');
      });
    });

    it('should validate negative quantities', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '-5');
      
      await waitFor(() => {
        expect(quantityInputs[0]).toHaveValue('0');
      });
    });

    it('should assign items to boxes', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const boxSelects = screen.getAllByTestId(/box-select/);
      
      await userEvent.selectOptions(boxSelects[0], '2');
      
      expect(boxSelects[0]).toHaveValue('2');
    });

    it('should show packing progress', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Initially should show 0% packed
      expect(screen.getByText('0% Packed')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-percent', '0');
    });

    it('should update packing progress as items are packed', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      // Pack first item completely (12 out of 20 total items = 60%)
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '12');
      
      await waitFor(() => {
        expect(screen.getByText('60% Packed')).toBeInTheDocument();
      });
    });
  });

  describe('Box Configuration Step', () => {
    beforeEach(async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Navigate to box configuration step
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      const nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        const steps = screen.getByTestId('steps');
        expect(steps).toHaveAttribute('data-current', '1');
      });
    });

    it('should display box summary', () => {
      expect(screen.getByText('Box Summary')).toBeInTheDocument();
    });

    it('should show boxes with items', () => {
      expect(screen.getByText('Box 1')).toBeInTheDocument();
      // Should show items assigned to each box
    });

    it('should allow adding new boxes', async () => {
      const addBoxButton = screen.getByText('Add Box');
      await userEvent.click(addBoxButton);
      
      await waitFor(() => {
        expect(screen.getByText('Box 2')).toBeInTheDocument();
      });
    });

    it('should allow removing empty boxes', async () => {
      const addBoxButton = screen.getByText('Add Box');
      await userEvent.click(addBoxButton);
      
      await waitFor(() => {
        const removeButton = screen.getByTestId('remove-box-2');
        expect(removeButton).toBeInTheDocument();
      });
      
      const removeButton = screen.getByTestId('remove-box-2');
      await userEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Box 2')).not.toBeInTheDocument();
      });
    });

    it('should not allow removing boxes with items', async () => {
      // Try to remove box 1 which should have items
      const removeButton = screen.queryByTestId('remove-box-1');
      
      if (removeButton) {
        expect(removeButton).toBeDisabled();
      } else {
        // Remove button should not exist for boxes with items
        expect(removeButton).not.toBeInTheDocument();
      }
    });

    it('should show total weight calculation', () => {
      expect(screen.getByText(/Total Weight:/)).toBeInTheDocument();
    });
  });

  describe('Label Generation Step', () => {
    beforeEach(async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Navigate through all steps to label generation
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      let nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        nextButton = screen.getByText('Next: Generate Labels');
      });
      
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        const steps = screen.getByTestId('steps');
        expect(steps).toHaveAttribute('data-current', '2');
      });
    });

    it('should show label generation options', () => {
      expect(screen.getByText('Generate Labels')).toBeInTheDocument();
      expect(screen.getByText('Label Size')).toBeInTheDocument();
    });

    it('should allow selecting label size', async () => {
      const sizeSelect = screen.getByTestId('label-size-select');
      
      await userEvent.selectOptions(sizeSelect, 'large');
      
      expect(sizeSelect).toHaveValue('large');
    });

    it('should generate labels when clicked', async () => {
      const generateButton = screen.getByText('Generate & Print Labels');
      
      await userEvent.click(generateButton);
      
      expect(mockApiService.generateBoxLabels).toHaveBeenCalledWith(
        mockOrder.orderId,
        expect.objectContaining({
          labelSize: expect.any(String),
          boxes: expect.any(Array)
        })
      );
    });

    it('should show loading state during generation', async () => {
      mockApiService.generateBoxLabels.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, labels: [] }), 100))
      );
      
      const generateButton = screen.getByText('Generate & Print Labels');
      
      await userEvent.click(generateButton);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(generateButton).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Data Persistence', () => {
    it('should load draft data on modal open', async () => {
      const draftBoxes = [
        { boxNumber: 1, items: [{ item_id: '1', quantity: 6 }] }
      ];
      const draftPacking = {
        '1': { quantity: 6, boxNumber: 1 }
      };
      
      mockApiService.getDraftBoxes.mockResolvedValue(draftBoxes);
      mockApiService.getDraftPackingData.mockResolvedValue(draftPacking);
      
      render(<PackingWorkflowModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockApiService.getDraftBoxes).toHaveBeenCalledWith(mockOrder.orderId);
        expect(mockApiService.getDraftPackingData).toHaveBeenCalledWith(mockOrder.orderId);
      });
    });

    it('should save draft data when packing changes', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      await userEvent.clear(quantityInputs[0]);
      await userEvent.type(quantityInputs[0], '10');
      
      // Should debounce and save after typing
      await waitFor(() => {
        expect(mockApiService.saveDraftPackingData).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should clear draft data on completion', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Navigate to completion
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      // Go through all steps and complete
      let nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        nextButton = screen.getByText('Next: Generate Labels');
      });
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        const completeButton = screen.getByText('Complete Order');
      });
      
      const completeButton = screen.getByText('Complete Order');
      await userEvent.click(completeButton);
      
      await waitFor(() => {
        expect(mockApiService.clearDraftData).toHaveBeenCalledWith(mockOrder.orderId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiService.saveDraftPackingData.mockRejectedValue(new Error('API Error'));
      
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '10');
      
      // Should show error notification
      await waitFor(() => {
        // Assuming notification.error is mocked
        expect(require('antd').notification.error).toHaveBeenCalled();
      });
    });

    it('should handle missing order data', () => {
      const { rerender } = render(<PackingWorkflowModal {...defaultProps} />);
      
      rerender(<PackingWorkflowModal {...defaultProps} order={null} />);
      
      // Should not crash and show appropriate message
      expect(screen.getByText('No order data available')).toBeInTheDocument();
    });

    it('should handle empty items array', () => {
      const orderWithNoItems = { ...mockOrder, items: [] };
      
      render(<PackingWorkflowModal {...defaultProps} order={orderWithNoItems} />);
      
      expect(screen.getByText('No items to pack')).toBeInTheDocument();
    });

    it('should handle network errors during label generation', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      // Navigate to label generation
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      let nextButton = screen.getByText('Next: Box Configuration');
      await userEvent.click(nextButton);
      
      await waitFor(() => {
        nextButton = screen.getByText('Next: Generate Labels');
      });
      await userEvent.click(nextButton);
      
      mockApiService.generateBoxLabels.mockRejectedValue(new Error('Network Error'));
      
      const generateButton = screen.getByText('Generate & Print Labels');
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(require('antd').notification.error).toHaveBeenCalledWith({
          message: 'Label Generation Failed',
          description: expect.stringContaining('Network Error')
        });
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      quantityInputs[0].focus();
      expect(quantityInputs[0]).toHaveFocus();
      
      userEvent.tab();
      expect(quantityInputs[1]).toHaveFocus();
    });

    it('should support enter to advance steps', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      await userEvent.type(quantityInputs[1], '8');
      
      // Press Enter should advance to next step
      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        const steps = screen.getByTestId('steps');
        expect(steps).toHaveAttribute('data-current', '1');
      });
    });

    it('should support escape to close modal', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      await userEvent.keyboard('{Escape}');
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const modal = screen.getByTestId('modal');
      expect(modal).toHaveAttribute('aria-label', expect.stringContaining('Packing Workflow'));
    });

    it('should have proper form labels', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      
      quantityInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label');
      });
    });

    it('should indicate required fields', () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const requiredFields = screen.getAllByRequired();
      
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('should provide screen reader announcements for progress', async () => {
      render(<PackingWorkflowModal {...defaultProps} />);
      
      const quantityInputs = screen.getAllByTestId(/quantity-input/);
      await userEvent.type(quantityInputs[0], '12');
      
      await waitFor(() => {
        const announcement = screen.getByText('60% Packed');
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});