import { Request, Response } from 'express';
import { ItemsController } from '../items.controller';
import { IRivhitService } from '../../interfaces/IRivhitService';
import { RivhitItem } from '@packing/shared';

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

describe('ItemsController', () => {
  let controller: ItemsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockItem: RivhitItem = {
    item_id: 1001,
    item_name: 'Blini Classic',
    item_extended_description: 'Traditional Russian blini, pack of 12',
    item_part_num: 'BLN-001',
    barcode: '7290012345678',
    item_group_id: 10,
    storage_id: 1,
    quantity: 150,
    cost_nis: 12.50,
    sale_nis: 25.00,
    currency_id: 1,
    cost_mtc: 12.50,
    sale_mtc: 25.00,
    picture_link: 'https://example.com/images/blini.jpg',
    exempt_vat: false,
    avitem: 0,
    location: 'A-1-5',
    is_serial: 0,
    sapak: 0,
    item_name_en: 'Blini Classic',
    item_order: 1
  };

  const mockItems: RivhitItem[] = [
    mockItem,
    {
      item_id: 1002,
      item_name: 'Pelmeni Beef',
      item_extended_description: 'Beef pelmeni, pack of 20',
      item_part_num: 'PLM-002',
      barcode: '7290012345679',
      item_group_id: 10,
      storage_id: 1,
      quantity: 200,
      cost_nis: 18.00,
      sale_nis: 36.00,
      currency_id: 1,
      cost_mtc: 18.00,
      sale_mtc: 36.00,
      exempt_vat: false,
      avitem: 0,
      location: 'A-2-3',
      is_serial: 0,
      sapak: 0,
      item_name_en: 'Pelmeni Beef',
      item_order: 2,
      picture_link: null
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new ItemsController(mockRivhitService);
    
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

  describe('getItems', () => {
    it('should return items successfully', async () => {
      mockRivhitService.getItems.mockResolvedValue(mockItems);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 12,
        offset: 0
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockItems,
        message: 'Items retrieved successfully'
      });
    });

    it('should handle query parameters for filtering', async () => {
      mockRequest.query = {
        item_group_id: '10',
        search_text: 'blini',
        limit: '50',
        offset: '10'
      };
      
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        item_group_id: 10,
        search_text: 'blini',
        limit: 50,
        offset: 10
      });
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockItem],
        message: 'Items retrieved successfully'
      });
    });

    it('should handle barcode search (ignored due to interface limitation)', async () => {
      mockRequest.query = {
        barcode: '7290012345678'
      };
      
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      // Note: barcode is not in ServiceItemFilters interface, so it's ignored
      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 12, // Default limit
        offset: 0
      });
    });

    it('should handle invalid numeric parameters gracefully', async () => {
      mockRequest.query = {
        item_group_id: 'invalid',
        limit: 'abc'
      };

      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      // Invalid numeric parameters become NaN, but are still passed
      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        item_group_id: NaN,
        limit: 12, // Default limit when invalid
        offset: 0
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should enforce maximum limit', async () => {
      mockRequest.query = {
        limit: '1000' // Exceeds maximum
      };
      
      mockRivhitService.getItems.mockResolvedValue(mockItems);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      // Should cap limit at 100 for items (RIVHIT_MAX_LIMIT)
      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
    });

    it('should use default parameters when no query provided', async () => {
      mockRequest.query = {};
      
      mockRivhitService.getItems.mockResolvedValue(mockItems);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 12, // Default limit from env
        offset: 0
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('RIVHIT API connection failed');
      mockRivhitService.getItems.mockRejectedValue(serviceError);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'RIVHIT API connection failed',
        message: 'Failed to retrieve items',
        timestamp: expect.any(String)
      });
    });

    it('should return empty array when no items found', async () => {
      mockRivhitService.getItems.mockResolvedValue([]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Items retrieved successfully'
      });
    });
  });

  describe('getItem', () => {
    it('should return item by ID successfully', async () => {
      mockRequest.params = { id: '1001' };
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItem(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 1
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockItem,
        message: 'Item retrieved successfully'
      });
    });

    it('should return 404 when item not found', async () => {
      mockRequest.params = { id: '99999' };
      mockRivhitService.getItems.mockResolvedValue([]);

      await controller.getItem(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Item not found',
        message: 'Item with ID 99999 not found'
      });
    });

    it('should validate item ID parameter', async () => {
      mockRequest.params = { id: 'invalid-id' };

      await controller.getItem(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid item ID',
        message: 'Item ID must be a number'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: '1001' };
      const serviceError = new Error('Database connection timeout');
      mockRivhitService.getItems.mockRejectedValue(serviceError);

      await controller.getItem(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection timeout',
        message: 'Failed to retrieve item',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getOrderItems', () => {
    it('should get items for an order', async () => {
      mockRequest.params = { orderId: '39641' };
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getOrderItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        limit: 12 // Default limit
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockItem],
        message: 'Order items retrieved successfully'
      });
    });

    it('should validate order ID parameter', async () => {
      mockRequest.params = { orderId: 'invalid' };

      await controller.getOrderItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID must be a number'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { orderId: '39641' };
      const serviceError = new Error('RIVHIT API connection failed');
      mockRivhitService.getItems.mockRejectedValue(serviceError);

      await controller.getOrderItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'RIVHIT API connection failed',
        message: 'Failed to retrieve order items',
        timestamp: expect.any(String)
      });
    });
  });

  describe('updateItemStock', () => {
    it('should simulate stock update in read-only mode', async () => {
      process.env.RIVHIT_READ_ONLY = 'true';
      mockRequest.params = { id: '1001' };
      mockRequest.body = { stock_status: 'low', available_quantity: 25 };

      await controller.updateItemStock(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { updated: false },
        message: 'Read-only mode: Stock update simulated'
      });
      
      delete process.env.RIVHIT_READ_ONLY;
    });

    it('should update stock when not in read-only mode', async () => {
      mockRequest.params = { id: '1001' };
      mockRequest.body = { stock_status: 'adequate', available_quantity: 150 };

      await controller.updateItemStock(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { updated: true },
        message: 'Item stock updated successfully'
      });
    });

    it('should validate item ID parameter', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { stock_status: 'low' };

      await controller.updateItemStock(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid item ID',
        message: 'Item ID must be a number'
      });
    });
  });



  describe('error handling', () => {
    it('should handle RIVHIT API errors gracefully', async () => {
      const apiError = new Error('RIVHIT API returned error code 403');
      apiError.name = 'RivhitApiError';
      mockRivhitService.getItems.mockRejectedValue(apiError);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'RIVHIT API returned error code 403',
        message: 'Failed to retrieve items',
        timestamp: expect.any(String)
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout after 30 seconds');
      timeoutError.name = 'TimeoutError';
      mockRivhitService.getItems.mockRejectedValue(timeoutError);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout after 30 seconds',
        message: 'Failed to retrieve items',
        timestamp: expect.any(String)
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network unreachable');
      networkError.name = 'NetworkError';
      mockRivhitService.getItems.mockRejectedValue(networkError);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('input validation and security', () => {
    it('should handle potential SQL injection in search', async () => {
      mockRequest.query = { search_text: "'; DROP TABLE items; --" };
      mockRivhitService.getItems.mockResolvedValue([]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      // Should pass through to RIVHIT service (which should handle safely)
      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        search_text: "'; DROP TABLE items; --",
        limit: 12,
        offset: 0
      });
    });

    it('should handle Hebrew text in search queries', async () => {
      mockRequest.query = { search_text: 'בליני' }; // Hebrew for blini
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        search_text: 'בליני',
        limit: 12,
        offset: 0
      });
    });

    it('should handle Russian text in search queries', async () => {
      mockRequest.query = { search_text: 'блины' }; // Russian for blini
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        search_text: 'блины',
        limit: 12,
        offset: 0
      });
    });

    it('should handle search text with special characters', async () => {
      const specialSearch = 'Пельмени-Beef-001';
      mockRequest.query = { search_text: specialSearch };
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      await controller.getItems(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getItems).toHaveBeenCalledWith({
        search_text: specialSearch,
        limit: 12,
        offset: 0
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle large item datasets efficiently', async () => {
      const largeItemSet = Array.from({ length: 200 }, (_, i) => ({
        ...mockItem,
        item_id: 1001 + i,
        item_name: `Item ${i + 1}`,
        item_part_num: `ITM-${String(i + 1).padStart(3, '0')}`
      }));
      
      mockRivhitService.getItems.mockResolvedValue(largeItemSet);

      const startTime = Date.now();
      await controller.getItems(mockRequest as Request, mockResponse as Response);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: largeItemSet,
        message: 'Items retrieved successfully'
      });
    });

    it('should handle concurrent search requests', async () => {
      mockRivhitService.getItems.mockResolvedValue([mockItem]);
      
      const searchTerms = ['blini', 'pelmeni', 'vareniki', 'manty'];
      const requests = searchTerms.map(term => {
        const req = { query: { search_text: term } } as unknown as Request;
        return controller.getItems(req, mockResponse as Response);
      });

      await Promise.all(requests);

      expect(mockRivhitService.getItems).toHaveBeenCalledTimes(4);
    });

    it('should handle rapid barcode lookups', async () => {
      const barcodes = ['7290012345678', '7290012345679', '7290012345680'];
      mockRivhitService.getItems.mockResolvedValue([mockItem]);

      const promises = barcodes.map(async (id) => {
        const req = { params: { id } } as unknown as Request;
        return controller.getItem(req, mockResponse as Response);
      });

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // Should be very fast
      expect(mockRivhitService.getItems).toHaveBeenCalledTimes(3);
    });
  });
});