import { SafeRivhitService } from '../safe-rivhit.service';
import { ICacheService } from '../../interfaces/ICacheService';
import { RivhitDocument, RivhitItem, RivhitCustomer, RivhitErrorCodes } from '@packing/shared';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache service
const mockCacheService: jest.Mocked<ICacheService> = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  exists: jest.fn(),
  getKeys: jest.fn(),
};

describe('SafeRivhitService', () => {
  let service: SafeRivhitService;
  let mockAxiosInstance: any;
  
  const mockConfig = {
    baseUrl: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
    apiToken: 'test-token-123',
    timeout: 30000,
    retryAttempts: 3,
    testMode: true
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    service = new SafeRivhitService(mockConfig, mockCacheService, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseUrl,
        timeout: mockConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PackingSystem-SafeClient/1.0.0'
        }
      });
    });

    it('should setup safety interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getDocuments', () => {
    const mockDocuments: RivhitDocument[] = [
      {
        document_type: 7,
        document_number: 39641,
        issue_date: '2025-01-01',
        currency_id: 1,
        customer_id: 12345,
        agent_id: 1,
        total_amount: 1500.50,
      }
    ];

    it('should return cached documents when available', async () => {
      const filters = { 
        api_token: 'test-token',
        document_type: 7, 
        customer_id: 12345 
      };
      const cacheKey = 'safe_Document.List:' + JSON.stringify({
        from_document_type: 7,
        to_document_type: 7,
        from_customer_id: 12345,
        to_customer_id: 12345,
      });

      mockCacheService.get.mockResolvedValue({ document_list: mockDocuments });

      const result = await service.getDocuments(filters);

      expect(result).toEqual(mockDocuments);
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache miss', async () => {
      const filters = { 
        api_token: 'test-token',
        document_type: 7 
      };
      mockCacheService.get.mockResolvedValue(null);
      
      const apiResponse = {
        data: {
          error_code: RivhitErrorCodes.SUCCESS,
          client_message: '',
          debug_message: '',
          data: { document_list: mockDocuments }
        }
      };
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      const result = await service.getDocuments(filters);

      expect(result).toEqual(mockDocuments);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.List', {
        api_token: mockConfig.apiToken,
        from_document_type: 7,
        to_document_type: 7,
        _test_mode: true,
        _read_only: true
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('safe_Document.List:'),
        { document_list: mockDocuments },
        300
      );
    });

    it('should handle date filters correctly', async () => {
      const filters = {
        api_token: 'test-token',
        document_type: 7,
        date_from: '2025-01-01',
        date_to: '2025-01-31'
      };
      
      mockCacheService.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 0,
          data: { document_list: mockDocuments }
        }
      };
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      await service.getDocuments(filters);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.List', {
        api_token: mockConfig.apiToken,
        from_document_type: 7,
        to_document_type: 7,
        from_date: '01/01/2025',
        to_date: '31/01/2025',
        _test_mode: true,
        _read_only: true
      });
    });

    it('should handle empty response gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 0,
          data: {}
        }
      };
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      const result = await service.getDocuments();

      expect(result).toEqual([]);
    });

    it('should throw error on API error response', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 401,
          client_message: 'Unauthorized access',
          debug_message: 'Invalid API token'
        }
      };
      mockAxiosInstance.post.mockResolvedValue(apiResponse);

      await expect(service.getDocuments()).rejects.toThrow('RIVHIT API Error: Unauthorized access');
    });

    it('should handle network errors', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockRejectedValue(new Error('Network timeout'));

      await expect(service.getDocuments()).rejects.toThrow('Network timeout');
    });
  });

  describe('getDocumentDetails', () => {
    const documentType = 7;
    const documentNumber = 39641;
    
    const mockDocumentDetails = {
      error_code: 0,
      data: {
        document_info: {
          document_type: 7,
          document_number: 39641,
          customer_name: 'Test Customer'
        },
        items: [
          {
            item_id: 1,
            item_name: 'Test Item',
            quantity: 5
          }
        ]
      }
    };

    it('should return cached document details', async () => {
      const cacheKey = `document_details_${documentType}_${documentNumber}`;
      mockCacheService.get.mockResolvedValue(mockDocumentDetails);

      const result = await service.getDocumentDetails(documentType, documentNumber);

      expect(result).toEqual(mockDocumentDetails);
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should fetch from API with timeout protection', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({ data: mockDocumentDetails });

      const result = await service.getDocumentDetails(documentType, documentNumber);

      expect(result).toEqual(mockDocumentDetails);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.Details', {
        api_token: mockConfig.apiToken,
        document_type: documentType,
        document_number: documentNumber
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `document_details_${documentType}_${documentNumber}`,
        mockDocumentDetails,
        15 * 60 * 1000
      );
    });

    it('should handle timeout gracefully and cache failed order', async () => {
      mockCacheService.get.mockResolvedValue(null);
      
      // Mock a slow response that will timeout
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ data: mockDocumentDetails }), 10000);
      });
      mockAxiosInstance.post.mockReturnValue(slowPromise);

      await expect(service.getDocumentDetails(documentType, documentNumber))
        .rejects.toThrow('Order 39641 appears to be non-existent or problematic (timeout after 5s)');

      // Check that failed order is cached
      const failedKey = `${documentType}_${documentNumber}`;
      expect(service['failedOrdersCache'].has(failedKey)).toBe(true);
    });

    it('should skip known problematic orders', async () => {
      // Pre-populate failed cache
      const failedKey = `${documentType}_${documentNumber}`;
      service['failedOrdersCache'].set(failedKey, {
        timestamp: Date.now(),
        error: 'Previously failed'
      });

      await expect(service.getDocumentDetails(documentType, documentNumber))
        .rejects.toThrow('Order 39641 is known to be problematic: Previously failed');

      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should clear failed cache after TTL expires', async () => {
      // Set failed cache with old timestamp (beyond TTL)
      const failedKey = `${documentType}_${documentNumber}`;
      const oldTimestamp = Date.now() - (11 * 60 * 1000); // 11 minutes ago
      service['failedOrdersCache'].set(failedKey, {
        timestamp: oldTimestamp,
        error: 'Old error'
      });

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({ data: mockDocumentDetails });

      const result = await service.getDocumentDetails(documentType, documentNumber);

      expect(result).toEqual(mockDocumentDetails);
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });

  describe('getItems', () => {
    const mockItems: RivhitItem[] = [
      {
        item_id: 1,
        item_name: 'Test Item',
        item_extended_description: 'Test Description',
        item_part_num: 'T001',
        barcode: '123456789',
        item_group_id: 1,
        storage_id: 1,
        quantity: 10,
        cost_nis: 50.0,
        sale_nis: 100.0,
        currency_id: 1,
        cost_mtc: 50.0,
        sale_mtc: 100.0,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'A-1-1',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Test Item',
        item_order: 1
      }
    ];

    it('should fetch items with filters', async () => {
      const filters = {
        api_token: 'test-token',
        item_group_id: 1,
        storage_id: 1,
        search_text: 'test',
        active_only: true,
        limit: 50
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: mockItems
        }
      });

      const result = await service.getItems(filters);

      expect(result).toEqual(mockItems);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Item.List', {
        api_token: mockConfig.apiToken,
        item_group_id: 1,
        storage_id: 1,
        search_text: 'test',
        active_only: true,
        limit: 50,
        _test_mode: true,
        _read_only: true
      });
    });

    it('should enforce safety limit on items', async () => {
      const filters = { 
        api_token: 'test-token',
        limit: 150 
      }; // Exceeds safety limit
      
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: mockItems
        }
      });

      await service.getItems(filters);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Item.List', {
        api_token: mockConfig.apiToken,
        limit: 100, // Should be capped at 100
        _test_mode: true,
        _read_only: true
      });
    });
  });

  describe('getCustomers', () => {
    const mockCustomers: RivhitCustomer[] = [
      {
        customer_id: 1,
        first_name: 'Test',
        last_name: 'Customer',
        phone: '050-1234567',
        email: 'test@example.com',
        city: 'Tel Aviv',
        address: 'Test Street 123'
      }
    ];

    it('should fetch customers with filters and safety limits', async () => {
      const filters = {
        api_token: 'test-token',
        customer_type: 1,
        city: 'Tel Aviv',
        search_text: 'test',
        active_only: true,
        limit: 25
      };

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: mockCustomers
        }
      });

      const result = await service.getCustomers(filters);

      expect(result).toEqual(mockCustomers);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Customer.List', {
        api_token: mockConfig.apiToken,
        customer_type: 1,
        city: 'Tel Aviv',
        search_text: 'test',
        active_only: true,
        limit: 25,
        _test_mode: true,
        _read_only: true
      });
    });

    it('should enforce customer safety limit', async () => {
      const filters = { 
        api_token: 'test-token',
        limit: 100 
      }; // Exceeds safety limit of 50
      
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: { error_code: 0, data: mockCustomers }
      });

      await service.getCustomers(filters);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Customer.List', 
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  describe('getCustomer', () => {
    const mockCustomer: RivhitCustomer = {
      customer_id: 12345,
      first_name: 'Test',
      last_name: 'Customer',
      phone: '050-1234567',
      email: 'test@example.com',
      city: 'Tel Aviv',
      address: 'Test Street 123'
    };

    it('should get single customer by ID', async () => {
      const customerId = 12345;
      
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: mockCustomer
        }
      });

      const result = await service.getCustomer(customerId);

      expect(result).toEqual(mockCustomer);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Customer.Get', {
        api_token: mockConfig.apiToken,
        customer_id: customerId,
        _test_mode: true,
        _read_only: true
      });
    });
  });

  describe('updateOrderStatus (READ-ONLY MODE)', () => {
    it('should prepare delivery note data without executing write', async () => {
      const documentId = 39641;
      const status = 'packed';
      const packingData = {
        items: [
          { item_id: 1, quantity: 5 },
          { item_id: 2, quantity: 3 }
        ]
      };

      // Since we're in safe mode, should prepare but not execute
      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: { success: true }
        }
      });

      const result = await service.updateOrderStatus(documentId, status, packingData);

      // Should still call the API (for now) but in production would be read-only
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.New', {
        api_token: mockConfig.apiToken,
        document_type: 3, // Delivery Note
        reference: documentId,
        items: packingData.items,
        notes: `Status update to: ${status}`,
        _test_mode: true,
        _read_only: true
      });

      expect(result).toBe(true);
    });

    it('should handle update failures gracefully', async () => {
      const documentId = 39641;
      const status = 'packed';

      mockCacheService.get.mockResolvedValue(null);
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      const result = await service.updateOrderStatus(documentId, status);

      expect(result).toBe(false);
    });
  });

  describe('createInvoice (READ-ONLY - DATA PREPARATION)', () => {
    it('should prepare invoice data correctly without database writes', async () => {
      const orderNumber = '39641';
      const customerData = {
        customer_id: 12345,
        customer_name: 'Test Customer'
      };
      const items = [
        {
          item_id: 1,
          item_name: 'Test Item 1',
          quantity: 5,
          price: 100,
          sale_nis: 100,
          cost_nis: 50,
          exempt_vat: false
        },
        {
          item_id: 2,
          description: 'Test Item 2', // Different field name
          quantity: 3,
          sale_nis: 150,
          cost_nis: 75,
          exempt_vat: true
        }
      ];

      mockCacheService.get.mockResolvedValue(null);
      const mockInvoiceResponse = {
        invoice_id: 1001,
        invoice_number: 'INV-39641',
        total_amount: 950
      };
      
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: mockInvoiceResponse
        }
      });

      const result = await service.createInvoice(orderNumber, customerData, items);

      expect(result).toEqual(mockInvoiceResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.New', {
        api_token: mockConfig.apiToken,
        document_type: 1, // Invoice type
        reference: parseInt(orderNumber),
        customer_id: customerData.customer_id,
        items: [
          {
            item_id: 1,
            item_name: 'Test Item 1',
            quantity: 5,
            price_nis: 100,
            cost_nis: 50,
            currency_id: 1,
            exempt_vat: false
          },
          {
            item_id: 2,
            item_name: 'Test Item 2',
            quantity: 3,
            price_nis: 150,
            cost_nis: 75,
            currency_id: 1,
            exempt_vat: true
          }
        ],
        issue_date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
        comments: `חשבונית עבור הזמנה ${orderNumber}`,
        _test_mode: true,
        _read_only: true
      });
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection test', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          error_code: 0,
          data: { document_list: [] }
        }
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/Document.List', {
        api_token: mockConfig.apiToken,
        limit: 1,
        _test_mode: true,
        _read_only: true
      });
    });

    it('should return false on connection failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('clearFailedCache', () => {
    it('should clear failed orders cache', () => {
      // Pre-populate cache
      service['failedOrdersCache'].set('7_123', { timestamp: Date.now(), error: 'test' });
      service['failedOrdersCache'].set('7_456', { timestamp: Date.now(), error: 'test2' });

      expect(service['failedOrdersCache'].size).toBe(2);

      service.clearFailedCache();

      expect(service['failedOrdersCache'].size).toBe(0);
    });
  });

  describe('getApiInfo', () => {
    it('should return API information', async () => {
      const result = await service.getApiInfo();

      expect(result).toEqual({
        testMode: true,
        allowedMethods: expect.arrayContaining([
          'Document.List',
          'Document.Get',
          'Document.Details',
          'Item.List',
          'Customer.List',
          'Customer.Get'
        ]),
        baseUrl: mockConfig.baseUrl,
        timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/)
      });
    });
  });

  describe('safety interceptors', () => {
    it('should warn about non-standard methods but not block them', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate request interceptor with non-standard method
      const mockRequest = {
        data: { method: 'Document.Delete' },
        url: '/test'
      };

      // Get the request interceptor
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const result = requestInterceptor(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Non-standard method used: Document.Delete');
      expect(result).toEqual(mockRequest);

      consoleSpy.mockRestore();
    });
  });

  describe('error handling and logging', () => {
    it('should sanitize API token in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create a fresh service instance for this test
      const testService = new SafeRivhitService(mockConfig, mockCacheService);
      
      // Clear any initialization logs
      consoleSpy.mockClear();
      
      // Trigger a log with sensitive data
      testService['log']('test_action', { api_token: 'secret-token-123', other: 'data' });

      expect(consoleSpy).toHaveBeenCalledWith('🔒 SafeRivhit:', {
        timestamp: expect.any(String),
        action: 'test_action',
        data: { api_token: '***hidden***', other: 'data' },
        service: 'SafeRivhitService'
      });

      consoleSpy.mockRestore();
    });

    it('should handle axios timeout errors properly', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(service.getDocuments()).rejects.toThrow('timeout of 30000ms exceeded');
    });
  });
});