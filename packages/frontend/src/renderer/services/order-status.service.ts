export interface OrderStatus {
  orderId: string;
  orderNumber: string;
  status?: 'pending' | 'packing' | 'packed_pending_labels' | 'labels_printed' | 'completed' | 'shipped';
  isPacked: boolean;
  barcodesPrinted: boolean;
  invoiceCreated: boolean;
  invoiceLink?: string;
  packedAt?: string;
  printedAt?: string;
  invoiceCreatedAt?: string;
  exists?: boolean;
}

export interface PackedItem {
  itemId: string;
  catalogNumber?: string;
  itemName: string;
  orderedQuantity: number;
  packedQuantity: number;
  boxNumber?: number;
  notes?: string;
}

export interface OrderStatusUpdate {
  orderNumber: string;
  isPacked?: boolean;
  barcodesPrinted?: boolean;
  invoiceCreated?: boolean;
  invoiceLink?: string;
  packedItems?: PackedItem[];
  customerName?: string;
}

class OrderStatusService {
  private baseUrl = 'http://localhost:3001/api/order-status';

  /**
   * Update general order status with detailed sub-statuses
   */
  async updateGeneralStatus(
    orderId: string, 
    orderNumber: string,
    status: 'pending' | 'packing' | 'packed_pending_labels' | 'labels_printed' | 'completed' | 'shipped'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status/general`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderNumber, status })
      });
      
      if (!response.ok) {
        console.error('Failed to update general status:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating general status:', error);
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status`);
      
      if (!response.ok) {
        console.error('Failed to get order status:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting order status:', error);
      return null;
    }
  }

  /**
   * Update packing status
   */
  async updatePackingStatus(
    orderId: string,
    orderNumber: string,
    isPacked: boolean,
    packedItems?: PackedItem[],
    packedBy?: string
  ): Promise<OrderStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status/packing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          isPacked,
          packedItems,
          packedBy
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update packing status:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error updating packing status:', error);
      return null;
    }
  }

  /**
   * Update barcode printing status
   */
  async updateBarcodeStatus(
    orderId: string,
    orderNumber: string,
    printed: boolean
  ): Promise<OrderStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status/barcodes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          printed
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update barcode status:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error updating barcode status:', error);
      return null;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    orderId: string,
    orderNumber: string,
    created: boolean,
    invoiceLink?: string
  ): Promise<OrderStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status/invoice`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          created,
          invoiceLink
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update invoice status:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      return null;
    }
  }

  /**
   * Update multiple status fields
   */
  async updateOrderStatus(
    orderId: string,
    updates: OrderStatusUpdate
  ): Promise<OrderStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        console.error('Failed to update order status:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error updating order status:', error);
      return null;
    }
  }

  /**
   * Get packing details for an order
   */
  async getPackingDetails(orderId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/packing-details`);
      
      if (!response.ok) {
        console.error('Failed to get packing details:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting packing details:', error);
      return [];
    }
  }

  /**
   * Get all order statuses
   */
  async getAllOrderStatuses(): Promise<OrderStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      
      if (!response.ok) {
        console.error('Failed to get all order statuses:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting all order statuses:', error);
      return [];
    }
  }

  /**
   * Delete order status (for testing/cleanup)
   */
  async deleteOrderStatus(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/status`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Failed to delete order status:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error deleting order status:', error);
      return false;
    }
  }

  /**
   * Save draft boxes
   */
  async saveDraftBoxes(orderId: string, boxes: any[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/draft-boxes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boxes })
      });
      
      if (!response.ok) {
        console.error('Failed to save draft boxes:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error saving draft boxes:', error);
      return false;
    }
  }

  /**
   * Get draft boxes
   */
  async getDraftBoxes(orderId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/draft-boxes`);
      
      if (!response.ok) {
        console.error('Failed to get draft boxes:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting draft boxes:', error);
      return [];
    }
  }

  /**
   * Save draft packing data
   */
  async saveDraftPackingData(orderId: string, packingData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/draft-packing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packingData })
      });
      
      if (!response.ok) {
        console.error('Failed to save draft packing data:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error saving draft packing data:', error);
      return false;
    }
  }

  /**
   * Get draft packing data
   */
  async getDraftPackingData(orderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/draft-packing`);
      
      if (!response.ok) {
        console.error('Failed to get draft packing data:', response.statusText);
        return {};
      }
      
      const data = await response.json();
      return data.success ? data.data : {};
    } catch (error) {
      console.error('Error getting draft packing data:', error);
      return {};
    }
  }

  /**
   * Clear draft data
   */
  async clearDraftData(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/draft`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Failed to clear draft data:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error clearing draft data:', error);
      return false;
    }
  }
}

export const orderStatusService = new OrderStatusService();