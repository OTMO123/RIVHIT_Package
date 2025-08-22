#!/usr/bin/env node

/**
 * Server Entry Point
 * Запуск приложения следуя принципам SOLID и паттернам
 */

import dotenv from 'dotenv';
import { AppFactory } from './app';
import { ConsoleLoggerFactory } from './services/logging/console.logger.service';
import { LogLevel } from './interfaces/ILogger';

// Загрузка переменных окружения
dotenv.config();

// Создание логгера для сервера
const loggerFactory = new ConsoleLoggerFactory({
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO
});
const logger = loggerFactory.createLogger('Server');

// Конфигурация сервера
const PORT = parseInt(process.env.PORT || '3001');
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Запуск сервера
 */
async function startServer(): Promise<void> {
  try {
    logger.businessEvent('server_startup_initiated', {
      port: PORT,
      environment: NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    });

    // Создание приложения через фабрику
    const appFactory = new AppFactory();
    
    // Запуск сервера
    await appFactory.start(PORT);

    logger.info('🎉 RIVHIT Packing System started successfully', {
      server: {
        port: PORT,
        environment: NODE_ENV,
        features: [
          'TDD Testing',
          'SOLID Principles',
          'Dependency Injection',
          'Factory Pattern',
          'Structured Logging',
          'Graceful Shutdown',
          'Error Handling',
          'Request Tracing'
        ]
      }
    });

  } catch (error) {
    logger.fatal('Failed to start server', error as Error);
    process.exit(1);
  }
}

/**
 * Обработка uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught Exception - Server will terminate', error);
  process.exit(1);
});

/**
 * Обработка unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.fatal('Unhandled Promise Rejection - Server will terminate', reason as Error, {
    promise: promise.toString()
  });
  process.exit(1);
});

/**
 * Graceful shutdown signals
 */
const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

shutdownSignals.forEach((signal) => {
  process.on(signal, () => {
    logger.info(`Received ${signal} - initiating graceful shutdown`);
    
    logger.businessEvent('server_shutdown_initiated', {
      signal,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });

    // Graceful shutdown будет обработан в AppFactory
    // Здесь мы просто логируем событие
  });
});

// Запуск сервера
if (require.main === module) {
  startServer().catch((error) => {
    logger.fatal('Startup failed', error);
    process.exit(1);
  });
}

export { startServer };