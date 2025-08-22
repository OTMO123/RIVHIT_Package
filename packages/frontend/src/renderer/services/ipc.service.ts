import { IPC_CHANNELS } from '../../shared/ipc-channels';

// Type-safe IPC service for renderer process
export class IPCService {
  private static instance: IPCService;

  static getInstance(): IPCService {
    if (!IPCService.instance) {
      IPCService.instance = new IPCService();
    }
    return IPCService.instance;
  }

  // Generic IPC invoke method
  private async invoke<T>(channel: string, ...args: any[]): Promise<{
    success: boolean;
    data?: T;
    error?: string;
  }> {
    try {
      // Use the exposed electronAPI
      if (window.electronAPI) {
        const result = await (window.electronAPI as any)[channel](...args);
        return result;
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication error'
      };
    }
  }

  // Orders API
  async getOrders(params?: {
    fromDate?: string;
    toDate?: string;
    documentType?: number;
  }) {
    return this.invoke(IPC_CHANNELS.GET_ORDERS, params);
  }

  async getOrderById(orderId: number) {
    return this.invoke(IPC_CHANNELS.GET_ORDER_BY_ID, orderId);
  }

  async getOrderItems(orderId: number): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (window.electronAPI && window.electronAPI.items) {
        const result = await window.electronAPI.items.getByOrderId(orderId);
        return result;
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IPC communication error'
      };
    }
  }

  async getOrderCustomer(customerId: number) {
    return this.invoke(IPC_CHANNELS.GET_ORDER_CUSTOMER, customerId);
  }

  async getCustomer(customerId: number) {
    return this.invoke(IPC_CHANNELS.GET_ORDER_CUSTOMER, customerId);
  }

  // System API
  async getAppVersion() {
    return this.invoke<string>(IPC_CHANNELS.GET_APP_VERSION);
  }

  // Printer API (future)
  async printLabel(labelData: any) {
    return this.invoke(IPC_CHANNELS.PRINT_LABEL, labelData);
  }

  async getPrinterStatus() {
    return this.invoke(IPC_CHANNELS.GET_PRINTER_STATUS);
  }
}