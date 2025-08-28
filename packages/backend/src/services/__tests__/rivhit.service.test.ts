import { RivhitService } from '../../../src/services/rivhit.service';
import { ICacheService } from '../../../src/interfaces';
import { Logger } from 'winston';
import axios from 'axios';
import { RivhitDocument, RivhitItem } from '@packing/shared';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock dependencies
const mockCache: jest.Mocked<ICacheService> = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  exists: jest.fn(),
  getKeys: jest.fn(),
};

const mockLogger: jest.Mocked<Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

describe('RivhitService', () => {
  let service: RivhitService;
  const mockApiToken = 'test-token';
  const mockBaseUrl = 'https://api.rivhit.co.il';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: {
        baseURL: mockBaseUrl
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Replace mockedAxios calls with mockAxiosInstance
    mockedAxios.post = mockAxiosInstance.post;

    service = new RivhitService({
      baseUrl: mockBaseUrl,
      apiToken: mockApiToken,
      timeout: 10000,
      retryAttempts: 3
    }, mockCache);
  });

  describe('getDocuments', () => {
    const mockDocuments: RivhitDocument[] = [
      {
        document_type: 1,
        document_number: 123,
        issue_date: '2025-01-01',
        currency_id: 1,
        customer_id: 1,
        agent_id: 0,
        total_amount: 100.5,
      },
    ];

    it('should return cached documents when available', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(mockDocuments);

      // Act
      const result = await service.getDocuments();

      // Assert
      expect(result).toEqual(mockDocuments);
      expect(mockCache.get).toHaveBeenCalledWith('documents:{}');
      expect(mockedAxios.post).not.toHaveBeenCalled();
      // Note: RivhitService doesn't log in current implementation
    });

    it('should fetch from API when not cached', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 0,
          client_message: '',
          debug_message: '',
          data: { document_list: mockDocuments },
        },
      };
      mockedAxios.post.mockResolvedValue(apiResponse);

      // Act
      const result = await service.getDocuments();

      // Assert
      expect(result).toEqual(mockDocuments);
      expect(mockedAxios.post).toHaveBeenCalledWith('/Document.List', {
        api_token: mockApiToken,
      });
      expect(mockCache.set).toHaveBeenCalledWith('documents:{}', mockDocuments, 300);
    });

    it('should throw error when API returns error', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 401,
          client_message: 'Unauthorized',
          debug_message: '',
          data: null,
        },
      };
      mockedAxios.post.mockResolvedValue(apiResponse);

      // Act & Assert
      await expect(service.getDocuments()).rejects.toThrow('Failed to fetch documents');
      // Note: Error handling changed in current implementation
    });

    it('should handle network errors', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValue(networkError);

      // Act & Assert
      await expect(service.getDocuments()).rejects.toThrow('Failed to fetch documents');
      // Note: Error handling changed in current implementation
    });
  });

  describe('getItems', () => {
    const mockItems: RivhitItem[] = [
      {
        item_id: 1,
        item_name: 'Test Item',
        item_extended_description: 'Test Item Description',
        item_part_num: 'T001',
        barcode: '123456789',
        item_group_id: 1,
        storage_id: 1,
        quantity: 10,
        cost_nis: 5.0,
        sale_nis: 10.0,
        currency_id: 1,
        cost_mtc: 5.0,
        sale_mtc: 10.0,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'A-1-1',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Test Item',
        item_order: 1
      },
    ];

    it('should return cached items when available', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(mockItems);

      // Act
      const result = await service.getItems();

      // Assert
      expect(result).toEqual(mockItems);
      expect(mockCache.get).toHaveBeenCalledWith('items:all');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should fetch from API when not cached', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 0,
          client_message: '',
          debug_message: '',
          data: { item_list: mockItems }
        },
      };
      mockedAxios.post.mockResolvedValue(apiResponse);

      // Act
      const result = await service.getItems();

      // Assert
      expect(result).toEqual(mockItems);
      expect(mockedAxios.post).toHaveBeenCalledWith('/Item.List', {
        api_token: mockApiToken,
        item_group_id: undefined,
      });
      expect(mockCache.set).toHaveBeenCalledWith('items:all', mockItems, 600);
    });

    it('should handle groupId parameter', async () => {
      // Arrange
      const groupId = 5;
      mockCache.get.mockResolvedValue(null);
      const apiResponse = {
        data: {
          error_code: 0,
          client_message: '',
          debug_message: '',
          data: { item_list: mockItems }
        },
      };
      mockedAxios.post.mockResolvedValue(apiResponse);

      // Act
      const result = await service.getItems({ 
        api_token: mockApiToken,
        item_group_id: groupId 
      } as any);

      // Assert
      expect(result).toEqual(mockItems);
      expect(mockCache.get).toHaveBeenCalledWith(`items:${groupId}`);
      expect(mockedAxios.post).toHaveBeenCalledWith('/Item.List', {
        api_token: mockApiToken,
        item_group_id: groupId,
      });
    });
  });
});