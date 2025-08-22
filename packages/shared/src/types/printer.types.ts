export interface PrintJob {
  id: string;
  orderId: string;
  stickers: StickerPrintRequest[];
  status: PrintJobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface StickerPrintRequest {
  type: string;
  template: string;
  quantity: number;
  data?: Record<string, any>;
}

export enum PrintJobStatus {
  QUEUED = 'queued',
  PRINTING = 'printing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PrinterStatus {
  connected: boolean;
  ready: boolean;
  error?: string;
  lastPrintJob?: string;
  queueLength?: number;
}

export interface StickerTemplate {
  id: string;
  name: string;
  description: string;
  zplCommand: string;
  width: number;
  height: number;
}

// PrinterConfig moved to config.types.ts to avoid duplication