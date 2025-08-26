import { ICacheService } from '../interfaces/ICacheService';
import { IPrinterService } from '../interfaces/IPrinterService';
import { IRivhitService } from '../interfaces/IRivhitService';
import { MemoryCacheService } from '../services/cache/memory.cache.service';
import { RedisCacheService } from '../services/cache/redis.cache.service';
import { PrinterService } from '../services/printer.service';
import { ZPLPrinterService } from '../services/zpl-printer.service';
import { WinLabelPrinterService, WinLabelPrinterFactory } from '../services/winlabel-printer.service';
import { RivhitService } from '../services/rivhit.service';
import { MockRivhitService } from '../services/mock-rivhit.service';
import { SafeRivhitService } from '../services/safe-rivhit.service';

/**
 * Service Factory следующий принципам SOLID
 * 
 * Factory Pattern преимущества:
 * - Encapsulation: Скрывает сложность создания объектов
 * - Loose Coupling: Клиенты не зависят от конкретных классов
 * - Single Responsibility: Фабрика отвечает только за создание объектов
 * - Open/Closed: Можно легко добавлять новые типы сервисов
 */

// Cache Service Factory
export enum CacheType {
  MEMORY = 'memory',
  REDIS = 'redis'
}

export interface CacheConfig {
  type: CacheType;
  redis?: {
    host: string;
    port: number;
    password?: string;
    database?: number;
    keyPrefix?: string;
  };
}

export class CacheServiceFactory {
  /**
   * Создание кэш-сервиса на основе конфигурации
   * Следует Open/Closed Principle - можно добавлять новые типы без изменения кода
   */
  static create(config: CacheConfig): ICacheService {
    switch (config.type) {
      case CacheType.MEMORY:
        return new MemoryCacheService();
      
      case CacheType.REDIS:
        return new RedisCacheService(config.redis);
      
      default:
        throw new Error(`Unsupported cache type: ${config.type}`);
    }
  }

  /**
   * Создание кэш-сервиса по умолчанию
   * Dependency Inversion - возвращает абстракцию, а не конкретный класс
   */
  static createDefault(): ICacheService {
    const cacheType = process.env.CACHE_TYPE as CacheType || CacheType.MEMORY;
    
    const config: CacheConfig = {
      type: cacheType,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_PREFIX || 'rivhit:'
      }
    };

    return this.create(config);
  }
}

// Printer Service Factory
export interface PrinterConfig {
  templatesPath?: string;
  connectionType?: 'usb' | 'serial' | 'ethernet';
  port?: string;
}

export class PrinterServiceFactory {
  /**
   * Создание принтер-сервиса с конфигурацией
   * Single Responsibility - отвечает только за создание PrinterService
   */
  static create(config: PrinterConfig = {}): IPrinterService {
    return new PrinterService(config.templatesPath);
  }

  /**
   * Создание WinLabel принтер-сервиса
   * Для интеграции с WINCODE Technology WinLabel
   */
  static createWinLabel(config?: {
    winLabelPath?: string;
    templatesPath?: string;
    dataPath?: string;
  }): IPrinterService {
    return WinLabelPrinterFactory.create(config);
  }

  /**
   * Создание WinLabel принтер-сервиса для RIVHIT
   * Использует настройки по умолчанию для RIVHIT системы
   */
  static createWinLabelForRivhit(): IPrinterService {
    return WinLabelPrinterFactory.createForRivhit();
  }

  /**
   * Создание ZPL принтер-сервиса (для GoDEX с ZPL)
   */
  static createZPL(): IPrinterService {
    return new ZPLPrinterService();
  }

  /**
   * Создание принтер-сервиса по умолчанию
   */
  static createDefault(): IPrinterService {
    // Используем ZPL для GoDEX принтера
    if (process.env.USE_ZPL === 'true' || true) { // По умолчанию ZPL
      console.log('🖨️ Using ZPL printer service for GoDEX');
      return this.createZPL();
    }

    const config: PrinterConfig = {
      templatesPath: process.env.PRINTER_TEMPLATES_PATH || './printer-templates',
      connectionType: (process.env.PRINTER_CONNECTION_TYPE as any) || 'usb',
      port: process.env.PRINTER_PORT || 'COM1'
    };

    // Если WinLabel доступен, используем его
    if (process.env.USE_WINLABEL === 'true') {
      return this.createWinLabelForRivhit();
    }

    return this.create(config);
  }
}

// RIVHIT Service Factory
export interface RivhitConfig {
  baseUrl: string;
  apiToken: string;
  timeout?: number;
  retryAttempts?: number;
  testMode?: boolean;
}

