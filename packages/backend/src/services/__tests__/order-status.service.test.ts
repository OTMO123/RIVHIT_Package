import { OrderStatusService, PackedItem, OrderStatusUpdate } from '../order-status.service';
import { OrderStatus } from '../../entities/OrderStatus';
import { OrderPackingDetails } from '../../entities/OrderPackingDetails';
import { OrderBoxes } from '../../entities/OrderBoxes';
import { AppDataSource } from '../../config/database.config';
import { Repository } from 'typeorm';

// Mock TypeORM
jest.mock('../../config/database.config');
jest.mock('typeorm');

describe('OrderStatusService', () => {
  let service: OrderStatusService;
  let mockOrderStatusRepo: jest.Mocked<Repository<OrderStatus>>;
  let mockPackingDetailsRepo: jest.Mocked<Repository<OrderPackingDetails>>;
  let mockOrderBoxesRepo: jest.Mocked<Repository<OrderBoxes>>;
  let mockTransactionManager: any;

  const mockOrderId = '39641';
  const mockOrderNumber = 'ORDER-39641';

  const mockOrderStatus = {
    id: 1,
    orderId: mockOrderId,
    orderNumber: mockOrderNumber,
    status: 'pending' as const,
    isPacked: false,
    barcodesPrinted: false,
    invoiceCreated: false,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    packedAt: undefined,
    printedAt: undefined,
    invoiceCreatedAt: undefined,
    packedBy: undefined,
    invoiceLink: undefined,
    customerName: undefined,
    packedItemsJson: undefined,
    // Add the getter method for testing
    get packedItems() {
      return this.packedItemsJson ? JSON.parse(this.packedItemsJson) : null;
    },
    set packedItems(value: any) {
      this.packedItemsJson = value ? JSON.stringify(value) : undefined;
    }
  } as OrderStatus;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock repositories
    mockOrderStatusRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn()
    } as any;

    mockPackingDetailsRepo = {
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn()
    } as any;

    mockOrderBoxesRepo = {
      find: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    } as any;

    // Mock transaction manager
    mockTransactionManager = {
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock)
      .mockImplementation((entity) => {
        if (entity === OrderStatus) return mockOrderStatusRepo;
        if (entity === OrderPackingDetails) return mockPackingDetailsRepo;
        if (entity === OrderBoxes) return mockOrderBoxesRepo;
        return {};
      });

    (AppDataSource.transaction as jest.Mock) = jest.fn().mockImplementation(
      async (callback) => await callback(mockTransactionManager)
    );

    service = new OrderStatusService();
  });

  describe('getOrderStatus', () => {
    it('should return order status when found', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);

      const result = await service.getOrderStatus(mockOrderId);

      expect(result).toEqual(mockOrderStatus);
      expect(mockOrderStatusRepo.findOne).toHaveBeenCalledWith({
        where: { orderId: mockOrderId }
      });
    });

    it('should return null when order status not found', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(null);

      const result = await service.getOrderStatus('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      const dbError = new Error('Database connection failed');
      mockOrderStatusRepo.findOne.mockRejectedValue(dbError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.getOrderStatus(mockOrderId)).rejects.toThrow('Database connection failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting order status:', dbError);

      consoleSpy.mockRestore();
    });
  });

  describe('getOrCreateOrderStatus', () => {
    it('should return existing order status', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);

      const result = await service.getOrCreateOrderStatus(mockOrderId, mockOrderNumber);

      expect(result).toEqual(mockOrderStatus);
      expect(mockOrderStatusRepo.create).not.toHaveBeenCalled();
      expect(mockOrderStatusRepo.save).not.toHaveBeenCalled();
    });

    it('should create new order status when not found', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(null);
      
      const newOrderStatus = { ...mockOrderStatus, id: 2 } as OrderStatus;
      mockOrderStatusRepo.create.mockReturnValue(newOrderStatus as any);
      mockOrderStatusRepo.save.mockResolvedValue(newOrderStatus);

      const result = await service.getOrCreateOrderStatus(mockOrderId, mockOrderNumber);

      expect(mockOrderStatusRepo.create).toHaveBeenCalledWith({
        orderId: mockOrderId,
        orderNumber: mockOrderNumber,
        status: 'pending',
        isPacked: false,
        barcodesPrinted: false,
        invoiceCreated: false
      });
      expect(mockOrderStatusRepo.save).toHaveBeenCalledWith(newOrderStatus);
      expect(result).toEqual(newOrderStatus);
    });

    it('should handle creation errors', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(null);
      mockOrderStatusRepo.create.mockReturnValue({} as any);
      mockOrderStatusRepo.save.mockRejectedValue(new Error('Save failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.getOrCreateOrderStatus(mockOrderId, mockOrderNumber))
        .rejects.toThrow('Save failed');

      consoleSpy.mockRestore();
    });
  });

  describe('updatePackingStatus', () => {
    const mockPackedItems: PackedItem[] = [
      {
        itemId: '1',
        catalogNumber: 'CAT001',
        itemName: 'Test Item 1',
        orderedQuantity: 10,
        packedQuantity: 8,
        boxNumber: 1,
        notes: 'Partial pack'
      },
      {
        itemId: '2',
        itemName: 'Test Item 2',
        orderedQuantity: 5,
        packedQuantity: 5,
        boxNumber: 2
      }
    ];

    it('should update packing status to packed', async () => {
      const packedBy = 'john.doe';
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        isPacked: true,
        status: 'packed_pending_labels' as const,
        packedAt: expect.any(Date),
        packedBy,
        packedItems: mockPackedItems
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      // Mock savePackingDetails method
      mockPackingDetailsRepo.delete.mockResolvedValue(undefined as any);
      mockPackingDetailsRepo.create.mockImplementation(data => data as any);
      mockPackingDetailsRepo.save.mockResolvedValue([] as any);

      const result = await service.updatePackingStatus(
        mockOrderId, 
        mockOrderNumber, 
        true, 
        mockPackedItems, 
        packedBy
      );

      expect(result.isPacked).toBe(true);
      expect(result.status).toBe('packed_pending_labels');
      expect(result.packedBy).toBe(packedBy);
      expect(result.packedItems).toEqual(mockPackedItems);
      expect(mockPackingDetailsRepo.delete).toHaveBeenCalledWith({ orderId: mockOrderId });
    });

    it('should update packing status to unpacked', async () => {
      const packedStatus = { ...mockOrderStatus, isPacked: true } as OrderStatus;
      mockOrderStatusRepo.findOne.mockResolvedValue(packedStatus);
      
      const updatedStatus = { ...packedStatus, isPacked: false } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updatePackingStatus(mockOrderId, mockOrderNumber, false);

      expect(result.isPacked).toBe(false);
      expect(mockPackingDetailsRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle packing details save failure', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      mockOrderStatusRepo.save.mockResolvedValue(mockOrderStatus);
      mockPackingDetailsRepo.delete.mockRejectedValue(new Error('Delete failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.updatePackingStatus(
        mockOrderId, 
        mockOrderNumber, 
        true, 
        mockPackedItems
      )).rejects.toThrow('Delete failed');

      consoleSpy.mockRestore();
    });
  });

  describe('updateBarcodeStatus', () => {
    it('should update barcode printing status', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        barcodesPrinted: true,
        printedAt: expect.any(Date)
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateBarcodeStatus(mockOrderId, mockOrderNumber, true);

      expect(result.barcodesPrinted).toBe(true);
      expect(result.printedAt).toBeInstanceOf(Date);
    });

    it('should handle barcode status false', async () => {
      const printedStatus = { 
        ...mockOrderStatus, 
        barcodesPrinted: true, 
        printedAt: new Date() 
      } as OrderStatus;
      mockOrderStatusRepo.findOne.mockResolvedValue(printedStatus);
      
      const updatedStatus = { ...printedStatus, barcodesPrinted: false } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateBarcodeStatus(mockOrderId, mockOrderNumber, false);

      expect(result.barcodesPrinted).toBe(false);
      // printedAt should not be modified when setting to false
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update invoice status with link', async () => {
      const invoiceLink = 'https://example.com/invoice/123';
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        invoiceCreated: true,
        invoiceCreatedAt: expect.any(Date),
        invoiceLink
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateInvoiceStatus(
        mockOrderId, 
        mockOrderNumber, 
        true, 
        invoiceLink
      );

      expect(result.invoiceCreated).toBe(true);
      expect(result.invoiceCreatedAt).toBeInstanceOf(Date);
      expect(result.invoiceLink).toBe(invoiceLink);
    });

    it('should update invoice status without link', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        invoiceCreated: true,
        invoiceCreatedAt: expect.any(Date)
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateInvoiceStatus(mockOrderId, mockOrderNumber, true);

      expect(result.invoiceCreated).toBe(true);
      expect(result.invoiceLink).toBeFalsy();
    });
  });

  describe('updateOrderStatus', () => {
    const mockUpdates: OrderStatusUpdate = {
      isPacked: true,
      barcodesPrinted: true,
      invoiceCreated: true,
      invoiceLink: 'https://example.com/invoice',
      packedItems: [
        {
          itemId: '1',
          itemName: 'Test Item',
          orderedQuantity: 5,
          packedQuantity: 5,
          boxNumber: 1
        }
      ],
      customerName: 'Test Customer'
    };

    it('should update multiple status fields', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        isPacked: true,
        barcodesPrinted: true,
        invoiceCreated: true,
        invoiceLink: 'https://example.com/invoice',
        packedItems: mockUpdates.packedItems,
        customerName: 'Test Customer',
        packedAt: expect.any(Date),
        printedAt: expect.any(Date),
        invoiceCreatedAt: expect.any(Date)
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      // Mock savePackingDetails
      mockPackingDetailsRepo.delete.mockResolvedValue(undefined as any);
      mockPackingDetailsRepo.create.mockImplementation(data => data as any);
      mockPackingDetailsRepo.save.mockResolvedValue([] as any);

      const result = await service.updateOrderStatus(mockOrderId, mockOrderNumber, mockUpdates);

      expect(result.isPacked).toBe(true);
      expect(result.barcodesPrinted).toBe(true);
      expect(result.invoiceCreated).toBe(true);
      expect(result.invoiceLink).toBe('https://example.com/invoice');
      expect(result.customerName).toBe('Test Customer');
    });

    it('should handle partial updates', async () => {
      const partialUpdates: OrderStatusUpdate = {
        isPacked: true,
        customerName: 'Partial Update Customer'
      };

      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      mockOrderStatusRepo.save.mockResolvedValue({
        ...mockOrderStatus,
        isPacked: true,
        customerName: 'Partial Update Customer',
        packedAt: expect.any(Date)
      } as OrderStatus);

      const result = await service.updateOrderStatus(mockOrderId, mockOrderNumber, partialUpdates);

      expect(result.isPacked).toBe(true);
      expect(result.customerName).toBe('Partial Update Customer');
      // Other fields should remain unchanged
      expect(result.barcodesPrinted).toBe(false);
      expect(result.invoiceCreated).toBe(false);
    });
  });

  describe('updateGeneralStatus', () => {
    it('should update status to packed_pending_labels', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        status: 'packed_pending_labels' as const,
        isPacked: true,
        packedAt: expect.any(Date)
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateGeneralStatus(
        mockOrderId, 
        mockOrderNumber, 
        'packed_pending_labels'
      );

      expect(result.status).toBe('packed_pending_labels');
      expect(result.isPacked).toBe(true);
      expect(result.packedAt).toBeInstanceOf(Date);
    });

    it('should update status to completed with all flags', async () => {
      mockOrderStatusRepo.findOne.mockResolvedValue(mockOrderStatus);
      
      const updatedStatus = {
        ...mockOrderStatus,
        status: 'completed' as const,
        isPacked: true,
        barcodesPrinted: true,
        invoiceCreated: true,
        invoiceCreatedAt: expect.any(Date)
      } as OrderStatus;
      mockOrderStatusRepo.save.mockResolvedValue(updatedStatus);

      const result = await service.updateGeneralStatus(mockOrderId, mockOrderNumber, 'completed');

      expect(result.status).toBe('completed');
      expect(result.isPacked).toBe(true);
      expect(result.barcodesPrinted).toBe(true);
      expect(result.invoiceCreated).toBe(true);
    });

    it('should not overwrite existing timestamps', async () => {
      const existingPackedAt = new Date('2025-01-01T09:00:00Z');
      const statusWithDates = {
        ...mockOrderStatus,
        packedAt: existingPackedAt
      } as OrderStatus;
      
      mockOrderStatusRepo.findOne.mockResolvedValue(statusWithDates);
      mockOrderStatusRepo.save.mockResolvedValue({
        ...statusWithDates,
        status: 'labels_printed' as const,
        isPacked: true,
        barcodesPrinted: true,
        printedAt: expect.any(Date)
      } as OrderStatus);

      const result = await service.updateGeneralStatus(mockOrderId, mockOrderNumber, 'labels_printed');

      expect(result.packedAt).toEqual(existingPackedAt); // Should not change
    });
  });

  describe('getPackingDetails', () => {
    it('should return packing details ordered by box and item name', async () => {
      const mockDetails: OrderPackingDetails[] = [
        {
          id: 1,
          orderId: mockOrderId,
          orderNumber: mockOrderNumber,
          itemId: '1',
          catalogNumber: 'CAT001',
          itemName: 'Item A',
          orderedQuantity: 10,
          packedQuantity: 8,
          boxNumber: 1,
          isDraft: false,
          notes: 'Note 1',
          packedBy: 'john.doe',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          orderId: mockOrderId,
          orderNumber: mockOrderNumber,
          itemId: '2',
          itemName: 'Item B',
          orderedQuantity: 5,
          packedQuantity: 5,
          boxNumber: 2,
          isDraft: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPackingDetailsRepo.find.mockResolvedValue(mockDetails);

      const result = await service.getPackingDetails(mockOrderId);

      expect(result).toEqual(mockDetails);
      expect(mockPackingDetailsRepo.find).toHaveBeenCalledWith({
        where: { orderId: mockOrderId },
        order: { boxNumber: 'ASC', itemName: 'ASC' }
      });
    });

    it('should return empty array when no details found', async () => {
      mockPackingDetailsRepo.find.mockResolvedValue([]);

      const result = await service.getPackingDetails(mockOrderId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllOrderStatuses', () => {
    it('should return all order statuses ordered by updated date', async () => {
      const mockStatuses = [mockOrderStatus];
      mockOrderStatusRepo.find.mockResolvedValue(mockStatuses);

      const result = await service.getAllOrderStatuses();

      expect(result).toEqual(mockStatuses);
      expect(mockOrderStatusRepo.find).toHaveBeenCalledWith({
        order: { updatedAt: 'DESC' }
      });
    });
  });

  describe('deleteOrderStatus', () => {
    it('should delete order status and related data', async () => {
      mockPackingDetailsRepo.delete.mockResolvedValue(undefined as any);
      mockOrderStatusRepo.delete.mockResolvedValue(undefined as any);

      await service.deleteOrderStatus(mockOrderId);

      expect(mockPackingDetailsRepo.delete).toHaveBeenCalledWith({ orderId: mockOrderId });
      expect(mockOrderStatusRepo.delete).toHaveBeenCalledWith({ orderId: mockOrderId });
    });

    it('should handle deletion errors', async () => {
      mockPackingDetailsRepo.delete.mockRejectedValue(new Error('Delete failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.deleteOrderStatus(mockOrderId)).rejects.toThrow('Delete failed');

      consoleSpy.mockRestore();
    });
  });

  describe('saveDraftBoxes', () => {
    const mockBoxes = [
      {
        boxNumber: 1,
        items: [{ itemId: '1', quantity: 5 }],
        totalWeight: 2.5
      },
      {
        boxNumber: 2,
        items: [{ itemId: '2', quantity: 3 }],
        totalWeight: 1.8
      }
    ];

    it('should save draft boxes using transaction', async () => {
      mockTransactionManager.delete.mockResolvedValue(undefined);
      mockTransactionManager.create.mockImplementation((entity: any, data: any) => data);
      mockTransactionManager.save.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.saveDraftBoxes(mockOrderId, mockBoxes);

      expect(mockTransactionManager.delete).toHaveBeenCalledWith(
        OrderBoxes, 
        { orderId: mockOrderId, isDraft: true }
      );
      expect(mockTransactionManager.create).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        `✅ Successfully saved 2 draft boxes for order ${mockOrderId}`
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty boxes array', async () => {
      mockTransactionManager.delete.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.saveDraftBoxes(mockOrderId, []);

      expect(mockTransactionManager.delete).toHaveBeenCalled();
      expect(mockTransactionManager.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        `⚠️ No boxes to save for order ${mockOrderId}`
      );

      consoleSpy.mockRestore();
    });

    it('should handle transaction errors', async () => {
      (AppDataSource.transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.saveDraftBoxes(mockOrderId, mockBoxes))
        .rejects.toThrow('Transaction failed');

      consoleSpy.mockRestore();
    });
  });

  describe('getDraftBoxes', () => {
    it('should return draft boxes ordered by box number', async () => {
      const mockDraftBoxes: OrderBoxes[] = [
        {
          id: 1,
          orderId: mockOrderId,
          boxNumber: 1,
          itemsJson: '[{"itemId":"1","quantity":5}]',
          totalWeight: 2.5,
          isDraft: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          get items() {
            try {
              return JSON.parse(this.itemsJson || '[]');
            } catch {
              return [];
            }
          },
          set items(value: any[]) {
            this.itemsJson = JSON.stringify(value || []);
          }
        }
      ];

      mockOrderBoxesRepo.find.mockResolvedValue(mockDraftBoxes);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await service.getDraftBoxes(mockOrderId);

      expect(result).toEqual(mockDraftBoxes);
      expect(mockOrderBoxesRepo.find).toHaveBeenCalledWith({
        where: { orderId: mockOrderId, isDraft: true },
        order: { boxNumber: 'ASC' }
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        `📦 Retrieved 1 draft boxes for order ${mockOrderId}`
      );

      consoleSpy.mockRestore();
    });
  });

  describe('saveDraftPackingData', () => {
    const mockPackingData = {
      'item1': {
        quantity: 5,
        boxNumber: 1,
        itemName: 'Test Item 1',
        orderedQuantity: 10
      },
      'item2': {
        quantity: 3,
        boxNumber: 2,
        itemName: 'Test Item 2',
        orderedQuantity: 5
      }
    };

    it('should save draft packing data', async () => {
      mockPackingDetailsRepo.delete.mockResolvedValue(undefined as any);
      mockPackingDetailsRepo.create.mockImplementation(data => data as any);
      mockPackingDetailsRepo.save.mockImplementation(data => data as any);

      await service.saveDraftPackingData(mockOrderId, mockPackingData);

      expect(mockPackingDetailsRepo.delete).toHaveBeenCalledWith({
        orderId: mockOrderId,
        isDraft: true
      });
      expect(mockPackingDetailsRepo.create).toHaveBeenCalledTimes(2);
      expect(mockPackingDetailsRepo.save).toHaveBeenCalled();
    });
  });

  describe('getDraftPackingData', () => {
    it('should return draft packing data in correct format', async () => {
      const mockDraftDetails: OrderPackingDetails[] = [
        {
          id: 1,
          orderId: mockOrderId,
          orderNumber: mockOrderId,
          itemId: 'item1',
          itemName: 'Test Item 1',
          orderedQuantity: 10,
          packedQuantity: 0,
          draftQuantity: 5,
          draftBoxNumber: 1,
          isDraft: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPackingDetailsRepo.find.mockResolvedValue(mockDraftDetails);

      const result = await service.getDraftPackingData(mockOrderId);

      expect(result).toEqual({
        item1: {
          quantity: 5,
          boxNumber: 1,
          itemName: 'Test Item 1',
          orderedQuantity: 10
        }
      });
    });
  });

  describe('clearDraftData', () => {
    it('should clear all draft data', async () => {
      mockOrderBoxesRepo.delete.mockResolvedValue(undefined as any);
      mockPackingDetailsRepo.delete.mockResolvedValue(undefined as any);

      await service.clearDraftData(mockOrderId);

      expect(mockOrderBoxesRepo.delete).toHaveBeenCalledWith({
        orderId: mockOrderId,
        isDraft: true
      });
      expect(mockPackingDetailsRepo.delete).toHaveBeenCalledWith({
        orderId: mockOrderId,
        isDraft: true
      });
    });
  });

  describe('error handling', () => {
    it('should log and re-throw database errors', async () => {
      const dbError = new Error('Database error');
      mockOrderStatusRepo.findOne.mockRejectedValue(dbError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.getOrderStatus(mockOrderId)).rejects.toThrow('Database error');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting order status:', dbError);

      consoleSpy.mockRestore();
    });
  });
});