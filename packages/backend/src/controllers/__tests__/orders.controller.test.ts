import { Request, Response } from 'express';
import { OrdersController } from '../orders.controller';
import { IRivhitService } from '../../interfaces/IRivhitService';
import { RivhitDocument } from '@packing/shared';

// Mock RivhitService
const mockRivhitService: jest.Mocked<IRivhitService> = {
  getDocuments: jest.fn(),
  getItems: jest.fn(),
  getCustomer: jest.fn(),
  getCustomers: jest.fn(),
  updateOrderStatus: jest.fn(),
  syncPendingOrderUpdates: jest.fn(),
  getDocumentDetails: jest.fn()
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new OrdersController(mockRivhitService);
    
    mockRequest = {
      query: {},
      params: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('getOrders', () => {
    const mockOrders: RivhitDocument[] = [
      {
        document_type: 1,
        document_number: 123,
        issue_date: '2023-01-01',
        due_date: '2023-01-07',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'Test order',
        project_id: 1,
        agent_id: 1,
        customer_id: 1,
        total_amount: 100,
        vat_amount: 17,
        status: 1,
        created_date: '2023-01-01T08:00:00Z',
        updated_date: '2023-01-01T08:00:00Z'
      }
    ];

    it('should return orders successfully', async () => {
      // Arrange
      mockRivhitService.getDocuments.mockResolvedValue(mockOrders);

      // Act
      await controller.getOrders(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRivhitService.getDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.any(String) // Controller always adds default date
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders,
        message: 'Orders retrieved successfully'
      });
    });

    it('should handle query parameters', async () => {
      // Arrange
      mockRequest.query = {
        fromDate: '2023-01-01',
        toDate: '2023-01-31',
        documentType: '1'
      };
      mockRivhitService.getDocuments.mockResolvedValue(mockOrders);

      // Act
      await controller.getOrders(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRivhitService.getDocuments).toHaveBeenCalledWith({
        date_from: '2023-01-01',
        date_to: '2023-01-31',
        document_type: 1
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      mockRivhitService.getDocuments.mockRejectedValue(error);

      // Act
      await controller.getOrders(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve orders',
        message: 'Service error'
      });
    });

    it('should handle invalid document type', async () => {
      // Arrange
      mockRequest.query = {
        documentType: 'invalid'
      };

      // Act
      await controller.getOrders(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve orders',
        message: 'documentType must be a number'
      });
    });
  });

  describe('getOrderById', () => {
    const mockOrder: RivhitDocument = {
      document_type: 1,
      document_number: 123,
      issue_date: '2023-01-01',
      due_date: '2023-01-07',
      currency_id: 1,
      discount_type: 0,
      discount_value: 0,
      comments: 'Test order',
      project_id: 1,
      agent_id: 1,
      customer_id: 1,
      total_amount: 100,
      vat_amount: 17,
      status: 1,
      created_date: '2023-01-01T08:00:00Z',
      updated_date: '2023-01-01T08:00:00Z'
    };

    it('should return order by ID successfully', async () => {
      // Arrange
      mockRequest.params = { id: '123' };
      mockRivhitService.getDocuments.mockResolvedValue([mockOrder]);

      // Act
      await controller.getOrderById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRivhitService.getDocuments).toHaveBeenCalledWith({
        date_from: expect.any(String) // Controller uses date-based filtering
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
        message: 'Order retrieved successfully'
      });
    });

    it('should return 404 when order not found', async () => {
      // Arrange
      mockRequest.params = { id: '999' };
      mockRivhitService.getDocuments.mockResolvedValue([]);

      // Act
      await controller.getOrderById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order not found',
        message: 'Order with ID 999 not found'
      });
    });

    it('should handle invalid order ID', async () => {
      // Arrange
      mockRequest.params = { id: 'invalid' };

      // Act
      await controller.getOrderById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve order',
        message: 'order ID must be a number'
      });
    });
  });

  describe('getOrderItems', () => {
    it('should return order items successfully', async () => {
      // Arrange
      mockRequest.params = { id: '123' };
      const mockItems = [
        {
          item_id: 1,
          item_name: 'Test Item',
          item_extended_description: 'Test Item Description',
          item_part_num: 'TEST001',
          line_id: 'L1', // Added by controller
          barcode: '1234567890',
          item_group_id: 1,
          storage_id: 1,
          quantity: 10,
          cost_nis: 50,
          sale_nis: 100,
          price_nis: 100, // Controller filters on this field
          currency_id: 1,
          cost_mtc: 50,
          sale_mtc: 100,
          picture_link: null,
          exempt_vat: false,
          avitem: 0,
          location: 'A-1-1',
          is_serial: 0,
          sapak: 0,
          item_name_en: 'Test Item',
          item_order: 1,
          unique_id: '123_1' // Added by controller
        }
      ];
      mockRivhitService.getDocumentDetails.mockResolvedValue({
        data: { items: mockItems }
      });

      // Act
      await controller.getOrderItems(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRivhitService.getDocumentDetails).toHaveBeenCalledWith(7, 123);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockItems,
        message: 'Order items retrieved successfully'
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.params = { id: '123' };
      const error = new Error('Service error');
      mockRivhitService.getDocumentDetails.mockRejectedValue(error);

      // Act
      await controller.getOrderItems(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve order items',
        message: 'Service error'
      });
    });
  });

  describe('validation', () => {
    it('should validate numeric parameters', () => {
      expect(() => controller.validateNumericParam('123', 'test')).not.toThrow();
      expect(() => controller.validateNumericParam('invalid', 'test')).toThrow('test must be a number');
    });

    it('should validate date parameters', () => {
      expect(() => controller.validateDateParam('2023-01-01', 'test')).not.toThrow();
      expect(() => controller.validateDateParam('invalid-date', 'test')).toThrow('test must be a valid date');
    });
  });
});