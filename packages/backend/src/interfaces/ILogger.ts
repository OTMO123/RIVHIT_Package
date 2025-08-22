/**
 * Logger Interface следующий принципам SOLID
 * 
 * Dependency Inversion Principle:
 * - Высокоуровневые модули не должны зависеть от низкоуровневых
 * - Оба должны зависеть от абстракций
 * 
 * Interface Segregation Principle:
 * - Интерфейсы разделены по логическим группам
 * - Клиенты зависят только от нужных им методов
 */

// Базовые уровни логирования
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Контекст для структурированного логирования
export interface LogContext {
  [key: string]: any;
  timestamp?: Date;
  requestId?: string;
  userId?: string;
  module?: string;
  operation?: string;
}

// Базовый интерфейс логирования
export interface ILogger {
  /**
   * Логирование отладочной информации
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Логирование информационных сообщений
   */
  info(message: string, context?: LogContext): void;

  /**
   * Логирование предупреждений
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Логирование ошибок
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Логирование критических ошибок
   */
  fatal(message: string, error?: Error, context?: LogContext): void;
}

// Расширенные возможности логирования
export interface IStructuredLogger extends ILogger {
  /**
   * Логирование с произвольным уровнем
   */
  log(level: LogLevel, message: string, context?: LogContext): void;

  /**
   * Создание дочернего логгера с контекстом
   */
  child(context: LogContext): IStructuredLogger;

  /**
   * Установка минимального уровня логирования
   */
  setLevel(level: LogLevel): void;

  /**
   * Получение текущего уровня логирования
   */
  getLevel(): LogLevel;
}

// Интерфейс для метрик и мониторинга
export interface IMetricsLogger {
  /**
   * Запись метрики счетчика
   */
  counter(name: string, value?: number, tags?: Record<string, string>): void;

  /**
   * Запись метрики времени выполнения
   */
  timing(name: string, duration: number, tags?: Record<string, string>): void;

  /**
   * Запись метрики значения
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Запись метрики распределения
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

// Интерфейс для аудита безопасности
export interface ISecurityLogger {
  /**
   * Логирование попыток аутентификации
   */
  authAttempt(userId: string, success: boolean, ip?: string, userAgent?: string): void;

  /**
   * Логирование доступа к ресурсам
   */
  accessAttempt(userId: string, resource: string, action: string, success: boolean, ip?: string): void;

  /**
   * Логирование подозрительной активности
   */
  securityIncident(type: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void;
}

// Композитный интерфейс для полного логирования
export interface IApplicationLogger extends IStructuredLogger, IMetricsLogger, ISecurityLogger {
  /**
   * Запуск сессии логирования для запроса
   */
  startRequest(requestId: string, method: string, url: string, ip?: string): IApplicationLogger;

  /**
   * Завершение сессии логирования для запроса
   */
  endRequest(statusCode: number, duration: number): void;

  /**
   * Логирование бизнес-событий
   */
  businessEvent(event: string, context?: LogContext): void;

  /**
   * Логирование технических событий
   */
  technicalEvent(event: string, context?: LogContext): void;
}

// Конфигурация логгера
export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'text' | 'pretty';
  outputs: LoggerOutput[];
  enableMetrics?: boolean;
  enableSecurity?: boolean;
  enableStackTrace?: boolean;
  enableRequestId?: boolean;
}

// Вывод логов
export interface LoggerOutput {
  type: 'console' | 'file' | 'elasticsearch' | 'syslog' | 'webhook';
  config: any;
}

// Фабрика для создания логгеров
export interface ILoggerFactory {
  /**
   * Создание логгера для модуля
   */
  createLogger(module: string, config?: Partial<LoggerConfig>): IApplicationLogger;

  /**
   * Создание логгера для тестирования
   */
  createTestLogger(): IApplicationLogger;

  /**
   * Создание тихого логгера (для production)
   */
  createSilentLogger(): IApplicationLogger;
}