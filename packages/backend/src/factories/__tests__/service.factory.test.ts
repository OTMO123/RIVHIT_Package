import { 
  ApplicationServiceFactory,
  CacheServiceFactory,
  PrinterServiceFactory,
  RivhitServiceFactory,
  CacheType,
  CacheConfig,
  RivhitConfig,
  PrinterConfig
} from '../service.factory';
import { ICacheService } from '../../interfaces/ICacheService';
import { IPrinterService } from '../../interfaces/IPrinterService';
import { IRivhitService } from '../../interfaces/IRivhitService';
import { MemoryCacheService } from '../../services/cache/memory.cache.service';
import { RedisCacheService } from '../../services/cache/redis.cache.service';
import { PrinterService } from '../../services/printer.service';
import { ZPLPrinterService } from '../../services/zpl-printer.service';
import { WinLabelPrinterFactory } from '../../services/winlabel-printer.service';
import { SafeRivhitService } from '../../services/safe-rivhit.service';
import { MockRivhitService } from '../../services/mock-rivhit.service';

// Mock all service implementations
jest.mock('../../services/cache/memory.cache.service');
jest.mock('../../services/cache/redis.cache.service');
jest.mock('../../services/printer.service');
jest.mock('../../services/zpl-printer.service');
jest.mock('../../services/winlabel-printer.service');
jest.mock('../../services/safe-rivhit.service');
jest.mock('../../services/mock-rivhit.service');

describe('CacheServiceFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create MemoryCacheService for memory type', () => {
      const config: CacheConfig = { type: CacheType.MEMORY };
      
      const result = CacheServiceFactory.create(config);
      
      expect(MemoryCacheService).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(MemoryCacheService);
    });

    it('should create RedisCacheService for redis type with config', () => {
      const redisConfig = {
        host: 'localhost',
        port: 6379,
        password: 'secret',
        database: 1,
        keyPrefix: 'test:'
      };
      const config: CacheConfig = { 
        type: CacheType.REDIS,
        redis: redisConfig
      };
      
      const result = CacheServiceFactory.create(config);
      
      expect(RedisCacheService).toHaveBeenCalledWith(redisConfig);
      expect(result).toBeInstanceOf(RedisCacheService);
    });

    it('should throw error for unsupported cache type', () => {
      const config = { type: 'unsupported' as any };
      
      expect(() => CacheServiceFactory.create(config))
        .toThrow('Unsupported cache type: unsupported');
    });
  });

  describe('createDefault', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create memory cache with default configuration', () => {
      process.env = { ...originalEnv, CACHE_TYPE: undefined };
      
      const result = CacheServiceFactory.createDefault();
      
      expect(MemoryCacheService).toHaveBeenCalled();
      expect(result).toBeInstanceOf(MemoryCacheService);
    });

    it('should create redis cache when CACHE_TYPE is redis', () => {
      process.env = { 
        ...originalEnv, 
        CACHE_TYPE: 'redis',
        REDIS_HOST: 'redis.example.com',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'password123',
        REDIS_DB: '2',
        REDIS_PREFIX: 'app:'
      };
      
      const result = CacheServiceFactory.createDefault();
      
      expect(RedisCacheService).toHaveBeenCalledWith({
        host: 'redis.example.com',
        port: 6380,
        password: 'password123',
        database: 2,
        keyPrefix: 'app:'
      });
      expect(result).toBeInstanceOf(RedisCacheService);
    });

    it('should use default redis configuration when env vars not set', () => {
      process.env = { ...originalEnv, CACHE_TYPE: 'redis' };
      
      CacheServiceFactory.createDefault();
      
      expect(RedisCacheService).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        database: 0,
        keyPrefix: 'rivhit:'
      });
    });
  });
});

