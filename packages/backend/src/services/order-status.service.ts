import { AppDataSource } from '../config/database.config';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderPackingDetails } from '../entities/OrderPackingDetails';
import { OrderBoxes } from '../entities/OrderBoxes';
import { Repository } from 'typeorm';

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
  isPacked?: boolean;
  barcodesPrinted?: boolean;
  invoiceCreated?: boolean;
  invoiceLink?: string;
  packedItems?: PackedItem[];
  customerName?: string;
}

export class OrderStatusService {
  private orderStatusRepo: Repository<OrderStatus>;
  private packingDetailsRepo: Repository<OrderPackingDetails>;
  private orderBoxesRepo: Repository<OrderBoxes>;

  constructor() {
    this.orderStatusRepo = AppDataSource.getRepository(OrderStatus);
    this.packingDetailsRepo = AppDataSource.getRepository(OrderPackingDetails);
    this.orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
  }

  /**
   * Get order status by order ID
   */
  async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    try {
      const status = await this.orderStatusRepo.findOne({
        where: { orderId }
      });
      return status;
    } catch (error) {
      console.error('Error getting order status:', error);
      throw error;
    }
  }

  /**
   * Get or create order status
   */
  async getOrCreateOrderStatus(orderId: string, orderNumber: string): Promise<OrderStatus> {
    try {
      let status = await this.getOrderStatus(orderId);
      
      if (!status) {
        status = this.orderStatusRepo.create({
          orderId,
          orderNumber,
          status: 'pending',
          isPacked: false,
          barcodesPrinted: false,
          invoiceCreated: false
        });
        status = await this.orderStatusRepo.save(status);
      }
      
      return status;
    } catch (error) {
      console.error('Error getting or creating order status:', error);
      throw error;
    }
  }

  /**
   * Update order packing status
   */
  async updatePackingStatus(
    orderId: string,
    orderNumber: string,
    isPacked: boolean,
    packedItems?: PackedItem[],
    packedBy?: string
  ): Promise<OrderStatus> {
    try {
      let status = await this.getOrCreateOrderStatus(orderId, orderNumber);
      
      status.isPacked = isPacked;
      if (isPacked) {
        status.status = 'packed_pending_labels'; // Update to next stage
        status.packedAt = new Date();
        status.packedBy = packedBy;
        if (packedItems) {
          status.packedItems = packedItems;
          // Also save detailed packing info
          await this.savePackingDetails(orderId, orderNumber, packedItems, packedBy);
        }
      }
      
      return await this.orderStatusRepo.save(status);
    } catch (error) {
      console.error('Error updating packing status:', error);
      throw error;
    }
  }

  /**
   * Update barcode printing status
   */
  async updateBarcodeStatus(
    orderId: string,
    orderNumber: string,
    printed: boolean
  ): Promise<OrderStatus> {
    try {
      let status = await this.getOrCreateOrderStatus(orderId, orderNumber);
      
      status.barcodesPrinted = printed;
      if (printed) {
        status.printedAt = new Date();
      }
      
      return await this.orderStatusRepo.save(status);
    } catch (error) {
      console.error('Error updating barcode status:', error);
      throw error;
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
  ): Promise<OrderStatus> {
    try {
      let status = await this.getOrCreateOrderStatus(orderId, orderNumber);
      
      status.invoiceCreated = created;
      if (created) {
        status.invoiceCreatedAt = new Date();
        if (invoiceLink) {
          status.invoiceLink = invoiceLink;
        }
      }
      
      return await this.orderStatusRepo.save(status);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Update order status with multiple fields
   */
  async updateOrderStatus(
    orderId: string,
    orderNumber: string,
    updates: OrderStatusUpdate
  ): Promise<OrderStatus> {
    try {
      let status = await this.getOrCreateOrderStatus(orderId, orderNumber);
      
      if (updates.isPacked !== undefined) {
        status.isPacked = updates.isPacked;
        if (updates.isPacked) {
          status.packedAt = new Date();
        }
      }
      
      if (updates.barcodesPrinted !== undefined) {
        status.barcodesPrinted = updates.barcodesPrinted;
        if (updates.barcodesPrinted) {
          status.printedAt = new Date();
        }
      }
      
      if (updates.invoiceCreated !== undefined) {
        status.invoiceCreated = updates.invoiceCreated;
        if (updates.invoiceCreated) {
          status.invoiceCreatedAt = new Date();
        }
      }
      
      if (updates.invoiceLink) {
        status.invoiceLink = updates.invoiceLink;
      }
      
      if (updates.packedItems) {
        status.packedItems = updates.packedItems;
        await this.savePackingDetails(orderId, orderNumber, updates.packedItems);
      }
      
      if (updates.customerName) {
        status.customerName = updates.customerName;
      }
      
      return await this.orderStatusRepo.save(status);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Save packing details
   */
  private async savePackingDetails(
    orderId: string,
    orderNumber: string,
    packedItems: PackedItem[],
    packedBy?: string
  ): Promise<void> {
    try {
      // Delete existing details for this order
      await this.packingDetailsRepo.delete({ orderId });
      
      // Save new details
      const details = packedItems.map(item => 
        this.packingDetailsRepo.create({
          orderId,
          orderNumber,
          itemId: item.itemId,
          catalogNumber: item.catalogNumber,
          itemName: item.itemName,
          orderedQuantity: item.orderedQuantity,
          packedQuantity: item.packedQuantity,
          boxNumber: item.boxNumber,
          notes: item.notes,
          packedBy
        })
      );
      
      await this.packingDetailsRepo.save(details);
    } catch (error) {
      console.error('Error saving packing details:', error);
      throw error;
    }
  }

  /**
   * Update general order status with detailed sub-statuses
   */
  async updateGeneralStatus(
    orderId: string,
    orderNumber: string,
    newStatus: 'pending' | 'packing' | 'packed_pending_labels' | 'labels_printed' | 'completed' | 'shipped'
  ): Promise<OrderStatus> {
    try {
      let status = await this.getOrCreateOrderStatus(orderId, orderNumber);
      
      status.status = newStatus;
      
      // Auto-update related flags based on status
      switch(newStatus) {
        case 'packed_pending_labels':
          status.isPacked = true;
          if (!status.packedAt) {
            status.packedAt = new Date();
          }
          break;
        case 'labels_printed':
          status.isPacked = true;
          status.barcodesPrinted = true;
          if (!status.printedAt) {
            status.printedAt = new Date();
          }
          break;
        case 'completed':
          status.isPacked = true;
          status.barcodesPrinted = true;
          status.invoiceCreated = true;
          if (!status.invoiceCreatedAt) {
            status.invoiceCreatedAt = new Date();
          }
          break;
        case 'shipped':
          status.isPacked = true;
          status.barcodesPrinted = true;
          status.invoiceCreated = true;
          break;
      }
      
      return await this.orderStatusRepo.save(status);
    } catch (error) {
      console.error('Error updating general status:', error);
      throw error;
    }
  }

  /**
   * Get packing details for an order
   */
  async getPackingDetails(orderId: string): Promise<OrderPackingDetails[]> {
    try {
      return await this.packingDetailsRepo.find({
        where: { orderId },
        order: { boxNumber: 'ASC', itemName: 'ASC' }
      });
    } catch (error) {
      console.error('Error getting packing details:', error);
      throw error;
    }
  }

  /**
   * Get all orders with status
   */
  async getAllOrderStatuses(): Promise<OrderStatus[]> {
    try {
      return await this.orderStatusRepo.find({
        order: { updatedAt: 'DESC' }
      });
    } catch (error) {
      console.error('Error getting all order statuses:', error);
      throw error;
    }
  }

  /**
   * Delete order status (for testing/cleanup)
   */
  async deleteOrderStatus(orderId: string): Promise<void> {
    try {
      await this.packingDetailsRepo.delete({ orderId });
      await this.orderStatusRepo.delete({ orderId });
    } catch (error) {
      console.error('Error deleting order status:', error);
      throw error;
    }
  }

  /**
   * Save draft boxes
   */
  async saveDraftBoxes(orderId: string, boxes: any[]): Promise<void> {
    try {
      // Use transaction to ensure atomic operation
      await AppDataSource.transaction(async manager => {
        // First, delete existing draft boxes for this order
        await manager.delete(OrderBoxes, { orderId, isDraft: true });
        
        // If we have boxes to save, insert them
        if (boxes && boxes.length > 0) {
          const draftBoxes = boxes.map(box => 
            manager.create(OrderBoxes, {
              orderId,
              boxNumber: box.boxNumber,
              itemsJson: JSON.stringify(box.items || []),
              totalWeight: box.totalWeight,
              isDraft: true
            })
          );
          
          await manager.save(OrderBoxes, draftBoxes);
          console.log(`✅ Successfully saved ${draftBoxes.length} draft boxes for order ${orderId}`);
        } else {
          console.log(`⚠️ No boxes to save for order ${orderId}`);
        }
      });
    } catch (error) {
      console.error('Error saving draft boxes:', error);
      throw error;
    }
  }

  /**
   * Get draft boxes
   */
  async getDraftBoxes(orderId: string): Promise<OrderBoxes[]> {
    try {
      const boxes = await this.orderBoxesRepo.find({
        where: { orderId, isDraft: true },
        order: { boxNumber: 'ASC' }
      });
      console.log(`📦 Retrieved ${boxes.length} draft boxes for order ${orderId}`);
      return boxes;
    } catch (error) {
      console.error('Error getting draft boxes:', error);
      throw error;
    }
  }

  /**
   * Save draft packing data
   */
  async saveDraftPackingData(orderId: string, packingData: any): Promise<void> {
    try {
      // Delete existing draft packing data
      await this.packingDetailsRepo.delete({ orderId, isDraft: true });
      
      // Save new draft packing data
      const draftDetails = Object.entries(packingData).map(([itemKey, data]: [string, any]) =>
        this.packingDetailsRepo.create({
          orderId,
          orderNumber: orderId, // Using orderId as orderNumber since we removed orderNumber
          itemId: itemKey,
          itemName: data.itemName || 'Unknown',
          orderedQuantity: data.orderedQuantity || 0,
          packedQuantity: 0, // Not packed yet
          draftQuantity: data.quantity,
          draftBoxNumber: data.boxNumber,
          isDraft: true
        })
      );
      
      await this.packingDetailsRepo.save(draftDetails);
    } catch (error) {
      console.error('Error saving draft packing data:', error);
      throw error;
    }
  }

  /**
   * Get draft packing data
   */
  async getDraftPackingData(orderId: string): Promise<any> {
    try {
      const draftDetails = await this.packingDetailsRepo.find({
        where: { orderId, isDraft: true }
      });
      
      // Convert back to packingData format
      const packingData: any = {};
      draftDetails.forEach(detail => {
        packingData[detail.itemId] = {
          quantity: detail.draftQuantity || 0,
          boxNumber: detail.draftBoxNumber || 1,
          itemName: detail.itemName,
          orderedQuantity: detail.orderedQuantity
        };
      });
      
      return packingData;
    } catch (error) {
      console.error('Error getting draft packing data:', error);
      throw error;
    }
  }

  /**
   * Clear draft data (when finalizing)
   */
  async clearDraftData(orderId: string): Promise<void> {
    try {
      await this.orderBoxesRepo.delete({ orderId, isDraft: true });
      await this.packingDetailsRepo.delete({ orderId, isDraft: true });
    } catch (error) {
      console.error('Error clearing draft data:', error);
      throw error;
    }
  }
}