// IPC channels constants - shared between main and renderer processes
export const IPC_CHANNELS = {
  // Orders
  GET_ORDERS: 'get-orders',
  GET_ORDER_BY_ID: 'get-order-by-id',
  GET_ORDER_ITEMS: 'get-order-items',
  GET_ORDER_CUSTOMER: 'get-order-customer',
  
  // System
  GET_APP_VERSION: 'get-app-version',
  SHOW_MESSAGE_BOX: 'show-message-box',
  
  // Printer (for future)
  PRINT_LABEL: 'print-label',
  GET_PRINTER_STATUS: 'get-printer-status'
} as const;