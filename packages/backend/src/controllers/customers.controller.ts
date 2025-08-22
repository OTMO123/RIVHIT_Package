import { Request, Response } from 'express';
import { IRivhitService, ServiceCustomerFilters } from '../interfaces/IRivhitService';

export class CustomersController {
  constructor(private rivhitService: IRivhitService) {}

  async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { search_text, city, customer_type, limit, offset } = req.query;
      
      const filters: ServiceCustomerFilters = {
        limit: this.getSafeLimit(limit as string),
        offset: parseInt((offset as string) || '0') || 0
      };
      
      if (search_text) filters.search_text = search_text as string;
      if (city) filters.city = city as string;
      if (customer_type) filters.customer_type = parseInt(customer_type as string);
      
      console.log('🔍 Customers request with safe filters:', {
        limit: filters.limit,
        offset: filters.offset,
        search_text: filters.search_text
      });
      
      const customers = await this.rivhitService.getCustomers(filters);
      
      res.status(200).json({
        success: true,
        data: customers,
        message: 'Customers retrieved successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve customers');
    }
  }

  async getCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id);
      
      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID',
          message: 'Customer ID must be a number'
        });
        return;
      }
      
      const customer = await this.rivhitService.getCustomer(customerId);
      
      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
          message: `Customer with ID ${req.params.id} not found`
        });
      } else {
        this.handleError(res, error, 'Failed to retrieve customer');
      }
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
    console.error('🔍 Customer controller error:', {
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