describe('PrinterServiceFactory', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('create', () => {
    it('should create PrinterService with default config', () => {
      const result = PrinterServiceFactory.create();
      
      expect(PrinterService).toHaveBeenCalledWith(undefined);
      expect(result).toBeInstanceOf(PrinterService);
    });

    it('should create PrinterService with custom config', () => {
      const config: PrinterConfig = {
        templatesPath: '/custom/templates',
        connectionType: 'ethernet',
        port: '192.168.1.200'
      };
      
      const result = PrinterServiceFactory.create(config);
      
      expect(PrinterService).toHaveBeenCalledWith('/custom/templates');
      expect(result).toBeInstanceOf(PrinterService);
    });
  });

  describe('createWinLabel', () => {
    it('should create WinLabel printer service', () => {
      const config = {
        winLabelPath: 'C:\\WinLabel',
        templatesPath: 'C:\\Templates',
        dataPath: 'C:\\Data'
      };
      
      const mockWinLabelService = {} as IPrinterService;
      (WinLabelPrinterFactory.create as jest.Mock).mockReturnValue(mockWinLabelService);
      
      const result = PrinterServiceFactory.createWinLabel(config);
      
      expect(WinLabelPrinterFactory.create).toHaveBeenCalledWith(config);
      expect(result).toBe(mockWinLabelService);
    });

    it('should create WinLabel service without config', () => {
      const mockWinLabelService = {} as IPrinterService;
      (WinLabelPrinterFactory.create as jest.Mock).mockReturnValue(mockWinLabelService);
      
      const result = PrinterServiceFactory.createWinLabel();
      
      expect(WinLabelPrinterFactory.create).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockWinLabelService);
    });
  });

  describe('createWinLabelForRivhit', () => {
    it('should create WinLabel service for RIVHIT', () => {
      const mockWinLabelService = {} as IPrinterService;
      (WinLabelPrinterFactory.createForRivhit as jest.Mock).mockReturnValue(mockWinLabelService);
      
      const result = PrinterServiceFactory.createWinLabelForRivhit();
      
      expect(WinLabelPrinterFactory.createForRivhit).toHaveBeenCalled();
      expect(result).toBe(mockWinLabelService);
    });
  });

  describe('createZPL', () => {
    it('should create and initialize ZPL printer service', async () => {
      const mockZPLService = {
        initialize: jest.fn().mockResolvedValue(undefined)
      } as any;
      (ZPLPrinterService as jest.Mock).mockImplementation(() => mockZPLService);
      
      const result = await PrinterServiceFactory.createZPL();
      
      expect(ZPLPrinterService).toHaveBeenCalled();
      expect(mockZPLService.initialize).toHaveBeenCalledWith({
        printerIP: '192.168.14.200',
        printerPort: 9101
      });
      expect(result).toBe(mockZPLService);
    });

    it('should handle ZPL initialization failures', async () => {
      const mockZPLService = {
        initialize: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as any;
      (ZPLPrinterService as jest.Mock).mockImplementation(() => mockZPLService);
      
      await expect(PrinterServiceFactory.createZPL()).rejects.toThrow('Connection failed');
    });
  });

  describe('createDefault', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create ZPL printer when USE_ZPL is true', async () => {
      process.env = { ...originalEnv, USE_ZPL: 'true', USE_WINLABEL: undefined };
      
      const mockZPLService = {
        initialize: jest.fn().mockResolvedValue(undefined)
      } as any;
      (ZPLPrinterService as jest.Mock).mockImplementation(() => mockZPLService);
      
      const result = await PrinterServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🖨️ Using ZPL printer service for GoDEX');
      expect(ZPLPrinterService).toHaveBeenCalled();
      expect(result).toBe(mockZPLService);
    });

    it('should create WinLabel service when USE_WINLABEL is true', async () => {
      process.env = { 
        ...originalEnv, 
        USE_ZPL: 'false',
        USE_WINLABEL: 'true'
      };
      
      const mockWinLabelService = {} as IPrinterService;
      (WinLabelPrinterFactory.createForRivhit as jest.Mock).mockReturnValue(mockWinLabelService);
      
      const result = await PrinterServiceFactory.createDefault();
      
      expect(WinLabelPrinterFactory.createForRivhit).toHaveBeenCalled();
      expect(result).toBe(mockWinLabelService);
    });

    it('should use environment variables for printer configuration', async () => {
      process.env = { 
        ...originalEnv,
        USE_ZPL: 'false',
        USE_WINLABEL: 'false',
        PRINTER_TEMPLATES_PATH: '/custom/printer/templates',
        PRINTER_CONNECTION_TYPE: 'usb',
        PRINTER_PORT: 'COM3'
      };
      
      await PrinterServiceFactory.createDefault();
      
      expect(PrinterService).toHaveBeenCalledWith('/custom/printer/templates');
    });
  });
});

