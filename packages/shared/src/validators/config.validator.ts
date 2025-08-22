import { z } from 'zod';

export const RivhitConfigSchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  apiToken: z.string().min(1, 'API token is required'),
  timeout: z.number().int().positive('Timeout must be positive'),
  retryAttempts: z.number().int().nonnegative('Retry attempts must be non-negative'),
  cacheDuration: z.number().int().positive('Cache duration must be positive'),
});

export const PrinterConfigSchema = z.object({
  name: z.string().min(1, 'Printer name is required'),
  driver: z.string().min(1, 'Printer driver is required'),
  timeout: z.number().int().positive('Timeout must be positive'),
  retryAttempts: z.number().int().nonnegative('Retry attempts must be non-negative'),
  templatesPath: z.string().min(1, 'Templates path is required'),
});

export const DatabaseConfigSchema = z.object({
  type: z.enum(['sqlite', 'postgres', 'mysql']),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().optional(),
  password: z.string().optional(),
  synchronize: z.boolean().optional(),
  logging: z.boolean().optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  format: z.enum(['json', 'simple']),
  file: z.object({
    enabled: z.boolean(),
    path: z.string().min(1, 'Log file path is required'),
    maxSize: z.string().min(1, 'Max file size is required'),
    maxFiles: z.number().int().positive('Max files must be positive'),
  }).optional(),
  console: z.object({
    enabled: z.boolean(),
    colorize: z.boolean(),
  }).optional(),
});

export const UIConfigSchema = z.object({
  language: z.enum(['en', 'ru', 'he']),
  theme: z.enum(['light', 'dark']),
  fontSize: z.number().int().positive('Font size must be positive'),
  autoRefresh: z.boolean(),
  autoRefreshInterval: z.number().int().positive('Auto refresh interval must be positive'),
});

export const AppConfigSchema = z.object({
  rivhit: RivhitConfigSchema,
  printer: PrinterConfigSchema,
  database: DatabaseConfigSchema,
  logging: LoggingConfigSchema,
  ui: UIConfigSchema,
});

export type RivhitConfigInput = z.infer<typeof RivhitConfigSchema>;
export type PrinterConfigInput = z.infer<typeof PrinterConfigSchema>;
export type DatabaseConfigInput = z.infer<typeof DatabaseConfigSchema>;
export type LoggingConfigInput = z.infer<typeof LoggingConfigSchema>;
export type UIConfigInput = z.infer<typeof UIConfigSchema>;
export type AppConfigInput = z.infer<typeof AppConfigSchema>;