export interface AppConfig {
  rivhit: RivhitConfig;
  printer: PrinterConfig;
  database: DatabaseConfig;
  logging: LoggingConfig;
  ui: UIConfig;
}

export interface RivhitConfig {
  baseUrl: string;
  apiToken: string;
  timeout: number;
  retryAttempts: number;
  cacheDuration: number;
  
  // Additional settings
  defaultCurrency: number; // CurrencyType
  defaultLanguage: 'he' | 'en';
  enableLogging: boolean;
  enableCache: boolean;
}

export interface PrinterConfig {
  name: string;
  driver: string;
  timeout: number;
  retryAttempts: number;
  templatesPath: string;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  synchronize?: boolean;
  logging?: boolean;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
  console?: {
    enabled: boolean;
    colorize: boolean;
  };
}

export interface UIConfig {
  language: 'en' | 'ru' | 'he';
  theme: 'light' | 'dark';
  fontSize: number;
  autoRefresh: boolean;
  autoRefreshInterval: number;
}

export interface StickerMapping {
  [productName: string]: string;
}

export interface AppEnvironment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: number;
  RIVHIT_API_TOKEN?: string;
  RIVHIT_BASE_URL?: string;
  DATABASE_PATH?: string;
  LOG_LEVEL?: string;
}