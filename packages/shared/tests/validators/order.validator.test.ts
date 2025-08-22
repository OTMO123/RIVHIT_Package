import {
  OrderSchema,
  OrderItemSchema,
  OrderFiltersSchema,
  UpdateOrderStatusSchema,
} from '../../src/validators/order.validator';
import { OrderStatus } from '../../src/types/order.types';

describe('Order Validators', () => {
  describe('OrderItemSchema', () => {
    it('should validate valid order item', () => {
      const validItem = {
        id: 'item-123',
        itemId: 1,
        name: 'Test Item',
        nameHebrew: 'פריט מבחן',
        quantity: 5,
        price: 10.99,
        available: true,
        stickerType: 'pelmeni',
        printed: false,
      };

      const result = OrderItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject invalid order item', () => {
      const invalidItem = {
        id: '',
        itemId: -1,
        name: '',
        nameHebrew: '',
        quantity: 0,
        price: -5,
        available: true,
        stickerType: '',
        printed: false,
      };

      const result = OrderItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(7);
      }
    });

    it('should validate optional fields', () => {
      const itemWithOptional = {
        id: 'item-123',
        itemId: 1,
        name: 'Test Item',
        nameHebrew: 'פריט מבחן',
        catalogNumber: 'CAT-001',
        quantity: 5,
        price: 10.99,
        available: true,
        stickerType: 'pelmeni',
        printed: false,
      };

      const result = OrderItemSchema.safeParse(itemWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('OrderSchema', () => {
    it('should validate valid order', () => {
      const validOrder = {
        id: 'order-123',
        documentNumber: 12345,
        documentType: 1,
        customerId: 100,
        customerName: 'Test Customer',
        date: '2025-01-01T10:00:00.000Z',
        time: '10:00:00',
        amount: 100.50,
        status: OrderStatus.PENDING,
        items: [
          {
            id: 'item-1',
            itemId: 1,
            name: 'Test Item',
            nameHebrew: 'פריט מבחן',
            quantity: 2,
            price: 50.25,
            available: true,
            stickerType: 'pelmeni',
            printed: false,
          },
        ],
      };

      const result = OrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('should reject order without items', () => {
      const orderWithoutItems = {
        id: 'order-123',
        documentNumber: 12345,
        documentType: 1,
        customerId: 100,
        customerName: 'Test Customer',
        date: '2025-01-01T10:00:00.000Z',
        time: '10:00:00',
        amount: 100.50,
        status: OrderStatus.PENDING,
        items: [],
      };

      const result = OrderSchema.safeParse(orderWithoutItems);
      expect(result.success).toBe(false);
    });

    it('should validate order with metadata', () => {
      const orderWithMetadata = {
        id: 'order-123',
        documentNumber: 12345,
        documentType: 1,
        customerId: 100,
        customerName: 'Test Customer',
        date: '2025-01-01T10:00:00.000Z',
        time: '10:00:00',
        amount: 100.50,
        status: OrderStatus.COMPLETED,
        items: [
          {
            id: 'item-1',
            itemId: 1,
            name: 'Test Item',
            nameHebrew: 'פריט מבחן',
            quantity: 2,
            price: 50.25,
            available: true,
            stickerType: 'pelmeni',
            printed: true,
          },
        ],
        metadata: {
          processedAt: '2025-01-01T10:30:00.000Z',
          processedBy: 'user-123',
          notes: 'Test notes',
        },
      };

      const result = OrderSchema.safeParse(orderWithMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe('OrderFiltersSchema', () => {
    it('should validate empty filters', () => {
      const result = OrderFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate filters with all fields', () => {
      const filters = {
        status: OrderStatus.PENDING,
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-01-31T23:59:59.999Z',
        customerId: 100,
        documentType: 1,
      };

      const result = OrderFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const filters = {
        dateFrom: 'invalid-date',
      };

      const result = OrderFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateOrderStatusSchema', () => {
    it('should validate status update', () => {
      const update = {
        status: OrderStatus.COMPLETED,
        items: [
          { id: 'item-1', available: true },
          { id: 'item-2', available: false },
        ],
        notes: 'Order completed successfully',
      };

      const result = UpdateOrderStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate minimal status update', () => {
      const update = {
        status: OrderStatus.CANCELLED,
      };

      const result = UpdateOrderStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const update = {
        status: 'invalid-status',
      };

      const result = UpdateOrderStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });
});