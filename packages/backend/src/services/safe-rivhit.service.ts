import axios, { AxiosInstance } from 'axios';
import { IRivhitService } from '../interfaces/IRivhitService';
import { ICacheService } from '../interfaces/ICacheService';
import { 
  RivhitDocument, 
  RivhitItem, 
  RivhitCustomer, 
  RivhitApiResponse, 
  RivhitErrorCodes,
  DocumentFilters,
  ItemFilters,
  CustomerFilters
} from '@packing/shared';

// Safe API client - ТОЛЬКО операции чтения
export class SafeRivhitService {
  private client: AxiosInstance;
  private failedOrdersCache: Map<string, { timestamp: number; error: string }> = new Map();
  private readonly FAILED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  private readonly SAFE_METHODS = [
    'Document.List',
    'Document.Get', 
    'Document.Details',
    'Item.List',
    'Item.Get',
    'Customer.List',
    'Customer.Get',
    'Storage.List',
    'Agent.List'
  ] as const;

  constructor(
    private config: {
      baseUrl: string;
      apiToken: string;
      timeout: number;
      retryAttempts: number;
      testMode: boolean; // Флаг тестового режима
    },
    private cacheService: ICacheService,
    private logger?: any
  ) {
    // Log the actual timeout being used
    console.log(`🕐 SafeRivhitService initialized with timeout: ${config.timeout}ms`);
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'PackingSystem-SafeClient/1.0.0'
      }
    });

    // Добавляем interceptor для безопасности
    this.setupSafetyInterceptors();
  }

  private setupSafetyInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      // Логируем все запросы
      this.log('API Request', {
        method: config.data?.method,
        url: config.url,
        params: config.data,
        testMode: this.config.testMode
      });

      // Проверяем что используем только безопасные методы
      const method = config.data?.method;
      if (method && !this.SAFE_METHODS.includes(method)) {
        throw new Error(`❌ DANGEROUS METHOD BLOCKED: ${method}`);
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.log('API Response', {
          status: response.status,
          dataLength: response.data?.data?.length || 0,
          errorCode: response.data?.error_code
        });
        return response;
      },
      (error) => {
        this.log('API Error', {
          message: error.message,
          status: error.response?.status
        });
        throw error;
      }
    );
  }

  // Безопасный запрос с дополнительными проверками
  private async safeRequest<T>(
    method: string, 
    params: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    
    // Двойная проверка безопасности
    if (!this.SAFE_METHODS.includes(method as any)) {
      throw new Error(`🚫 Method ${method} is not allowed in safe mode`);
    }

    const cacheKey = `safe_${method}:${JSON.stringify(params)}`;
    
    // Проверяем кэш
    const cacheCheckStart = Date.now();
    const cached = await this.cacheService.get<T>(cacheKey);
    timings.cacheCheck = Date.now() - cacheCheckStart;
    
    if (cached) {
      this.log('Cache Hit', { 
        method, 
        cacheKey,
        timings: { cacheCheck: timings.cacheCheck },
        totalTime: Date.now() - startTime
      });
      return cached;
    }

    try {
      const requestData = {
        api_token: this.config.apiToken,
        ...params
      };

      // В тестовом режиме добавляем дополнительные параметры
      if (this.config.testMode) {
        (requestData as any)._test_mode = true;
        (requestData as any)._read_only = true;
      }

      // Используем специальный endpoint для каждого метода
      const endpoint = `/${method}`;
      
      console.log(`⏱️ [${method}] Starting API call to RIVHIT...`);
      const apiCallStart = Date.now();
      
      const response = await this.client.post<RivhitApiResponse<T>>(endpoint, requestData);
      timings.apiCall = Date.now() - apiCallStart;
      
      console.log(`⏱️ [${method}] API call completed in ${timings.apiCall}ms`);
      
      const result = response.data;

      if (result.error_code !== RivhitErrorCodes.SUCCESS) {
        throw new Error(`RIVHIT API Error: ${result.client_message || result.debug_message}`);
      }

      // Кэшируем результат
      const cacheSetStart = Date.now();
      await this.cacheService.set(cacheKey, result.data, 300); // 5 минут
      timings.cacheSet = Date.now() - cacheSetStart;
      
      const totalTime = Date.now() - startTime;
      
      this.log('API Success', { 
        method, 
        dataCount: Array.isArray(result.data) ? result.data.length : 1,
        timings: {
          cacheCheck: `${timings.cacheCheck}ms`,
          apiCall: `${timings.apiCall}ms`,
          cacheSet: `${timings.cacheSet}ms`,
          total: `${totalTime}ms`
        }
      });

      console.log(`⏱️ [${method}] Total request time: ${totalTime}ms (API: ${timings.apiCall}ms, Cache: ${timings.cacheCheck + timings.cacheSet}ms)`);

      return result.data;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`⏱️ [${method}] Request failed after ${totalTime}ms`);
      this.log('API Error', { 
        method, 
        error: error.message,
        totalTime: `${totalTime}ms`,
        timings
      });
      throw error;
    }
  }

  // Реализация IRivhitService с ограничениями
  async getDocuments(filters?: DocumentFilters): Promise<RivhitDocument[]> {
    this.log('Getting documents', { filters, testMode: this.config.testMode });
    
    const params: any = {};
    
    // RIVHIT API использует from_document_type/to_document_type
    if (filters?.document_type) {
      params.from_document_type = filters.document_type;
      params.to_document_type = filters.document_type;
    }
    if (filters?.customer_id) {
      params.from_customer_id = filters.customer_id;
      params.to_customer_id = filters.customer_id;
    }
    if (filters?.agent_id) {
      params.from_agent_id = filters.agent_id;
      params.to_agent_id = filters.agent_id;
    }
    
    // Конвертируем даты из YYYY-MM-DD в DD/MM/YYYY формат для RIVHIT API
    if (filters?.date_from) {
      const date = new Date(filters.date_from);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      params.from_date = `${day}/${month}/${year}`;
    }
    if (filters?.date_to) {
      const date = new Date(filters.date_to);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      params.to_date = `${day}/${month}/${year}`;
    }
    
    // RIVHIT API не использует limit/offset, только диапазоны дат

    const response = await this.safeRequest<any>('Document.List', params);
    
    // RIVHIT API возвращает объект с document_list внутри data
    if (response && response.document_list) {
      return response.document_list;
    }
    
    // Если нет document_list, возвращаем пустой массив
    this.log('No document_list in response', { response });
    return [];
  }

  async getDocumentById(documentId: number): Promise<RivhitDocument | null> {
    this.log('Getting document by ID', { documentId });
    
    try {
      const result = await this.safeRequest<RivhitDocument>('Document.Get', {
        document_id: documentId
      });
      return result;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async getItems(filters?: ItemFilters): Promise<RivhitItem[]> {
    this.log('Getting items', { filters });
    
    const params: any = {};
    
    if (filters?.item_group_id) params.item_group_id = filters.item_group_id;
    if (filters?.storage_id) params.storage_id = filters.storage_id;
    if (filters?.search_text) params.search_text = filters.search_text;
    if (filters?.active_only) params.active_only = filters.active_only;
    if (filters?.limit) params.limit = Math.min(filters.limit, 100); // Лимит безопасности
    if (filters?.offset) params.offset = filters.offset;

    return this.safeRequest<RivhitItem[]>('Item.List', params);
  }

  async getCustomer(customerId: number): Promise<RivhitCustomer> {
    this.log('Getting customer', { customerId });
    
    return this.safeRequest<RivhitCustomer>('Customer.Get', {
      customer_id: customerId
    });
  }

  async getCustomers(filters?: CustomerFilters): Promise<RivhitCustomer[]> {
    this.log('Getting customers', { filters });
    
    const params: any = {};
    
    if (filters?.customer_type) params.customer_type = filters.customer_type;
    if (filters?.city) params.city = filters.city;
    if (filters?.search_text) params.search_text = filters.search_text;
    if (filters?.active_only) params.active_only = filters.active_only;
    if (filters?.limit) params.limit = Math.min(filters.limit, 50); // Лимит безопасности
    if (filters?.offset) params.offset = filters.offset;

    return this.safeRequest<RivhitCustomer[]>('Customer.List', params);
  }

  // Недостающие методы из IRivhitService
  async updateOrderStatus(documentId: number, status: string, packingData?: any): Promise<boolean> {
    // Safe-режим: запись операции запрещена
    this.log('updateOrderStatus called in safe mode - operation blocked', { documentId, status });
    return Promise.resolve(false);
  }

  async syncPendingOrderUpdates(): Promise<boolean> {
    // Safe-режим: синхронизация записи запрещена
    this.log('syncPendingOrderUpdates called in safe mode - operation blocked');
    return Promise.resolve(false);
  }

  // Получить полные детали документа включая товары - with adaptive timeout
  async getDocumentDetails(documentType: number, documentNumber: number): Promise<any> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    
    this.log('Getting document details', { documentType, documentNumber });
    console.log(`⏱️ [Document.Details ${documentNumber}] Starting request...`);
    
    // Check failed orders cache first
    const failedKey = `${documentType}_${documentNumber}`;
    const failedEntry = this.failedOrdersCache.get(failedKey);
    if (failedEntry && (Date.now() - failedEntry.timestamp < this.FAILED_CACHE_TTL)) {
      console.log(`⚠️ [Document.Details ${documentNumber}] Skipping - known problematic order (failed ${Math.round((Date.now() - failedEntry.timestamp) / 1000)}s ago)`);
      throw new Error(`Order ${documentNumber} is known to be problematic: ${failedEntry.error}`);
    }
    
    const cacheKey = `document_details_${documentType}_${documentNumber}`;
    
    const cacheCheckStart = Date.now();
    const cached = await this.cacheService.get(cacheKey);
    timings.cacheCheck = Date.now() - cacheCheckStart;
    
    if (cached) {
      const totalTime = Date.now() - startTime;
      this.log('Document details cache hit', { documentType, documentNumber });
      console.log(`⏱️ [Document.Details ${documentNumber}] Cache hit! Total time: ${totalTime}ms (cache check: ${timings.cacheCheck}ms)`);
      return cached;
    }
    
    try {
      console.log(`⏱️ [Document.Details ${documentNumber}] No cache, calling RIVHIT API...`);
      const apiCallStart = Date.now();
      
      // Create a promise that will race between the API call and a timeout
      const apiCallPromise = this.client.post<RivhitApiResponse<any>>('/Document.Details', {
        api_token: this.config.apiToken,
        document_type: documentType,
        document_number: documentNumber
      });
      
      // Create a timeout promise with a controller to cancel it
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after 5 seconds - likely non-existent or problematic order`));
        }, 5000);
      });
      
      let response;
      try {
        // Race between API call and timeout
        response = await Promise.race([apiCallPromise, timeoutPromise]);
        // Clear the timeout if API call succeeded
        clearTimeout(timeoutId!);
      } catch (raceError: any) {
        // Clear the timeout in case of error too
        clearTimeout(timeoutId!);
        
        if (raceError.message.includes('timeout after 5 seconds')) {
          console.log(`⚠️ [Document.Details ${documentNumber}] Quick check timed out after 5s, marking as problematic`);
          
          // Cache this as a failed order
          this.failedOrdersCache.set(failedKey, {
            timestamp: Date.now(),
            error: 'Timeout - likely non-existent or problematic order'
          });
          
          throw new Error(`Order ${documentNumber} appears to be non-existent or problematic (timeout after 5s)`);
        }
        throw raceError;
      }
      
      timings.apiCall = Date.now() - apiCallStart;
      console.log(`⏱️ [Document.Details ${documentNumber}] API response received in ${timings.apiCall}ms`);

      if (response.data.error_code !== 0) {
        // Cache as failed if error
        this.failedOrdersCache.set(failedKey, {
          timestamp: Date.now(),
          error: response.data.client_message || response.data.debug_message || 'API error'
        });
        throw new Error(response.data.client_message || response.data.debug_message || 'Document.Details failed');
      }

      // Clear from failed cache if it was there
      this.failedOrdersCache.delete(failedKey);

      // Кэшируем весь ответ на 15 минут
      const cacheSetStart = Date.now();
      await this.cacheService.set(cacheKey, response.data, 15 * 60 * 1000);
      timings.cacheSet = Date.now() - cacheSetStart;
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ [Document.Details ${documentNumber}] Success! Total time breakdown:`);
      console.log(`   - Cache check: ${timings.cacheCheck}ms`);
      console.log(`   - API call: ${timings.apiCall}ms`);
      console.log(`   - Cache set: ${timings.cacheSet}ms`);
      console.log(`   - TOTAL: ${totalTime}ms`);
      
      return response.data;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`⏱️ [Document.Details ${documentNumber}] Failed after ${totalTime}ms - ${error.message}`);
      this.log('Document.Details error', { documentType, documentNumber, error: error.message, totalTime });
      throw error;
    }
  }

  // Дополнительные безопасные методы
  async testConnection(): Promise<boolean> {
    try {
      // Пробуем получить минимальные данные
      await this.safeRequest('Document.List', { limit: 1 });
      return true;
    } catch (error: any) {
      this.log('Connection test failed', { error: error.message });
      return false;
    }
  }

  async getApiInfo(): Promise<any> {
    this.log('Getting API info');
    return {
      testMode: this.config.testMode,
      allowedMethods: this.SAFE_METHODS,
      baseUrl: this.config.baseUrl,
      timestamp: new Date().toISOString()
    };
  }

  // Логирование с защитой от утечки токена
  private log(action: string, data?: any): void {
    const sanitizedData = { ...data };
    
    // Удаляем чувствительную информацию
    if (sanitizedData.api_token) {
      sanitizedData.api_token = '***hidden***';
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      data: sanitizedData,
      service: 'SafeRivhitService'
    };

    if (this.logger) {
      this.logger.info(logEntry);
    } else {
      console.log('🔒 SafeRivhit:', logEntry);
    }
  }

  // Clear failed orders cache
  clearFailedCache(): void {
    const size = this.failedOrdersCache.size;
    this.failedOrdersCache.clear();
    console.log(`🗑️ Cleared failed orders cache (removed ${size} entries)`);
  }

  // Получить статистику использования
  getUsageStats(): any {
    return {
      // TODO: Добавить счетчики запросов
      totalRequests: 0,
      cacheHits: 0,
      errors: 0,
      lastRequest: null,
      failedOrdersInCache: this.failedOrdersCache.size
    };
  }
}