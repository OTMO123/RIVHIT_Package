import axios, { AxiosInstance } from 'axios';
import { IRivhitService } from '../interfaces/IRivhitService';
import { ICacheService } from '../interfaces/ICacheService';
import { 
  RivhitDocument, 
  RivhitItem, 
  RivhitCustomer, 
  RivhitApiResponse, 
  RivhitErrorCodes,
  RivhitItemListResponse,
  RivhitCustomerListResponse,
  RivhitDocumentListResponse,
  DocumentFilters,
  ItemFilters,
  CustomerFilters,
  OrderUpdateData
} from '@packing/shared';

interface RivhitServiceConfig {
  baseUrl: string;
  apiToken: string;
  timeout: number;
  retryAttempts: number;
  testMode?: boolean;
}

export class RivhitService implements IRivhitService {
  private client: AxiosInstance;
  private config: RivhitServiceConfig;

  constructor(
    config: RivhitServiceConfig,
    private cacheService: ICacheService
  ) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async getDocuments(filters?: DocumentFilters): Promise<RivhitDocument[]> {
    const cacheKey = `documents:${JSON.stringify(filters || {})}`;
    
    // Попытка получить из кэша
    const cached = await this.cacheService.get<RivhitDocument[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const requestParams = {
        api_token: this.config.apiToken,
        ...filters
      };
      
      const response = await this.makeRequest<RivhitDocumentListResponse>('/Document.List', requestParams);

      // Извлекаем documents из ответа
      const documents = response.document_list || [];
      
      // Кэшируем на 5 минут
      await this.cacheService.set(cacheKey, documents, 300);
      
      return documents;
    } catch (error) {
      throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getItems(filters?: ItemFilters): Promise<RivhitItem[]> {
    const groupId = filters?.item_group_id;
    const cacheKey = `items:${groupId || 'all'}`;
    
    // Попытка получить из кэша
    const cached = await this.cacheService.get<RivhitItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const requestParams = {
        api_token: this.config.apiToken,
        ...(filters || {}),
        item_group_id: groupId
      };
      
      const response = await this.makeRequest<RivhitItemListResponse>('/Item.List', requestParams);
      
      // Извлекаем items из ответа
      const items = response.item_list || [];

      // Кэшируем на 10 минут
      await this.cacheService.set(cacheKey, items, 600);
      
      return items;
    } catch (error) {
      throw new Error(`Failed to fetch items: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCustomers(filters?: CustomerFilters): Promise<RivhitCustomer[]> {
    const cacheKey = `customers:${JSON.stringify(filters || {})}`;
    
    // Попытка получить из кэша
    const cached = await this.cacheService.get<RivhitCustomer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const requestParams = {
        api_token: this.config.apiToken,
        ...filters
      };
      
      const response = await this.makeRequest<RivhitCustomerListResponse>('/Customer.List', requestParams);
      
      // Извлекаем customers из ответа
      const customers = response.customer_list || [];

      // Кэшируем на 30 минут
      await this.cacheService.set(cacheKey, customers, 1800);
      
      return customers;
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async getCustomer(customerId: number): Promise<RivhitCustomer | null> {
    try {
      const customers = await this.getCustomers({ 
        api_token: this.config.apiToken,
        search_text: customerId.toString()
      });
      
      // В реальном API нужно будет использовать Customer.Get если есть
      const customer = customers.find(c => c.customer_id === customerId);
      return customer || null;
    } catch (error) {
      throw new Error(`Failed to fetch customer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateOrderStatus(
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
  ): Promise<boolean> {
    try {
      // Очищаем кэш документов после обновления статуса
      const cachePattern = 'documents:*';
      await this.cacheService.delete(cachePattern);

      const requestParams = {
        api_token: this.config.apiToken,
        document_id: documentId,
        status: status,
        packing_data: packingData ? JSON.stringify(packingData) : undefined,
        updated_at: new Date().toISOString()
      };

      // Используем Document.Update endpoint или аналогичный
      const response = await this.makeRequest<{ success: boolean }>('/Document.Update', requestParams);
      
      return response.success || true;
    } catch (error) {
      console.error(`Failed to update order status for document ${documentId}:`, error);
      
      // В случае ошибки API, сохраняем данные локально для последующей синхронизации
      await this.saveOrderStatusLocally(documentId, status, packingData);
      
      throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Сохранение статуса заказа локально для последующей синхронизации
   */
  private async saveOrderStatusLocally(
    documentId: number, 
    status: string, 
    packingData?: any
  ): Promise<void> {
    try {
      const localKey = `pending_order_update:${documentId}`;
      const updateData = {
        documentId,
        status,
        packingData,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
      
      // Сохраняем локально на 24 часа для повторной попытки
      await this.cacheService.set(localKey, updateData, 86400);
      
      console.log(`Order status saved locally for document ${documentId}, will retry sync later`);
    } catch (localError) {
      console.error('Failed to save order status locally:', localError);
    }
  }

  /**
   * Синхронизация локально сохраненных обновлений статусов с RIVHIT API
   */
  async syncPendingOrderUpdates(): Promise<boolean> {
    try {
      // Получаем все pending обновления из кэша
      const pendingKeys = await this.cacheService.getKeys('pending_order_update:*');
      
      for (const key of pendingKeys) {
        try {
          const updateData = await this.cacheService.get<OrderUpdateData>(key);
          if (!updateData) continue;

          // Пытаемся синхронизировать с API
          await this.updateOrderStatus(
            updateData.documentId, 
            updateData.status, 
            updateData.packingData
          );

          // Если успешно, удаляем из pending
          await this.cacheService.delete(key);
          console.log(`Successfully synced order update for document ${updateData.documentId}`);
          
        } catch (syncError) {
          console.warn(`Failed to sync order update ${key}:`, syncError instanceof Error ? syncError.message : String(syncError));
          
          // Увеличиваем счетчик повторов и удаляем если превышен лимит
          const updateData = await this.cacheService.get<OrderUpdateData>(key);
          if (updateData) {
            updateData.retryCount = (updateData.retryCount || 0) + 1;
            
            if (updateData.retryCount >= 5) {
              await this.cacheService.delete(key);
              console.error(`Giving up on order update ${key} after 5 retries`);
            } else {
              await this.cacheService.set(key, updateData, 86400);
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to sync pending order updates:', error);
      return false;
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    data: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const url = `${this.client.defaults.baseURL}${endpoint}`;
        
        const response = await this.client.post<RivhitApiResponse<T>>(endpoint, data);
        const result = response.data;

        // Проверяем код ошибки RIVHIT
        if (result.error_code !== RivhitErrorCodes.SUCCESS) {
          throw new Error(result.client_message || result.debug_message);
        }

        return result.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === this.config.retryAttempts) {
          throw lastError;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  /**
   * Получить полные детали документа включая товары
   */
  async getDocumentDetails(documentType: number, documentNumber: number): Promise<any> {
    console.log(`Getting document details for type ${documentType}, number ${documentNumber}`);
    
    const cacheKey = `document_details_${documentType}_${documentNumber}`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      console.log('Document details found in cache');
      return cached;
    }
    
    const result = await this.makeRequest<any>('/Document.Details', {
      api_token: this.config.apiToken,
      document_type: documentType,
      document_number: documentNumber
    });
    
    // Кэшируем на 15 минут
    await this.cacheService.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}