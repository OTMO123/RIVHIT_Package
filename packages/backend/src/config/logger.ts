import winston from 'winston';
import path from 'path';

// Создаем форматтер для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Создаем форматтер для консоли
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'packing-system-backend'
  },
  transports: [
    // Логи ошибок в отдельный файл
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Все логи в общий файл
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// В development режиме также логируем в консоль
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Single Responsibility Principle - каждый класс отвечает за свою область логирования
export class RivhitLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = logger.child({ component: 'RivhitService' });
  }

  logApiRequest(method: string, params: any): void {
    this.logger.info('RIVHIT API request', {
      method,
      params,
      timestamp: new Date().toISOString()
    });
  }

  logApiResponse(method: string, responseTime: number, dataLength: number): void {
    this.logger.info('RIVHIT API response', {
      method,
      responseTime,
      dataLength,
      timestamp: new Date().toISOString()
    });
  }

  logApiError(method: string, error: Error): void {
    this.logger.error('RIVHIT API error', {
      method,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  logCacheHit(key: string): void {
    this.logger.debug('Cache hit', {
      key,
      timestamp: new Date().toISOString()
    });
  }

  logCacheMiss(key: string): void {
    this.logger.debug('Cache miss', {
      key,
      timestamp: new Date().toISOString()
    });
  }
}

export class CacheLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = logger.child({ component: 'CacheService' });
  }

  logCacheSet(key: string, ttl: number): void {
    this.logger.debug('Cache set', {
      key,
      ttl,
      timestamp: new Date().toISOString()
    });
  }

  logCacheGet(key: string, found: boolean): void {
    this.logger.debug('Cache get', {
      key,
      found,
      timestamp: new Date().toISOString()
    });
  }

  logCacheDelete(key: string): void {
    this.logger.debug('Cache delete', {
      key,
      timestamp: new Date().toISOString()
    });
  }

  logCacheCleanup(deletedKeys: number): void {
    this.logger.info('Cache cleanup', {
      deletedKeys,
      timestamp: new Date().toISOString()
    });
  }
}

export class ControllerLogger {
  private logger: winston.Logger;

  constructor(controllerName: string) {
    this.logger = logger.child({ component: controllerName });
  }

  logRequest(method: string, url: string, params: any, query: any): void {
    this.logger.info('HTTP request', {
      method,
      url,
      params,
      query,
      timestamp: new Date().toISOString()
    });
  }

  logResponse(method: string, url: string, statusCode: number, responseTime: number): void {
    this.logger.info('HTTP response', {
      method,
      url,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    });
  }

  logError(method: string, url: string, error: Error): void {
    this.logger.error('HTTP error', {
      method,
      url,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

export class AppLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = logger.child({ component: 'Application' });
  }

  logStartup(port: number): void {
    this.logger.info('Application startup', {
      port,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  }

  logShutdown(): void {
    this.logger.info('Application shutdown', {
      timestamp: new Date().toISOString()
    });
  }

  logError(error: Error, context?: string): void {
    this.logger.error('Application error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  logInfo(message: string, meta?: any): void {
    this.logger.info(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }
}

// Экспортируем основной логгер для общего использования
export default logger;