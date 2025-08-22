import { Request, Response } from 'express';
import { IRivhitService, ServiceDocumentFilters } from '../interfaces/IRivhitService';
import { RivhitDocument } from '@packing/shared';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Single Responsibility Principle - контроллер только обрабатывает HTTP запросы
export class OrdersController {
  constructor(private rivhitService: IRivhitService) {}

  // Получить список заказов
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate, documentType, limit, offset, page, pageSize } = req.query;

      // Поддерживаем как offset/limit, так и page/pageSize для совместимости
      let actualLimit: number;
      let actualOffset: number;
      let currentPage: number = 1;
      
      if (page && pageSize) {
        // Новый API с пагинацией
        currentPage = parseInt(page as string) || 1;
        actualLimit = this.getSafeLimit(pageSize as string);
        actualOffset = (currentPage - 1) * actualLimit;
      } else {
        // Старый API с offset/limit
        actualLimit = this.getSafeLimit(limit as string);
        actualOffset = parseInt((offset as string) || '0') || 0;
        currentPage = Math.floor(actualOffset / actualLimit) + 1;
      }

      // Создаем безопасные фильтры по умолчанию
      const params: ServiceDocumentFilters = {
        // Ограничиваем до последних 30 дней по умолчанию
        date_from: fromDate as string || this.getDefaultFromDate(),
        // Ограничиваем количество результатов
        limit: actualLimit,
        offset: actualOffset
      };
      
      if (toDate) {
        this.validateDateParam(toDate as string, 'toDate');
        params.date_to = toDate as string;
      }
      
      if (documentType) {
        this.validateNumericParam(documentType as string, 'documentType');
        params.document_type = parseInt(documentType as string);
      }

      console.log('🔍 Orders request with pagination:', {
        page: currentPage,
        pageSize: actualLimit,
        offset: actualOffset,
        date_from: params.date_from,
        document_type: params.document_type
      });

      // Получаем все документы (RIVHIT API не поддерживает пагинацию)
      const paramsWithoutPagination = { ...params };
      delete paramsWithoutPagination.limit;
      delete paramsWithoutPagination.offset;
      
      const allOrders = await this.rivhitService.getDocuments(paramsWithoutPagination);
      
      // Реализуем пагинацию на стороне backend
      const totalCount = allOrders.length;
      const startIndex = actualOffset;
      const endIndex = startIndex + actualLimit;
      const paginatedOrders = allOrders.slice(startIndex, endIndex);

      console.log(`📄 Backend pagination: page ${currentPage}, size ${actualLimit}, total ${totalCount}, slice [${startIndex}:${endIndex}], returning ${paginatedOrders.length} orders`);

      // Формируем ответ с пагинацией
      if (page && pageSize) {
        // Новый формат с пагинацией
        const paginatedResponse = {
          data: paginatedOrders,
          pagination: {
            page: currentPage,
            pageSize: actualLimit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / actualLimit)
          }
        };
        res.status(200).json(paginatedResponse);
      } else {
        // Старый формат для совместимости
        const response: ApiResponse<RivhitDocument[]> = {
          success: true,
          data: paginatedOrders,
          message: 'Orders retrieved successfully'
        };
        res.status(200).json(response);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve orders');
    }
  }

  // Получить заказ по ID
  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      this.validateNumericParam(id, 'order ID');
      const orderId = parseInt(id);

      // Получаем документы за последние 30 дней и фильтруем по номеру
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      
      const allOrders = await this.rivhitService.getDocuments({
        date_from: fromDate.toISOString().split('T')[0]
      });
      
      // Фильтруем по номеру документа
      const orders = allOrders.filter(order => order.document_number === orderId);

      if (orders.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Order not found',
          message: `Order with ID ${id} not found`
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<RivhitDocument> = {
        success: true,
        data: orders[0],
        message: 'Order retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve order');
    }
  }

  // Получить товары заказа
  async getOrderItems(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    
    try {
      const { id } = req.params;
      
      const validationStart = Date.now();
      this.validateNumericParam(id, 'order ID');
      const orderId = parseInt(id);
      timings.validation = Date.now() - validationStart;

      console.log(`📦 Getting order items for order ${orderId}`);
      console.log(`⏱️ [Order ${orderId}] Starting items fetch...`);

      // Используем тип документа 7 - он всегда содержит товары заказа
      const PACKING_LIST_TYPE = 7;
      
      try {
        const apiCallStart = Date.now();
        const documentDetails = await this.rivhitService.getDocumentDetails(PACKING_LIST_TYPE, orderId);
        timings.apiCall = Date.now() - apiCallStart;
        
        console.log(`⏱️ [Order ${orderId}] API call completed in ${timings.apiCall}ms`);
        
        // Извлекаем товары из ответа (RIVHIT возвращает items в data.items)
        const processingStart = Date.now();
        const allItems = documentDetails?.data?.items || [];
        
        // Фильтруем товары с нулевой или отсутствующей ценой
        const items = allItems.filter((item: any) => {
          // Проверяем что у товара есть цена больше 0
          const hasPrice = item.price_nis > 0 || item.price_mtc > 0;
          return hasPrice;
        }).map((item: any, index: number) => {
          // Ensure each item has a unique line_id (use 'line' field from API or generate one)
          return {
            ...item,
            line_id: item.line || `L${index + 1}`, // Use API line number or generate one
            unique_id: `${orderId}_${item.line || index + 1}` // Combination of order and line
          };
        });
        timings.dataProcessing = Date.now() - processingStart;
        
        const totalTime = Date.now() - startTime;
        
        console.log(`✅ Found ${allItems.length} total items, ${items.length} with valid prices for order ${orderId}`);
        console.log(`⏱️ [Order ${orderId}] Total time breakdown:`);
        console.log(`   - Validation: ${timings.validation}ms`);
        console.log(`   - API Call: ${timings.apiCall}ms`);
        console.log(`   - Data Processing: ${timings.dataProcessing}ms`);
        console.log(`   - TOTAL: ${totalTime}ms`);

        const response: ApiResponse<any[]> = {
          success: true,
          data: items,
          message: 'Order items retrieved successfully'
        };

        res.status(200).json(response);
      } catch (error: any) {
        const errorTime = Date.now() - startTime;
        console.error(`⏱️ [Order ${orderId}] Failed after ${errorTime}ms - ${error.message}`);
        
        // Если документ не найден, возвращаем 404
        if (error.message && error.message.includes('לא נמצאו נתונים')) {
          const response: ApiResponse<null> = {
            success: false,
            error: 'Order not found',
            message: `Order with ID ${id} not found`
          };
          res.status(404).json(response);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`⏱️ Request failed after ${totalTime}ms`);
      this.handleError(res, error, 'Failed to retrieve order items');
    }
  }

  // Получить информацию о клиенте заказа
  async getOrderCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      this.validateNumericParam(id, 'customer ID');
      const customerId = parseInt(id);

      const customer = await this.rivhitService.getCustomer(customerId);

      const response: ApiResponse<any> = {
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve customer');
    }
  }

  // Обновить статус заказа
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, packingData } = req.body;

      // Валидация параметров
      this.validateNumericParam(id, 'order ID');
      const orderId = parseInt(id);

      if (!status) {
        throw new Error('Status is required');
      }
      
      if (typeof status !== 'string') {
        throw new Error('Status must be a string');
      }

      // Валидация данных упаковки если они переданы
      if (packingData) {
        this.validatePackingData(packingData);
      }

      // Обновляем статус в RIVHIT API
      const success = await this.rivhitService.updateOrderStatus(
        orderId, 
        status, 
        packingData
      );

      const response: ApiResponse<{ updated: boolean }> = {
        success: success,
        data: { updated: success },
        message: success 
          ? 'Order status updated successfully' 
          : 'Order status update initiated, may be pending sync'
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to update order status');
    }
  }

  // Синхронизация pending обновлений статусов
  async syncPendingUpdates(req: Request, res: Response): Promise<void> {
    try {
      await this.rivhitService.syncPendingOrderUpdates();

      const response: ApiResponse<{ synced: boolean }> = {
        success: true,
        data: { synced: true },
        message: 'Pending order updates synchronized successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to sync pending updates');
    }
  }

  // Получение безопасной даты "от" (30 дней назад)
  private getDefaultFromDate(): string {
    const dateFilter = process.env.RIVHIT_DATE_FILTER || 'last_30_days';
    const daysBack = dateFilter === 'last_7_days' ? 7 : 
                     dateFilter === 'last_14_days' ? 14 : 30;
    
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Получение безопасного лимита результатов
  private getSafeLimit(limitParam?: string): number {
    const defaultLimit = parseInt(process.env.RIVHIT_DEFAULT_LIMIT || '200');
    const maxLimit = parseInt(process.env.RIVHIT_MAX_LIMIT || '200');
    
    if (!limitParam) {
      return defaultLimit;
    }
    
    const requestedLimit = parseInt(limitParam);
    if (isNaN(requestedLimit) || requestedLimit <= 0) {
      return defaultLimit;
    }
    
    // Не позволяем превышать максимальный лимит
    return Math.min(requestedLimit, maxLimit);
  }

  // Валидация числовых параметров
  validateNumericParam(value: string, paramName: string): void {
    const num = parseInt(value);
    if (isNaN(num)) {
      throw new Error(`${paramName} must be a number`);
    }
  }

  // Валидация параметров даты
  validateDateParam(value: string, paramName: string): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`${paramName} must be a valid date`);
    }
  }

  // Валидация данных упаковки
  validatePackingData(packingData: any): void {
    if (!packingData || typeof packingData !== 'object') {
      throw new Error('Packing data must be an object');
    }

    // Валидация упакованных товаров
    if (packingData.packedItems && Array.isArray(packingData.packedItems)) {
      for (const item of packingData.packedItems) {
        if (!item.item_id || typeof item.item_id !== 'number') {
          throw new Error('Each packed item must have a valid numeric item_id');
        }
        if (typeof item.packed_quantity !== 'number' || item.packed_quantity < 0) {
          throw new Error('Each packed item must have a valid positive packed_quantity');
        }
      }
    }

    // Валидация заданий печати
    if (packingData.print_jobs && Array.isArray(packingData.print_jobs)) {
      for (const job of packingData.print_jobs) {
        if (!job.job_id || typeof job.job_id !== 'string') {
          throw new Error('Each print job must have a valid job_id');
        }
        if (!job.type || !['shipping', 'product'].includes(job.type)) {
          throw new Error('Each print job must have a valid type (shipping or product)');
        }
      }
    }
  }

  // Clear failed orders cache (admin endpoint)
  async clearFailedCache(req: Request, res: Response): Promise<void> {
    try {
      // Cast to SafeRivhitService to access the method
      const safeService = this.rivhitService as any;
      if (safeService.clearFailedCache) {
        safeService.clearFailedCache();
        const response: ApiResponse<{ cleared: boolean }> = {
          success: true,
          data: { cleared: true },
          message: 'Failed orders cache cleared successfully'
        };
        res.status(200).json(response);
      } else {
        throw new Error('Clear cache method not available');
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to clear cache');
    }
  }

  // Единообразная обработка ошибок
  private handleError(res: Response, error: any, defaultMessage: string): void {
    const errorMessage = error.message || '';
    const isValidationError = errorMessage.includes('must be') || 
                             errorMessage.includes('is required') ||
                             errorMessage.includes('valid');
    const statusCode = isValidationError ? 400 : 500;
    
    // Debug logging for validation errors
    console.log('🔍 handleError debug:', {
      errorMessage,
      isValidationError,
      statusCode,
      defaultMessage
    });
    
    const response: ApiResponse<null> = {
      success: false,
      error: defaultMessage,
      message: error.message || defaultMessage
    };

    res.status(statusCode).json(response);
  }
}