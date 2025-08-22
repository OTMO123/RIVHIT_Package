import { 
  IApplicationLogger, 
  LogLevel, 
  LogContext, 
  LoggerConfig,
  ILoggerFactory 
} from '../../interfaces/ILogger';

/**
 * Console Logger Implementation
 * Простая реализация логгера для консоли следующая принципам SOLID
 * 
 * Single Responsibility: Отвечает только за логирование в консоль
 * Open/Closed: Можно расширять функциональность без изменения базового класса
 * Liskov Substitution: Полностью заменяет IApplicationLogger
 * Interface Segregation: Реализует только необходимые интерфейсы
 * Dependency Inversion: Зависит от абстракций IApplicationLogger
 */
export class ConsoleLoggerService implements IApplicationLogger {
  private level: LogLevel;
  private module: string;
  private context: LogContext;
  private requestId?: string;

  constructor(
    module: string,
    config: Partial<LoggerConfig> = {},
    context: LogContext = {}
  ) {
    this.module = module;
    this.level = config.level || LogLevel.INFO;
    this.context = { ...context, module };
  }

  // Базовые методы логирования
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : context;

    this.log(LogLevel.ERROR, message, errorContext);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : context;

    this.log(LogLevel.FATAL, message, errorContext);
  }

  // Структурированное логирование
  log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) {
      return; // Пропускаем логи ниже установленного уровня
    }

    const timestamp = new Date().toISOString();
    const logLevel = LogLevel[level];
    const fullContext = {
      ...this.context,
      ...context,
      timestamp,
      requestId: this.requestId
    };

    // Форматирование для консоли
    const logEntry = {
      level: logLevel,
      module: this.module,
      message,
      ...fullContext,
      timestamp,
      requestId: this.requestId
    };

    // Вывод в консоль с цветами
    this.outputToConsole(level, logEntry);
  }

  private outputToConsole(level: LogLevel, logEntry: any): void {
    const { timestamp, level: levelName, module, message, requestId, ...context } = logEntry;
    
    // Цвета для разных уровней
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    // Базовая строка лога
    const baseLog = `${color}[${timestamp}] ${levelName} ${module}${reset}: ${message}`;
    
    // Добавляем requestId если есть
    const requestInfo = requestId ? ` (req: ${requestId})` : '';
    
    // Добавляем контекст если есть
    const contextKeys = Object.keys(context).filter(key => 
      !['timestamp', 'module'].includes(key) && context[key] !== undefined
    );
    
    let contextInfo = '';
    if (contextKeys.length > 0) {
      const contextObj = contextKeys.reduce((obj, key) => {
        obj[key] = context[key];
        return obj;
      }, {} as any);
      
      contextInfo = '\n  Context: ' + JSON.stringify(contextObj, null, 2)
        .split('\n')
        .map((line, index) => index === 0 ? line : '  ' + line)
        .join('\n');
    }

    console.log(baseLog + requestInfo + contextInfo);
  }

  child(context: LogContext): IApplicationLogger {
    return new ConsoleLoggerService(
      this.module,
      { level: this.level },
      { ...this.context, ...context }
    );
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  // Метрики (базовая реализация)
  counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.info(`METRIC[counter] ${name}: ${value}`, { metric: { type: 'counter', name, value, tags } });
  }

  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.info(`METRIC[timing] ${name}: ${duration}ms`, { metric: { type: 'timing', name, duration, tags } });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.info(`METRIC[gauge] ${name}: ${value}`, { metric: { type: 'gauge', name, value, tags } });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.info(`METRIC[histogram] ${name}: ${value}`, { metric: { type: 'histogram', name, value, tags } });
  }

  // Безопасность
  authAttempt(userId: string, success: boolean, ip?: string, userAgent?: string): void {
    const message = `Auth ${success ? 'SUCCESS' : 'FAILED'} for user: ${userId}`;
    const context = { 
      security: { type: 'auth', userId, success, ip, userAgent }
    };
    
    if (success) {
      this.info(message, context);
    } else {
      this.warn(message, context);
    }
  }

  accessAttempt(userId: string, resource: string, action: string, success: boolean, ip?: string): void {
    const message = `Access ${success ? 'GRANTED' : 'DENIED'}: ${userId} -> ${action} on ${resource}`;
    const context = {
      security: { type: 'access', userId, resource, action, success, ip }
    };
    
    if (success) {
      this.info(message, context);
    } else {
      this.warn(message, context);
    }
  }

  securityIncident(type: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const message = `SECURITY INCIDENT [${severity.toUpperCase()}]: ${type} - ${description}`;
    const securityContext = {
      ...context,
      security: { type: 'incident', incidentType: type, severity, description }
    };
    
    if (severity === 'critical' || severity === 'high') {
      this.error(message, undefined, securityContext);
    } else {
      this.warn(message, securityContext);
    }
  }

  // Запросы
  startRequest(requestId: string, method: string, url: string, ip?: string): IApplicationLogger {
    this.requestId = requestId;
    this.info(`REQUEST START: ${method} ${url}`, { 
      request: { id: requestId, method, url, ip, startTime: Date.now() }
    });
    
    return this;
  }

  endRequest(statusCode: number, duration: number): void {
    const message = `REQUEST END: ${statusCode} (${duration}ms)`;
    const context = {
      request: { id: this.requestId, statusCode, duration, endTime: Date.now() }
    };
    
    if (statusCode >= 500) {
      this.error(message, undefined, context);
    } else if (statusCode >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
    
    // Сброс requestId
    this.requestId = undefined;
  }

  // Бизнес события
  businessEvent(event: string, context?: LogContext): void {
    this.info(`BUSINESS EVENT: ${event}`, { 
      ...context, 
      eventType: 'business', 
      event 
    });
  }

  technicalEvent(event: string, context?: LogContext): void {
    this.info(`TECHNICAL EVENT: ${event}`, { 
      ...context, 
      eventType: 'technical', 
      event 
    });
  }
}

/**
 * Console Logger Factory
 * Фабрика для создания console логгеров
 */
export class ConsoleLoggerFactory implements ILoggerFactory {
  private defaultConfig: Partial<LoggerConfig>;

  constructor(defaultConfig: Partial<LoggerConfig> = {}) {
    this.defaultConfig = {
      level: LogLevel.INFO,
      format: 'pretty',
      outputs: [{ type: 'console', config: {} }],
      enableMetrics: true,
      enableSecurity: true,
      enableStackTrace: true,
      enableRequestId: true,
      ...defaultConfig
    };
  }

  createLogger(module: string, config?: Partial<LoggerConfig>): IApplicationLogger {
    const finalConfig = { ...this.defaultConfig, ...config };
    return new ConsoleLoggerService(module, finalConfig);
  }

  createTestLogger(): IApplicationLogger {
    return new ConsoleLoggerService('test', { level: LogLevel.DEBUG });
  }

  createSilentLogger(): IApplicationLogger {
    return new ConsoleLoggerService('silent', { level: LogLevel.FATAL });
  }
}