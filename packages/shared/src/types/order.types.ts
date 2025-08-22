export interface Order {
  id: string;
  documentNumber: number;
  documentType: number;
  customerId: number;
  customerName: string;
  date: string;
  time: string;
  amount: number;
  status: OrderStatus;
  items: OrderItem[];
  metadata?: OrderMetadata;
}

export interface OrderItem {
  id: string;
  itemId: number;
  name: string;
  nameHebrew: string;
  catalogNumber?: string;
  quantity: number;
  price: number;
  available: boolean;
  stickerType: string;
  printed: boolean;
}

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

export interface OrderMetadata {
  processedAt?: string;
  processedBy?: string;
  printedStickers?: PrintedSticker[];
  notes?: string;
}

export interface PrintedSticker {
  type: string;
  quantity: number;
  printedAt: string;
  successful: boolean;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
  documentType?: number;
}

export interface OrderUpdateData {
  documentId: number;
  status: string;
  packingData: any;
  retryCount?: number;
}

export interface PackingBox {
  boxId: string;
  boxNumber: number;
  orderId: string | number;
  items: PackingBoxItem[];
  totalWeight?: number;
  isFull: boolean;
  isPrinted: boolean;
  printedAt?: string;
}

export interface PackingBoxItem {
  itemId: string | number;
  name: string;
  nameHebrew?: string;
  nameRussian?: string;
  quantity: number;
  catalogNumber?: string;
  barcode?: string;
  weight?: number;
}

export interface BoxAssignment {
  orderId: string | number;
  boxes: PackingBox[];
  totalBoxes: number;
  assignedAt: string;
  assignedBy?: string;
}

export enum DeliveryRegion {
  SOUTH1 = 'south1',
  SOUTH2 = 'south2',
  NORTH1 = 'north1',
  NORTH2 = 'north2'
}

export interface DeliveryRegionInfo {
  id: DeliveryRegion;
  nameHebrew: string;
  nameRussian: string;
  nameEnglish: string;
  color: string;
}