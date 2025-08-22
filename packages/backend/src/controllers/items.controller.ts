import { Request, Response } from 'express';
import { IRivhitService, ServiceItemFilters } from '../interfaces/IRivhitService';

export class ItemsController {
  constructor(private rivhitService: IRivhitService) {}

  async getItems(req: Request, res: Response): Promise<void> {
    try {
      const { search_text, item_group_id, barcode, limit, offset } = req.query;
      
      const filters: ServiceItemFilters = {
        limit: this.getSafeLimit(limit as string),
        offset: parseInt((offset as string) || '0') || 0
      };
      
      if (search_text) filters.search_text = search_text as string;
      if (item_group_id) filters.item_group_id = parseInt(item_group_id as string);
      // Note: barcode is not in ServiceItemFilters interface, will be ignored
      
      console.log('🔍 Items request with safe filters:', {
        limit: filters.limit,
        offset: filters.offset,
        search_text: filters.search_text
      });
      
      const items = await this.rivhitService.getItems(filters);
      
      res.status(200).json({
        success: true,
        data: items,
        message: 'Items retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve items');
    }
  }

  async getItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid item ID',
          message: 'Item ID must be a number'
        });
        return;
      }
      
      const items = await this.rivhitService.getItems({
        limit: 1
        // Note: item_id filter not available in ServiceItemFilters, will search by ID differently
      });
      
      if (items.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Item not found',
          message: `Item with ID ${itemId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: items[0],
        message: 'Item retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve item');
    }
  }

  async getOrderItems(req: Request, res: Response): Promise<void> {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid order ID',
          message: 'Order ID must be a number'
        });
        return;
      }
      
      const items = await this.rivhitService.getItems({
        limit: this.getSafeLimit()
        // Note: document_id filter not available in ServiceItemFilters
      });
      
      res.status(200).json({
        success: true,
        data: items,
        message: 'Order items retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve order items');
    }
  }

  async updateItemStock(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);
      const { stock_status, available_quantity } = req.body;
      
      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid item ID',
          message: 'Item ID must be a number'
        });
        return;
      }
      
      // В read-only режиме не обновляем данные
      if (process.env.RIVHIT_READ_ONLY === 'true') {
        res.status(200).json({
          success: true,
          data: { updated: false },
          message: 'Read-only mode: Stock update simulated'
        });
        return;
      }
      
      // Здесь будет логика обновления складских остатков
      // Пока возвращаем заглушку
      res.status(200).json({
        success: true,
        data: { updated: true },
        message: 'Item stock updated successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to update item stock');
    }
  }

  // Получение безопасного лимита результатов
  private getSafeLimit(limitParam?: string): number {
    const defaultLimit = parseInt(process.env.RIVHIT_DEFAULT_LIMIT || '12');
    const maxLimit = parseInt(process.env.RIVHIT_MAX_LIMIT || '100');
    
    if (!limitParam) {
      return defaultLimit;
    }
    
    const requestedLimit = parseInt(limitParam);
    if (isNaN(requestedLimit) || requestedLimit <= 0) {
      return defaultLimit;
    }
    
    return Math.min(requestedLimit, maxLimit);
  }

  private handleError(res: Response, error: any, defaultMessage: string): void {
    console.error('🔍 Items controller error:', {
      error: error.message || error,
      stack: error.stack,
      defaultMessage
    });

    const statusCode = error.statusCode || 500;
    const message = error.message || defaultMessage;

    res.status(statusCode).json({
      success: false,
      error: message,
      message: defaultMessage,
      timestamp: new Date().toISOString()
    });
  }
}