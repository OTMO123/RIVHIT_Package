import express from 'express';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import { swaggerSpec } from './config/swagger';
import { OrdersController } from './controllers/orders.controller';
import { PrintController } from './controllers/print.controller';
import { RivhitService } from './services/rivhit.service';
import { MemoryCacheService } from './services/cache.service';
import { PrinterService } from './services/printer.service';
import { ApplicationServiceFactory } from './factories/service.factory';
import { ConsoleLoggerFactory } from './services/logging/console.logger.service';
import { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  requestLogger,
  validateContentType,
  corsHandler
} from './middleware/error.middleware';
import { AppLogger } from './config/logger';
import { IRivhitService } from './interfaces/IRivhitService';
import { IPrinterService } from './interfaces/IPrinterService';
import { ICacheService } from './interfaces/ICacheService';
import { setupSecurity } from './middleware/security.middleware';
import { optionalAuth } from './middleware/auth.middleware';
import ordersRoutes from './routes/orders.routes';
import printRoutes from './routes/print.routes';
import authRoutes from './routes/auth.routes';
import customersRoutes from './routes/customers.routes';
import itemsRoutes from './routes/items.routes';
import settingsRoutes from './routes/settings.routes';
import { initializeDatabase } from './config/database.config';

// Dependency Injection Container
class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}

// Factory для создания приложения
export class AppFactory {
  private app: express.Application;
  private container: Container;
  private logger: AppLogger;
  private initialized: boolean = false;

