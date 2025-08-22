import { RivhitDocument, RivhitItem, DocumentType, DocumentStatus } from '@packing/shared';

// Service-level filter interfaces (api_token is handled internally)
export interface ServiceDocumentFilters {
  document_type?: DocumentType;
  customer_id?: number;
  agent_id?: number;
  date_from?: string;
  date_to?: string;
  status?: DocumentStatus;
  search_text?: string;
  limit?: number;
  offset?: number;
}

export interface ServiceItemFilters {
  item_group_id?: number;
  storage_id?: number;
  search_text?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ServiceCustomerFilters {
  customer_type?: number;
  city?: string;
  search_text?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface IRivhitService {
  /**
   * Получить список документов из RIVHIT API
   * @param params - Параметры фильтрации
   * @returns Promise<RivhitDocument[]>
   */
  getDocuments(filters?: ServiceDocumentFilters): Promise<RivhitDocument[]>;

  /**
   * Получить список товаров из RIVHIT API
   * @param filters - Параметры фильтрации
   * @returns Promise<RivhitItem[]>
   */
  getItems(filters?: ServiceItemFilters): Promise<RivhitItem[]>;

  /**
   * Получить информацию о клиенте
   * @param customerId - ID клиента
   * @returns Promise<any>
   */
  getCustomer(customerId: number): Promise<any>;

  /**
   * Получить список клиентов
   * @param filters - Параметры фильтрации
   * @returns Promise<any[]>
   */
  getCustomers(filters?: ServiceCustomerFilters): Promise<any[]>;

  /**
   * Обновить статус заказа
   * @param documentId - ID документа/заказа
   * @param status - Новый статус заказа
   * @param packingData - Данные об упаковке
   * @returns Promise<boolean>
   */
  updateOrderStatus(
    documentId: number, 
    status: string, 
    packingData?: {
      packedItems: Array<{
        item_id: number;
        packed_quantity: number;
        notes?: string;
        reason?: string;
      }>;
      packer?: string;
      packaging_date?: string;
      print_jobs?: Array<{
        job_id: string;
        type: 'shipping' | 'product';
        timestamp: string;
      }>;
    }
  ): Promise<boolean>;

  /**
   * Синхронизировать отложенные обновления заказов
   * @returns Promise<boolean>
   */
  syncPendingOrderUpdates(): Promise<boolean>;

  /**
   * Получить полные детали документа включая товары
   * @param documentType - Тип документа
   * @param documentNumber - Номер документа
   * @returns Promise<any>
   */
  getDocumentDetails(documentType: number, documentNumber: number): Promise<any>;
}