export class RivhitServiceFactory {
  /**
   * Создание RIVHIT сервиса с зависимостями
   * Dependency Injection - принимает ICacheService как зависимость
   */
  static create(config: RivhitConfig, cacheService: ICacheService): IRivhitService {
    const serviceConfig = {
      baseUrl: config.baseUrl,
      apiToken: config.apiToken,
      timeout: config.timeout || 60000, // Increased to 60s for slow RIVHIT API
      retryAttempts: config.retryAttempts || 3,
      testMode: config.testMode || false
    };

    return new RivhitService(serviceConfig, cacheService) as IRivhitService;
  }

  /**
   * Создание RIVHIT сервиса по умолчанию с автоматическим кэшем
   */
  static createDefault(): IRivhitService {
    // Debug environment variables
    console.log('🔍 RIVHIT Service Selection Debug:', {
      USE_MOCK_RIVHIT: process.env.USE_MOCK_RIVHIT,
      NODE_ENV: process.env.NODE_ENV,
      RIVHIT_API_TOKEN: process.env.RIVHIT_API_TOKEN ? '***SET***' : 'NOT_SET'
    });
    
    // Используем Mock сервис в разработке если API token не настроен или явно указано
    const useMock = process.env.USE_MOCK_RIVHIT === 'true' || 
                    process.env.NODE_ENV === 'test' ||
                    !process.env.RIVHIT_API_TOKEN ||
                    process.env.RIVHIT_API_TOKEN === 'mock_token_for_development';
    
    if (useMock) {
      console.log('🧪 Using Mock RIVHIT service for development');
      return new MockRivhitService();
    }
    
    console.log('🔗 Using Real SafeRivhitService with production API');

    const config = {
      baseUrl: process.env.RIVHIT_API_URL || 'https://api.rivhit.com',
      apiToken: process.env.RIVHIT_API_TOKEN || '',
      timeout: parseInt(process.env.RIVHIT_TIMEOUT || '60000'), // Increased to 60s for very slow RIVHIT API responses
      retryAttempts: parseInt(process.env.RIVHIT_RETRY_ATTEMPTS || '3'),
      testMode: process.env.NODE_ENV === 'test' || process.env.RIVHIT_TEST_MODE === 'true'
    };

    const cacheService = CacheServiceFactory.createDefault();
    
    // Используем SafeRivhitService для безопасности в продакшене
    return new SafeRivhitService(config, cacheService) as IRivhitService;
  }
}

// Application Service Factory (Facade Pattern)
export interface ApplicationServices {
  cacheService: ICacheService;
  printerService: IPrinterService;
  rivhitService: IRivhitService;
}

export class ApplicationServiceFactory {
  /**
   * Создание всех сервисов приложения
   * Facade Pattern - предоставляет простой интерфейс для создания всех сервисов
   * Dependency Injection - все сервисы создаются с правильными зависимостями
   */
  static createServices(): ApplicationServices {
    console.log('🏭 Creating application services...');

    // Создание кэш-сервиса
    const cacheService = CacheServiceFactory.createDefault();
    console.log('✅ Cache service created');

    // Создание принтер-сервиса
    const printerService = PrinterServiceFactory.createDefault();
    console.log('✅ Printer service created');

    // Создание RIVHIT сервиса с кэшем
    const rivhitService = RivhitServiceFactory.createDefault();
    console.log('✅ RIVHIT service created');

    console.log('🎉 All services created successfully');

    return {
      cacheService,
      printerService,
      rivhitService
    };
  }

  /**
   * Создание сервисов для тестирования
   * Test Double Pattern - создает mock сервисы для тестов
   */
  static createTestServices(): ApplicationServices {
    console.log('🧪 Creating test services...');

    const cacheService = new MemoryCacheService(); // Всегда Memory для тестов
    const printerService = PrinterServiceFactory.create({ templatesPath: './test-templates' });
    
    // Используем MockRivhitService для тестов вместо реального API
    const rivhitService = new MockRivhitService();
    console.log('✅ Mock RIVHIT service created for testing');

    return {
      cacheService,
      printerService,
      rivhitService: rivhitService as IRivhitService
    };
  }

  /**
   * Graceful shutdown для всех сервисов
   */
  static async shutdownServices(services: ApplicationServices): Promise<void> {
    console.log('🛑 Shutting down services...');

    try {
      // Закрытие Redis соединения если используется
      if (services.cacheService instanceof RedisCacheService) {
        await (services.cacheService as RedisCacheService).disconnect();
        console.log('✅ Redis cache disconnected');
      }

      // Очистка memory cache
      if (services.cacheService instanceof MemoryCacheService) {
        await services.cacheService.clear();
        console.log('✅ Memory cache cleared');
      }

      console.log('🎉 All services shut down successfully');
    } catch (error) {
      console.error('❌ Error during service shutdown:', error);
      throw error;
    }
  }
}