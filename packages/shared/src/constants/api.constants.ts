export const API_ENDPOINTS = {
  ORDERS: '/api/orders',
  PRINTER: '/api/printer',
  HEALTH: '/api/health',
} as const;

export const RIVHIT_ENDPOINTS = {
  DOCUMENT_LIST: '/Document.List',
  DOCUMENT_GET: '/Document.Get',
  ITEM_LIST: '/Item.List',
  CUSTOMER_GET: '/Customer.Get',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const CACHE_KEYS = {
  ORDERS: 'orders',
  ITEMS: 'items',
  CUSTOMERS: 'customers',
  PRINTER_STATUS: 'printer_status',
} as const;

export const CACHE_TTL = {
  ORDERS: 15 * 60, // 15 minutes
  ITEMS: 4 * 60 * 60, // 4 hours
  CUSTOMERS: 2 * 60 * 60, // 2 hours
  PRINTER_STATUS: 30, // 30 seconds
} as const;