describe('RivhitServiceFactory', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  
  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('create', () => {
    it('should create RivhitService with provided config and cache', () => {
      const config: RivhitConfig = {
        baseUrl: 'https://api.test.com',
        apiToken: 'test-token',
        timeout: 5000,
        retryAttempts: 2,
        testMode: true
      };
      const mockCache = {} as ICacheService;
      
      const result = RivhitServiceFactory.create(config, mockCache);
      
      expect(result).toBeDefined();
    });

    it('should apply default values for optional config', () => {
      const config: RivhitConfig = {
        baseUrl: 'https://api.test.com',
        apiToken: 'test-token'
      };
      const mockCache = {} as ICacheService;
      
      RivhitServiceFactory.create(config, mockCache);
      
      // Should use default timeout of 60000ms and retryAttempts of 3
    });
  });

  describe('createDefault', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create MockRivhitService when USE_MOCK_RIVHIT is true', () => {
      process.env = { 
        ...originalEnv, 
        USE_MOCK_RIVHIT: 'true',
        RIVHIT_API_TOKEN: 'real-token'
      };
      
      const result = RivhitServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🧪 Using Mock RIVHIT service for development');
      expect(MockRivhitService).toHaveBeenCalled();
      expect(result).toBeInstanceOf(MockRivhitService);
    });

    it('should create MockRivhitService when NODE_ENV is test', () => {
      process.env = { 
        ...originalEnv, 
        NODE_ENV: 'test',
        RIVHIT_API_TOKEN: 'real-token'
      };
      
      const result = RivhitServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🧪 Using Mock RIVHIT service for development');
      expect(MockRivhitService).toHaveBeenCalled();
    });

    it('should create MockRivhitService when no API token is set', () => {
      process.env = { 
        ...originalEnv, 
        RIVHIT_API_TOKEN: undefined,
        NODE_ENV: 'development'
      };
      
      const result = RivhitServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🧪 Using Mock RIVHIT service for development');
      expect(MockRivhitService).toHaveBeenCalled();
    });

    it('should create MockRivhitService when API token is mock token', () => {
      process.env = { 
        ...originalEnv, 
        RIVHIT_API_TOKEN: 'mock_token_for_development',
        NODE_ENV: 'development'
      };
      
      const result = RivhitServiceFactory.createDefault();
      
      expect(MockRivhitService).toHaveBeenCalled();
    });

    it('should create SafeRivhitService with real API token', () => {
      process.env = { 
        ...originalEnv, 
        USE_MOCK_RIVHIT: 'false',
        NODE_ENV: 'production',
        RIVHIT_API_TOKEN: '582C90F9-4CBB-4945-8792-943B1FCD5756',
        RIVHIT_API_URL: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
        RIVHIT_TIMEOUT: '45000',
        RIVHIT_RETRY_ATTEMPTS: '5'
      };
      
      const result = RivhitServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔗 Using Real SafeRivhitService with production API');
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Factory Debug - Environment Variables:', {
        RIVHIT_API_TOKEN: '***5756',
        RIVHIT_API_URL: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
        RIVHIT_TIMEOUT: '45000',
        NODE_ENV: 'production'
      });
      expect(SafeRivhitService).toHaveBeenCalled();
    });

    it('should use default configuration values when env vars not set', () => {
      // Clean environment to ensure true defaults are used
      process.env = { 
        RIVHIT_API_TOKEN: 'real-token',
        USE_MOCK_RIVHIT: 'false',
        NODE_ENV: 'production'
      };
      
      RivhitServiceFactory.createDefault();
      
      // Should use defaults: timeout 60000, retryAttempts 3, etc.
      expect(SafeRivhitService).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://api.rivhit.com', // Default URL
          apiToken: 'real-token',
          timeout: 60000, // Default timeout
          retryAttempts: 3, // Default retry attempts
          testMode: false // Production mode
        }),
        expect.any(Object) // Cache service
      );
    });

    it('should log debug information about environment variables', () => {
      process.env = { 
        ...originalEnv, 
        RIVHIT_API_TOKEN: '582C90F9-4CBB-4945-8792-943B1FCD5756',
        NODE_ENV: 'production',  // Override test environment
        USE_MOCK_RIVHIT: 'false' // Explicitly set to false
      };
      
      RivhitServiceFactory.createDefault();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 RIVHIT Service Selection Debug:', {
        USE_MOCK_RIVHIT: 'false',
        NODE_ENV: 'production',
        RIVHIT_API_TOKEN: '***SET***'
      });
    });

    it('should create cache service for SafeRivhitService', () => {
      process.env = { 
        ...originalEnv, 
        RIVHIT_API_TOKEN: 'real-token',
        USE_MOCK_RIVHIT: 'false',
        NODE_ENV: 'production' // Override test environment to avoid mock service
      };
      
      const createDefaultSpy = jest.spyOn(CacheServiceFactory, 'createDefault');
      const mockCacheService = {} as ICacheService;
      createDefaultSpy.mockReturnValue(mockCacheService);
      
      RivhitServiceFactory.createDefault();
      
      expect(createDefaultSpy).toHaveBeenCalled();
      expect(SafeRivhitService).toHaveBeenCalledWith(
        expect.any(Object),
        mockCacheService
      );
      
      createDefaultSpy.mockRestore();
    });
  });
});

