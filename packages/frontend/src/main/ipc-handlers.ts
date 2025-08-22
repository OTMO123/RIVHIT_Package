import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IRivhitService, ServiceDocumentFilters, ServiceItemFilters } from '../../../backend/src/interfaces/IRivhitService';
import { IPC_CHANNELS } from '../shared/ipc-channels';

// Type-safe IPC handler
export class IPCHandlers {
  constructor(private rivhitService: IRivhitService) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Orders handlers
    ipcMain.handle(IPC_CHANNELS.GET_ORDERS, this.handleGetOrders.bind(this));
    ipcMain.handle(IPC_CHANNELS.GET_ORDER_BY_ID, this.handleGetOrderById.bind(this));
    ipcMain.handle(IPC_CHANNELS.GET_ORDER_ITEMS, this.handleGetOrderItems.bind(this));
    ipcMain.handle(IPC_CHANNELS.GET_ORDER_CUSTOMER, this.handleGetOrderCustomer.bind(this));
    
    // System handlers
    ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, this.handleGetAppVersion.bind(this));
  }

  private async handleGetOrders(
    event: IpcMainInvokeEvent,
    params?: { fromDate?: string; toDate?: string; documentType?: number }
  ) {
    try {
      const filters: ServiceDocumentFilters = {
        date_from: params?.fromDate,
        date_to: params?.toDate,
        document_type: params?.documentType
      };
      const orders = await this.rivhitService.getDocuments(filters);
      return { success: true, data: orders };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get orders' 
      };
    }
  }

  private async handleGetOrderById(event: IpcMainInvokeEvent, orderId: number) {
    try {
      const filters: ServiceDocumentFilters = {
        search_text: orderId.toString()
      };
      const orders = await this.rivhitService.getDocuments(filters);
      const order = orders.find(o => o.document_number === orderId) || null;
      
      if (!order) {
        return { success: false, error: 'Order not found' };
      }
      
      return { success: true, data: order };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get order' 
      };
    }
  }

  private async handleGetOrderItems(event: IpcMainInvokeEvent, orderId: number) {
    try {
      // First get the order to find its document type
      const filters: ServiceDocumentFilters = {
        search_text: orderId.toString()
      };
      const orders = await this.rivhitService.getDocuments(filters);
      const order = orders.find(o => o.document_number === orderId);
      
      if (!order) {
        return { success: false, error: 'Order not found' };
      }
      
      // Now get the document details with items
      const documentDetails = await this.rivhitService.getDocumentDetails(
        order.document_type,
        orderId
      );
      
      // Extract items from the response
      const items = documentDetails?.items || [];
      
      return { success: true, data: items };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get order items' 
      };
    }
  }

  private async handleGetOrderCustomer(event: IpcMainInvokeEvent, customerId: number) {
    try {
      const customer = await this.rivhitService.getCustomer(customerId);
      return { success: true, data: customer };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get customer' 
      };
    }
  }

  private handleGetAppVersion(): { success: boolean; data: string } {
    const version = process.env.npm_package_version || '1.0.0';
    return { success: true, data: version };
  }

  // Cleanup method
  removeAllHandlers(): void {
    Object.values(IPC_CHANNELS).forEach(channel => {
      ipcMain.removeAllListeners(channel);
    });
  }
}