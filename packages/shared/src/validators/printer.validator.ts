import { z } from 'zod';
import { PrintJobStatus } from '../types/printer.types';

export const StickerPrintRequestSchema = z.object({
  type: z.string().min(1, 'Sticker type is required'),
  template: z.string().min(1, 'Template is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  data: z.record(z.any()).optional(),
});

export const PrintJobSchema = z.object({
  id: z.string().min(1, 'Print job ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  stickers: z.array(StickerPrintRequestSchema).min(1, 'At least one sticker is required'),
  status: z.nativeEnum(PrintJobStatus),
  createdAt: z.string().datetime('Invalid created date'),
  completedAt: z.string().datetime('Invalid completed date').optional(),
  error: z.string().optional(),
});

export const PrintRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  stickers: z.array(StickerPrintRequestSchema).min(1, 'At least one sticker is required'),
});

export const PrinterStatusSchema = z.object({
  connected: z.boolean(),
  ready: z.boolean(),
  error: z.string().optional(),
  lastPrintJob: z.string().optional(),
  queueLength: z.number().int().nonnegative().optional(),
});

export const StickerTemplateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Template description is required'),
  zplCommand: z.string().min(1, 'ZPL command is required'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
});

export type StickerPrintRequestInput = z.infer<typeof StickerPrintRequestSchema>;
export type PrintJobInput = z.infer<typeof PrintJobSchema>;
export type PrintRequestInput = z.infer<typeof PrintRequestSchema>;
export type PrinterStatusInput = z.infer<typeof PrinterStatusSchema>;
export type StickerTemplateInput = z.infer<typeof StickerTemplateSchema>;