export const APP_CONFIG = {
  NAME: 'Packing System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Automated packing system for RIVHIT orders',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 200,
  MAX_LIMIT: 200,
} as const;

export const TIMEOUTS = {
  API_REQUEST: 15000, // 15 seconds
  PRINTER_COMMAND: 30000, // 30 seconds
  HEALTH_CHECK: 5000, // 5 seconds
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_FACTOR: 2,
} as const;

export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300, // 300ms
  TOAST_DURATION: 3000, // 3 seconds
  LOADING_DELAY: 200, // 200ms
  HEBREW_FONT: 'Arial, sans-serif',
} as const;

export const VALIDATION = {
  ORDER_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  PHONE_PATTERN: /^[+]?[0-9\s\-\(\)]+$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;