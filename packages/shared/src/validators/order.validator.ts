import { z } from 'zod';
import { OrderStatus } from '../types/order.types';

export const OrderItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  itemId: z.number().int().positive('Item ID must be positive'),
  name: z.string().min(1, 'Item name is required'),
  nameHebrew: z.string().min(1, 'Hebrew name is required'),
  catalogNumber: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().nonnegative('Price must be non-negative'),
  available: z.boolean(),
  stickerType: z.string().min(1, 'Sticker type is required'),
  printed: z.boolean(),
});

export const OrderSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
  documentNumber: z.number().int().positive('Document number must be positive'),
  documentType: z.number().int().nonnegative('Document type must be non-negative'),
  customerId: z.number().int().positive('Customer ID must be positive'),
  customerName: z.string().min(1, 'Customer name is required'),
  date: z.string().datetime('Invalid date format'),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (HH:MM:SS)'),
  amount: z.number().nonnegative('Amount must be non-negative'),
  status: z.nativeEnum(OrderStatus),
  items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
  metadata: z.object({
    processedAt: z.string().datetime().optional(),
    processedBy: z.string().optional(),
    printedStickers: z.array(z.object({
      type: z.string(),
      quantity: z.number().int().positive(),
      printedAt: z.string().datetime(),
      successful: z.boolean(),
    })).optional(),
    notes: z.string().optional(),
  }).optional(),
});

export const OrderFiltersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  customerId: z.number().int().positive().optional(),
  documentType: z.number().int().nonnegative().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  items: z.array(z.object({
    id: z.string(),
    available: z.boolean(),
  })).optional(),
  notes: z.string().optional(),
});

export type OrderInput = z.infer<typeof OrderSchema>;
export type OrderItemInput = z.infer<typeof OrderItemSchema>;
export type OrderFiltersInput = z.infer<typeof OrderFiltersSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;