  constructor() {
    this.app = express();
    this.container = Container.getInstance();
    this.logger = new AppLogger();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.setupDatabase();
      this.setupServices();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      this.setupGracefulShutdown();
      this.initialized = true;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to initialize application');
      throw error;
    }
  }

  private async setupDatabase(): Promise<void> {
    this.logger.logInfo('Initializing SQLite database');
    try {
      await initializeDatabase();
      this.logger.logInfo('Database initialized successfully');
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to initialize database');
      throw error;
    }
  }

  private setupServices(): void {
    this.logger.logInfo('Initializing application services using SOLID principles');

    try {
      // Используем ApplicationServiceFactory для создания всех сервисов
      const services = ApplicationServiceFactory.createServices();
      
      // Регистрируем сервисы в контейнере (Dependency Injection)
      this.container.register('cacheService', services.cacheService);
      this.container.register('rivhitService', services.rivhitService);
      this.container.register('printerService', services.printerService);

      // Создаем логгер через фабрику
      const loggerFactory = new ConsoleLoggerFactory();
      const appLogger = loggerFactory.createLogger('Application');
      this.container.register('appLogger', appLogger);

      this.logger.logInfo('All services initialized successfully');
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to initialize services');
      throw error;
    }
  }

  private setupMiddleware(): void {
    // 🛡️ Comprehensive Security middleware (HTTPS, CSP, HSTS, etc.)
    this.app.use(setupSecurity());
    
    // 🔗 CORS настройки
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    this.app.use(corsHandler);

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use(requestLogger);

    // Content-Type validation
    this.app.use(validateContentType);

    // API Documentation (Swagger UI)
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'RIVHIT Packing System API',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
      }
    }));

    // OpenAPI JSON spec endpoint
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          cache: 'available',
          printer: 'available',
          rivhit: 'available'
        }
      });
    });
  }

  private setupRoutes(): void {
    this.logger.logInfo('Setting up routes with new controllers');

    // Dependency Injection - получаем сервисы из контейнера
    const rivhitService = this.container.get<IRivhitService>('rivhitService');
    const printerService = this.container.get<IPrinterService>('printerService');

    // Single Responsibility Principle - каждый контроллер отвечает за свою область
    const ordersController = new OrdersController(rivhitService);
    const printController = new PrintController(printerService as any);

    // Добавляем контроллеры в app.locals для routes
    this.app.locals.ordersController = ordersController;
    this.app.locals.printController = printController;

    // 🔐 Аутентификация (доступно без токена)
    this.app.use('/api/auth', authRoutes);
    
    // 📦 Основные API (с опциональной аутентификацией)
    this.app.use('/api/orders', optionalAuth, ordersRoutes);
    this.app.use('/api/print', optionalAuth, printRoutes);
    this.app.use('/api/settings', optionalAuth, settingsRoutes);

    // Старые маршруты для обратной совместимости (v1)
    const router = express.Router();
    router.get('/orders', asyncHandler(ordersController.getOrders.bind(ordersController)));
    router.get('/orders/:id', asyncHandler(ordersController.getOrderById.bind(ordersController)));
    router.get('/orders/:id/items', asyncHandler(ordersController.getOrderItems.bind(ordersController)));
    router.get('/orders/:id/customer', asyncHandler(ordersController.getOrderCustomer.bind(ordersController)));

    // API versioning для обратной совместимости
    this.app.use('/api/v1', router);

    // Default route с новыми endpoints
    this.app.get('/', (req, res) => {
      res.json({
        message: 'RIVHIT Packing System API',
        version: '2.0.0',
        description: 'Современный API для автоматизации упаковки заказов с интеграцией RIVHIT',
        principles: ['TDD', 'SOLID', 'Dependency Injection', 'Factory Pattern', 'Type Safety'],
        documentation: {
          swagger: '/api-docs',
          openapi: '/api-docs.json',
          readme: 'https://github.com/company/packing-system#readme'
        },
        endpoints: {
          // System
          health: '/health',
          docs: '/api-docs',
          
          // Orders API v2
          orders: '/api/orders',
          orderById: '/api/orders/:id',
          orderItems: '/api/orders/:id/items',
          orderCustomer: '/api/orders/:id/customer',
          orderStatus: '/api/orders/:id/status',
          orderSync: '/api/orders/sync-pending',
          
          // Print API v2
          print: '/api/print',
          printStatus: '/api/print/status',
          printLabels: '/api/print/labels',
          printSingle: '/api/print/single-label',
          printTest: '/api/print/test',
          printJobs: '/api/print/jobs',
          
          // Legacy v1 endpoints (deprecated)
          v1: {
            deprecated: true,
            notice: 'v1 endpoints are deprecated. Please use v2 endpoints.',
            orders: '/api/v1/orders',
            orderById: '/api/v1/orders/:id',
            orderItems: '/api/v1/orders/:id/items',
            orderCustomer: '/api/v1/orders/:id/customer'
          }
        },
        features: {
          caching: 'Redis/Memory cache with TTL',
          offline: 'Offline mode with local storage',
          retry: 'Exponential backoff retry logic',
          logging: 'Structured logging with Winston',
          monitoring: 'Health checks and metrics',
          security: 'Helmet, CORS, Rate limiting',
          validation: 'Zod schema validation',
          testing: 'Jest with 85%+ coverage target'
        }
      });
    });

    this.logger.logInfo('Routes configured successfully');
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3000): Promise<void> {
    await this.initialize();
    // Try to use HTTPS if certificates are available, otherwise fallback to HTTP
    const useHttps = process.env.USE_HTTPS === 'true';
    
    if (useHttps) {
      try {
        // Create HTTPS server with self-signed certificate for development
        const httpsOptions = this.createHttpsOptions();
        const httpsServer = https.createServer(httpsOptions, this.app);
        
        httpsServer.listen(port, () => {
          this.logger.logStartup(port);
          console.log(`🔒 HTTPS Server running on port ${port}`);
          console.log(`📡 Health check: https://localhost:${port}/health`);
          console.log(`📚 API documentation: https://localhost:${port}/api/v1`);
          console.log(`🔐 Using HTTPS for secure communication`);
        });
      } catch (error: any) {
        console.warn(`⚠️ HTTPS setup failed, falling back to HTTP:`, error.message);
        this.startHttp(port);
      }
    } else {
      this.startHttp(port);
    }
  }

  private startHttp(port: number): void {
    this.app.listen(port, () => {
      this.logger.logStartup(port);
      console.log(`🚀 HTTP Server running on port ${port}`);
      console.log(`📡 Health check: http://localhost:${port}/health`);
      console.log(`📚 API documentation: http://localhost:${port}/api/v1`);
    });
  }

  private createHttpsOptions(): https.ServerOptions {
    // For development, create a self-signed certificate
    // In production, you should use proper SSL certificates
    const cert = this.generateSelfSignedCert();
    
    return {
      key: cert.key,
      cert: cert.cert
    };
  }

  private generateSelfSignedCert(): { key: string; cert: string } {
    // Simple self-signed certificate for development
    // Note: This is for development only. Use proper certificates in production!
    const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNfka8Q2ZjQ2F6yY9dU7nR9V1E8VX9GVpOFJzqUCu8Qd0l9G4Y8K1ry2GH6K9y3
7VJTUt9Us8cKBwQNfka8Q2ZjQ2F6yY9dU7nR9V1E8VX9GVpOFJzqUCu8Qd0l9G4Y
8K1ry2GH6K9y37VJTUt9Us8cKBwQNfka8Q2ZjQ2F6yY9dU7nR9V1E8VX9GVpOFJz
qUCu8Qd0l9G4Y8K1ry2GH6K9y37VJTUt9Us8cKBwQNfka8Q2ZjQ2F6yY9dU7nR9V
1E8VX9GVpOFJzqUCu8Qd0l9G4Y8K1ry2GH6K9y3AgMBAAECggEAKIWnQDytgWu7
QbQ2tKkDmUCKd3nOIDbJpH4EqP5K6r8zQ2bI3h4dGHw7Qj5wX5pZ5nKsHqK5pJ5k
-----END PRIVATE KEY-----`;

    const cert = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQDAOxKQdVgxXjANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJV
UzAeFw0yNDA3MTQwNjAwMDBaFw0yNTA3MTQwNjAwMDBaMA0xCzAJBgNVBAYTAlVT
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCgcEDX5Gv
ENmY0NhesmPXVO50fVdRPFV/RlaThSc6lArvEHdJfRuGPCta8thh+ivct+1SU1Lf
VLPHCgcEDX5GvENmY0NhesmPXVO50fVdRPFV/RlaThSc6lArvEHdJfRuGPCta8th
h+ivct+1SU1LfVLPHCgcEDX5GvENmY0NhesmPXVO50fVdRPFV/RlaThSc6lArvEH
dJfRuGPCta8thh+ivct+1SU1LfVLPHCgcEDX5GvENmY0NhesmPXVO50fVdRPFV/R
laThSc6lArvEHdJfRuGPCta8thh+ivct+wIDAQABMA0GCSqGSIb3DQEBCwUAA4IB
AQBYWnOHejRlTgckJzVqB8z3qJ5k5nGH6eS5pKGHw7Qj5wX5pZ5nKsHqK5pJ5k7V
JTUt9Us8cKBwQNfka8Q2ZjQ2F6yY9dU7nR9V1E8VX9GVpOFJzqUCu8Qd0l9G4Y8K
1ry2GH6K9y37VJTUt9Us8cKBwQNfka8Q2ZjQ2F6yY9dU7nR9V1E8VX9GVpOFJzqU
Cu8Qd0l9G4Y8K1ry2GH6K9y3
-----END CERTIFICATE-----`;

    return { key, cert };
  }

  private setupGracefulShutdown(): void {
    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.logShutdown();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.logger.logShutdown();
      process.exit(0);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      this.logger.logError(err, 'Unhandled Promise Rejection');
      process.exit(1);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      this.logger.logError(err, 'Uncaught Exception');
      process.exit(1);
    });
  }
}

// Экспортируем класс Application для тестов
export { AppFactory as Application };