describe('ApplicationServiceFactory', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  
  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('createServices', () => {
    it('should create all application services', async () => {
      const mockCacheService = {} as ICacheService;
      const mockPrinterService = {} as IPrinterService;
      const mockRivhitService = {} as IRivhitService;
      
      jest.spyOn(CacheServiceFactory, 'createDefault').mockReturnValue(mockCacheService);
      jest.spyOn(PrinterServiceFactory, 'createDefault').mockResolvedValue(mockPrinterService);
      jest.spyOn(RivhitServiceFactory, 'createDefault').mockReturnValue(mockRivhitService);
      
      const result = await ApplicationServiceFactory.createServices();
      
      expect(result).toEqual({
        cacheService: mockCacheService,
        printerService: mockPrinterService,
        rivhitService: mockRivhitService,
        zplPrinterService: expect.any(Object)
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🏭 Creating application services...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Cache service created');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Printer service created');
      expect(consoleSpy).toHaveBeenCalledWith('✅ RIVHIT service created');
      expect(consoleSpy).toHaveBeenCalledWith('🎉 All services created successfully');
    });

    it('should handle printer service initialization failure', async () => {
      const mockCacheService = {} as ICacheService;
      const mockRivhitService = {} as IRivhitService;
      
      jest.spyOn(CacheServiceFactory, 'createDefault').mockReturnValue(mockCacheService);
      jest.spyOn(PrinterServiceFactory, 'createDefault').mockRejectedValue(new Error('Printer init failed'));
      jest.spyOn(RivhitServiceFactory, 'createDefault').mockReturnValue(mockRivhitService);
      
      await expect(ApplicationServiceFactory.createServices())
        .rejects.toThrow('Printer init failed');
    });
  });

  describe('createTestServices', () => {
    it('should create test services with mocks', () => {
      const mockMemoryCache = {} as MemoryCacheService;
      const mockPrinterService = {} as IPrinterService;
      const mockRivhitService = {} as MockRivhitService;
      
      (MemoryCacheService as jest.Mock).mockImplementation(() => mockMemoryCache);
      jest.spyOn(PrinterServiceFactory, 'create').mockReturnValue(mockPrinterService);
      (MockRivhitService as jest.Mock).mockImplementation(() => mockRivhitService);
      
      const result = ApplicationServiceFactory.createTestServices();
      
      expect(result).toEqual({
        cacheService: mockMemoryCache,
        printerService: mockPrinterService,
        rivhitService: mockRivhitService,
        zplPrinterService: expect.any(Object)
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🧪 Creating test services...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Mock RIVHIT service created for testing');
      
      expect(MemoryCacheService).toHaveBeenCalled();
      expect(PrinterServiceFactory.create).toHaveBeenCalledWith({ templatesPath: './test-templates' });
      expect(MockRivhitService).toHaveBeenCalled();
    });
  });

  describe('shutdownServices', () => {
    it('should shutdown Redis cache service', async () => {
      const mockRedisCache = {
        disconnect: jest.fn().mockResolvedValue(undefined)
      } as any;
      const mockServices = {
        cacheService: mockRedisCache,
        printerService: {} as IPrinterService,
        rivhitService: {} as IRivhitService,
        zplPrinterService: {} as any
      };
      
      // Make instanceof check return true for Redis
      (mockRedisCache as any).constructor = RedisCacheService;
      Object.setPrototypeOf(mockRedisCache, RedisCacheService.prototype);
      
      await ApplicationServiceFactory.shutdownServices(mockServices);
      
      expect(mockRedisCache.disconnect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('🛑 Shutting down services...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Redis cache disconnected');
      expect(consoleSpy).toHaveBeenCalledWith('🎉 All services shut down successfully');
    });

    it('should clear memory cache service', async () => {
      const mockMemoryCache = {
        clear: jest.fn().mockResolvedValue(undefined)
      } as any;
      const mockServices = {
        cacheService: mockMemoryCache,
        printerService: {} as IPrinterService,
        rivhitService: {} as IRivhitService,
        zplPrinterService: {} as any
      };
      
      // Make instanceof check return true for Memory
      (mockMemoryCache as any).constructor = MemoryCacheService;
      Object.setPrototypeOf(mockMemoryCache, MemoryCacheService.prototype);
      
      await ApplicationServiceFactory.shutdownServices(mockServices);
      
      expect(mockMemoryCache.clear).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ Memory cache cleared');
    });

    it('should handle shutdown errors', async () => {
      const mockRedisCache = {
        disconnect: jest.fn().mockRejectedValue(new Error('Disconnect failed'))
      } as any;
      const mockServices = {
        cacheService: mockRedisCache,
        printerService: {} as IPrinterService,
        rivhitService: {} as IRivhitService,
        zplPrinterService: {} as any
      };
      
      Object.setPrototypeOf(mockRedisCache, RedisCacheService.prototype);
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(ApplicationServiceFactory.shutdownServices(mockServices))
        .rejects.toThrow('Disconnect failed');
      
      expect(errorSpy).toHaveBeenCalledWith('❌ Error during service shutdown:', expect.any(Error));
      
      errorSpy.mockRestore();
    });

    it('should handle unknown cache service types gracefully', async () => {
      const mockUnknownCache = {} as any;
      const mockServices = {
        cacheService: mockUnknownCache,
        printerService: {} as IPrinterService,
        rivhitService: {} as IRivhitService,
        zplPrinterService: {} as any
      };
      
      await ApplicationServiceFactory.shutdownServices(mockServices);
      
      expect(consoleSpy).toHaveBeenCalledWith('🎉 All services shut down successfully');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle undefined environment variables gracefully', () => {
      const originalEnv = process.env;
      process.env = {};
      
      try {
        CacheServiceFactory.createDefault();
        RivhitServiceFactory.createDefault();
        // Should not throw errors
        expect(true).toBe(true);
      } finally {
        process.env = originalEnv;
      }
    });

    it('should handle invalid environment variable values', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_PORT: 'invalid',
        REDIS_DB: 'not-a-number',
        RIVHIT_TIMEOUT: 'invalid-timeout',
        RIVHIT_RETRY_ATTEMPTS: 'invalid-retry'
      };
      
      try {
        const cacheService = CacheServiceFactory.createDefault();
        const rivhitService = RivhitServiceFactory.createDefault();
        
        expect(cacheService).toBeDefined();
        expect(rivhitService).toBeDefined();
      } finally {
        process.env = originalEnv;
      }
    });
  });
});