import { Request, Response } from 'express';
import { CustomersController } from '../customers.controller';
import { IRivhitService } from '../../interfaces/IRivhitService';
import { RivhitCustomer } from '@packing/shared';

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

describe('CustomersController', () => {
  let controller: CustomersController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockCustomer: RivhitCustomer = {
    customer_id: 12345,
    first_name: 'Test',
    last_name: 'Customer Ltd.',
    phone: '050-1234567',
    email: 'test@customer.com',
    city: 'Tel Aviv',
    address: 'Rothschild Blvd 1',
    zipcode: '6688101',
    customer_type: 1,
    credit_limit: 10000.0,
    company_name: 'Customer Ltd.',
    vat_id: '123456789'
  };

  const mockCustomers: RivhitCustomer[] = [
    mockCustomer,
    {
      customer_id: 12346,
      first_name: 'Another',
      last_name: 'Customer',
      phone: '050-9876543',
      email: 'another@customer.com',
      city: 'Haifa',
      address: 'Ben Gurion Ave 10',
      customer_type: 2
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new CustomersController(mockRivhitService);
    
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

  describe('getCustomers', () => {
    it('should return customers successfully', async () => {
      mockRivhitService.getCustomers.mockResolvedValue(mockCustomers);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        limit: 12,
        offset: 0
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCustomers,
        message: 'Customers retrieved successfully'
      });
    });

    it('should handle query parameters for filtering', async () => {
      mockRequest.query = {
        customer_type: '1',
        city: 'Tel Aviv',
        search_text: 'test',
        limit: '50',
        offset: '0'
      };
      
      mockRivhitService.getCustomers.mockResolvedValue([mockCustomer]);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        customer_type: 1,
        city: 'Tel Aviv',
        search_text: 'test',
        limit: 50,
        offset: 0
      });
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockCustomer],
        message: 'Customers retrieved successfully'
      });
    });

    it('should use default parameters when no query provided', async () => {
      mockRequest.query = {};
      
      mockRivhitService.getCustomers.mockResolvedValue(mockCustomers);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        limit: 12, // Default limit from env
        offset: 0
      });
    });

    it('should handle invalid numeric parameters gracefully', async () => {
      mockRequest.query = {
        customer_type: 'invalid',
        limit: 'not-a-number'
      };

      mockRivhitService.getCustomers.mockResolvedValue(mockCustomers);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      // Invalid numeric parameters become NaN, but are still passed
      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        customer_type: NaN,
        limit: 12, // Default limit when invalid
        offset: 0
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should enforce maximum limit', async () => {
      mockRequest.query = {
        limit: '1000' // Exceeds maximum
      };
      
      mockRivhitService.getCustomers.mockResolvedValue(mockCustomers);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      // Should cap limit at 100
      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('RIVHIT API connection failed');
      mockRivhitService.getCustomers.mockRejectedValue(serviceError);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'RIVHIT API connection failed',
        message: 'Failed to retrieve customers',
        timestamp: expect.any(String)
      });
    });

    it('should return empty array when no customers found', async () => {
      mockRivhitService.getCustomers.mockResolvedValue([]);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Customers retrieved successfully'
      });
    });
  });

  describe('getCustomer', () => {
    it('should return customer by ID successfully', async () => {
      mockRequest.params = { id: '12345' };
      mockRivhitService.getCustomer.mockResolvedValue(mockCustomer);

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomer).toHaveBeenCalledWith(12345);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCustomer,
        message: 'Customer retrieved successfully'
      });
    });

    it('should return 404 when customer not found', async () => {
      mockRequest.params = { id: '99999' };
      const notFoundError = new Error('Customer not found');
      notFoundError.name = 'NotFoundError';
      mockRivhitService.getCustomer.mockRejectedValue(notFoundError);

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Customer not found',
        message: 'Customer with ID 99999 not found'
      });
    });

    it('should validate customer ID parameter', async () => {
      mockRequest.params = { id: 'invalid-id' };

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid customer ID',
        message: 'Customer ID must be a number'
      });
    });

    it('should handle negative customer IDs', async () => {
      mockRequest.params = { id: '-123' };
      const notFoundError = new Error('Customer not found');
      notFoundError.name = 'NotFoundError';
      mockRivhitService.getCustomer.mockRejectedValue(notFoundError);

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomer).toHaveBeenCalledWith(-123);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Customer not found',
        message: 'Customer with ID -123 not found'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: '12345' };
      const serviceError = new Error('Database connection timeout');
      mockRivhitService.getCustomer.mockRejectedValue(serviceError);

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection timeout',
        message: 'Failed to retrieve customer',
        timestamp: expect.any(String)
      });
    });
  });



  describe('error handling', () => {
    it('should handle RIVHIT API errors gracefully', async () => {
      const apiError = new Error('RIVHIT API returned error code 401');
      apiError.name = 'RivhitApiError';
      mockRivhitService.getCustomers.mockRejectedValue(apiError);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'RIVHIT API returned error code 401',
        message: 'Failed to retrieve customers',
        timestamp: expect.any(String)
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockRivhitService.getCustomers.mockRejectedValue(timeoutError);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout',
        message: 'Failed to retrieve customers',
        timestamp: expect.any(String)
      });
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error occurred');
      mockRivhitService.getCustomer.mockRejectedValue(unexpectedError);
      mockRequest.params = { id: '12345' };

      await controller.getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected error occurred',
        message: 'Failed to retrieve customer',
        timestamp: expect.any(String)
      });
    });
  });

  describe('input validation', () => {
    it('should validate and sanitize search text', async () => {
      // Test SQL injection attempt (should be handled by RIVHIT service)
      mockRequest.query = { search_text: "'; DROP TABLE customers; --" };
      mockRivhitService.getCustomers.mockResolvedValue([]);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        search_text: "'; DROP TABLE customers; --",
        limit: 12,
        offset: 0
      });
    });

    it('should handle special characters in city filter', async () => {
      mockRequest.query = {
        city: "Tel Aviv-Yafo & Jaffa"
      };
      mockRivhitService.getCustomers.mockResolvedValue([]);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        city: "Tel Aviv-Yafo & Jaffa",
        limit: 12,
        offset: 0
      });
    });

    it('should handle Hebrew text in parameters', async () => {
      mockRequest.query = {
        city: 'תל אביב',
        search_text: 'חברת בדיקה'
      };
      mockRivhitService.getCustomers.mockResolvedValue([]);

      await controller.getCustomers(mockRequest as Request, mockResponse as Response);

      expect(mockRivhitService.getCustomers).toHaveBeenCalledWith({
        city: 'תל אביב',
        search_text: 'חברת בדיקה',
        limit: 12,
        offset: 0
      });
    });
  });

  describe('performance and caching', () => {
    it('should handle large customer datasets efficiently', async () => {
      const largeCustomerSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockCustomer,
        customer_id: 12345 + i,
        first_name: `Customer`,
        last_name: `${i + 1}`
      }));
      
      mockRivhitService.getCustomers.mockResolvedValue(largeCustomerSet);

      const startTime = Date.now();
      await controller.getCustomers(mockRequest as Request, mockResponse as Response);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: largeCustomerSet,
        message: 'Customers retrieved successfully'
      });
    });

    it('should handle concurrent requests properly', async () => {
      mockRivhitService.getCustomer.mockResolvedValue(mockCustomer);
      
      const requests = Array.from({ length: 5 }, (_, i) => {
        const req = { params: { id: `${12345 + i}` } } as unknown as Request;
        return controller.getCustomer(req, mockResponse as Response);
      });

      await Promise.all(requests);

      expect(mockRivhitService.getCustomer).toHaveBeenCalledTimes(5);
    });
  });
});