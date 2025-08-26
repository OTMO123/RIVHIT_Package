interface RivhitDocument {
  document_type: number;
  document_number?: number;
  issue_date: string;
  due_date?: string;
  currency_id: number;
  discount_type?: number;
  discount_value?: number;
  comments?: string;
  project_id?: number;
  agent_id?: number;
  customer_id: number;
  total_amount?: number;
  vat_amount?: number;
  status?: number;
  created_date?: string;
  updated_date?: string;
}

interface RivhitItem {
  item_id: number;
  item_name: string;
  item_extended_description: string;
  item_part_num: string | null;
  barcode: string | null;
  item_group_id: number;
  storage_id: number;
  quantity: number;
  cost_nis: number;
  sale_nis: number;
  currency_id: number;
  cost_mtc: number;
  sale_mtc: number;
  picture_link: string | null;
  exempt_vat: boolean;
  location: string | null;
  is_serial: number;
  item_name_en: string | null;
  item_order: number;
}

interface RivhitCustomer {
  customer_id?: number;
  last_name: string;
  first_name: string;
  address: string;
  city: string;
  zipcode?: string;
  phone: string;
  email?: string;
  id_number?: string;
  customer_type?: number;
  company_name?: string;
  vat_id?: string;
  credit_limit?: number;
}

interface OrderFilters {
  fromDate?: string;
  toDate?: string;
  documentType?: number;
  customerId?: number;
  status?: number;
  searchText?: string;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCity?: string;
  customer_id?: number;  // Added customer_id from RIVHIT
  status: 'pending' | 'processing' | 'packed' | 'shipped';
  items: number;
  weight: number;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  totalAmount?: number;
  currency?: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

class CacheService<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 минут

  set(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

class ApiService {
  private ordersCache = new CacheService<PaginatedResponse<Order>>();
  private statsCache = new CacheService<any>();
  private async getOrdersFromElectron(): Promise<any[]> {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available');
        throw new Error('ElectronAPI not available');
      }
      
      const result = await window.electronAPI.orders.getAll();
      console.log('IPC result:', result);
      
      // Check if we got successful result with data
      if (result && result.success && result.data && Array.isArray(result.data)) {
        return result.data;
      }
      
      // If backend failed, throw error to show user
      if (result && !result.success) {
        throw new Error((result as any).error || 'Backend API error');
      }
      
      // If result.data is not an array, throw error
      console.error('Orders data is not an array:', result);
      throw new Error('Invalid data format from backend');
    } catch (error) {
      console.error('Failed to fetch orders via IPC:', error);
      throw error;
    }
  }

  private parseRivhitDate(dateStr: string | undefined): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // RIVHIT returns dates in DD/MM/YYYY format
    // We need to convert to YYYY-MM-DD for consistent handling
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Validate the date parts
      const d = parseInt(day);
      const m = parseInt(month);
      const y = parseInt(year);
      
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 2000) {
        // Return in ISO format YYYY-MM-DD
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // If parsing fails, return the original string
    return dateStr;
  }

  private async mapRivhitDocumentToOrder(doc: RivhitDocument, itemCount?: number): Promise<Order> {
    const statusMapping: Record<number, 'pending' | 'processing' | 'packed' | 'shipped'> = {
      0: 'pending',
      1: 'pending', 
      2: 'processing',
      3: 'processing',
      4: 'packed',
      5: 'packed',
      6: 'shipped',
      7: 'shipped',
      8: 'shipped'
    };

    // Get customer information - use the customer_name already provided in the document
    let customerName = (doc as any).customer_name || `Customer ${doc.customer_id}`;
    
    // Clean up customer name (remove extra spaces)
    if (customerName && typeof customerName === 'string') {
      customerName = customerName.trim();
    }

    // Calculate item count if not provided
    let calculatedItemCount = itemCount || 0;
    if (!itemCount) {
      try {
        if (window.electronAPI) {
          const itemsResult = await window.electronAPI.items?.getByOrderId?.(doc.document_number || 0);
          if (itemsResult && itemsResult.success && itemsResult.data) {
            calculatedItemCount = itemsResult.data.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch items:', error);
        // Use random number for demo
        calculatedItemCount = Math.floor(Math.random() * 20) + 1;
      }
    }

    // Determine priority based on due date and total amount
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (doc.due_date) {
      const dueDate = new Date(doc.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 1) priority = 'high';
      else if (daysUntilDue <= 3) priority = 'medium';
      else priority = 'low';
    }

    const amount = (doc as any).amount || doc.total_amount || 0;
    if (amount > 1000) {
      priority = priority === 'low' ? 'medium' : 'high';
    }

    return {
      id: doc.document_number?.toString() || `temp-${doc.customer_id}-${Date.now()}`,
      orderNumber: doc.document_number ? `${doc.document_number}` : `TEMP-${doc.customer_id}`,
      customerName,
      customer_id: doc.customer_id,  // Include customer_id from RIVHIT
      status: statusMapping[doc.status || 0] || 'pending',
      items: calculatedItemCount,
      weight: calculatedItemCount * 0.3, // Estimate weight based on items
      createdAt: this.parseRivhitDate((doc as any).document_date || doc.issue_date),
      priority,
      totalAmount: (doc as any).amount || doc.total_amount,
      currency: doc.currency_id === 1 ? 'NIS' : doc.currency_id === 2 ? 'USD' : 'EUR'
    };
  }

  async getOrdersPaginated(filters?: OrderFilters): Promise<PaginatedResponse<Order>> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    
    // Create cache key based on filters
    const cacheKey = JSON.stringify({ ...filters, page, pageSize });
    
    // Check cache first
    const cached = this.ordersCache.get(cacheKey);
    if (cached) {
      console.log(`📦 Using cached data for page ${page}`);
      return cached;
    }
    
    try {
      // Build query parameters for the backend API
      const queryParams = new URLSearchParams();
      
      if (filters?.fromDate) {
        queryParams.append('fromDate', filters.fromDate);
      }
      if (filters?.toDate) {
        queryParams.append('toDate', filters.toDate);
      }
      if (filters?.documentType) {
        queryParams.append('documentType', filters.documentType.toString());
      }
      
      // Add pagination parameters using the new page/pageSize format
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', pageSize.toString());
      
      console.log(`🔄 Loading page ${page} (${pageSize} items per page)`);
      
      // Make direct API call with pagination parameters - FORCE HTTP
      const url = `${API_BASE_URL}/orders?${queryParams.toString()}`.replace('https://', 'http://');
      console.log(`🌐 Making API call to: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle new pagination format from backend
      let orders: any[];
      let totalCount: number;
      let pageOrders: any[];
      
      if (result.pagination) {
        // New format: {data: [...], pagination: {page, pageSize, total, totalPages}}
        orders = result.data || [];
        totalCount = result.pagination.total || 0;
        pageOrders = orders; // Backend already returns the correct page size
      } else {
        // Old format: {success: true, data: [...]} - fallback for compatibility
        orders = result.data || [];
        totalCount = orders.length; // For old format, we don't know total
        pageOrders = orders.slice(0, pageSize);
      }
      
      // Process RIVHIT data format - calculate real item types count from server data
      const ordersWithDetails = await Promise.all(pageOrders.map(async (doc: any, index: number) => {
        // Get real count of item types with non-zero sum
        let itemTypesCount = 0;
        try {
          const url = `${API_BASE_URL}/orders/${doc.document_number}`.replace('https://', 'http://');
          const response = await fetch(url);
          if (response.ok) {
            const orderDetails = await response.json();
            // Handle RIVHIT API format: {error_code: 0, data: [...]}
            const items = orderDetails.data || [];
            if (Array.isArray(items)) {
              // Count only item types with non-zero total_line (sum)
              itemTypesCount = items.filter((item: any) => 
                parseFloat(item.total_line || 0) > 0
              ).length;
            }
          }
        } catch (error) {
          console.warn(`Failed to get items for order ${doc.document_number}:`, error);
          itemTypesCount = 1; // Fallback to minimum
        }

        return {
          id: doc.document_number?.toString() || `temp-${Date.now()}-${index}`,
          orderNumber: `${doc.document_number}`,
          customerName: doc.customer_name?.trim() || `Customer ${doc.customer_id}`,
          customer_id: doc.customer_id,  // Include customer_id from backend
          status: 'pending' as const, // Default status
          items: itemTypesCount,
          weight: itemTypesCount * 0.3, // Estimate based on item types
          createdAt: doc.document_date,
          priority: 'medium' as const,
          totalAmount: doc.amount,
          currency: 'NIS'
        };
      }));

      const paginatedResponse: PaginatedResponse<Order> = {
        data: ordersWithDetails,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
      
      // Cache the result for 5 minutes
      this.ordersCache.set(cacheKey, paginatedResponse);
      
      console.log(`✅ Loaded page ${page}: ${ordersWithDetails.length} orders (${totalCount} total)`);
      return paginatedResponse;
      
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  }

  // Keep old method for compatibility, but limit to 10 items
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    const result = await this.getOrdersPaginated({
      ...filters,
      page: 1,
      pageSize: 10
    });
    return result.data;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available');
        return null;
      }
      
      const result = await window.electronAPI.orders.getById(orderId);
      if (result.success && result.data) {
        return result.data.orderNumber ? result.data : this.mapRivhitDocumentToOrder(result.data);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }

  async updateOrderStatus(orderId: string, status: string, packingData?: any): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available');
        return false;
      }
      
      const result = await window.electronAPI.orders.updateStatus(orderId, status);
      return result.success;
    } catch (error) {
      console.error('Failed to update order status:', error);
      return false;
    }
  }

  private getFallbackOrders(): Order[] {
    // Fallback data when API is not available
    return [
      {
        id: '1',
        orderNumber: 'ORD-2025-001',
        customerName: 'משה כהן',
        status: 'pending',
        items: 5,
        weight: 2.5,
        createdAt: '2025-01-13',
        priority: 'high',
        totalAmount: 1250.00,
        currency: 'NIS'
      },
      {
        id: '2',
        orderNumber: 'ORD-2025-002',
        customerName: 'שרה לוי',
        status: 'processing',
        items: 3,
        weight: 1.8,
        createdAt: '2025-01-13',
        priority: 'medium',
        totalAmount: 850.00,
        currency: 'NIS'
      },
      {
        id: '3',
        orderNumber: 'ORD-2025-003',
        customerName: 'יוסף אברהם',
        status: 'packed',
        items: 8,
        weight: 4.2,
        createdAt: '2025-01-12',
        priority: 'low',
        totalAmount: 2100.00,
        currency: 'NIS'
      }
    ];
  }

  async checkHealth(): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available for health check');
        return false;
      }
      
      const result = await window.electronAPI.health();
      return result.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  // Max Per Box Settings methods - removed duplicate, see line 547

  async createMaxPerBoxSetting(data: { catalogNumber: string; maxQuantity: number; description?: string; rivhitId?: number }): Promise<any> {
    try {
      const response = await fetch('http://localhost:3001/api/settings/max-per-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating max per box setting:', error);
      throw error;
    }
  }

  async updateMaxPerBoxSetting(id: number, data: { maxQuantity?: number; description?: string; rivhitId?: number }): Promise<any> {
    try {
      const response = await fetch(`http://localhost:3001/api/settings/max-per-box/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update setting');
      return await response.json();
    } catch (error) {
      console.error('Error updating max per box setting:', error);
      throw error;
    }
  }

  async deleteMaxPerBoxSetting(id: number): Promise<any> {
    try {
      const response = await fetch(`http://localhost:3001/api/settings/max-per-box/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete setting');
      return await response.json();
    } catch (error) {
      console.error('Error deleting max per box setting:', error);
      throw error;
    }
  }

  async getMaxPerBoxSettings(): Promise<any[]> {
    try {
      const response = await fetch('http://localhost:3001/api/settings/max-per-box');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching max per box settings:', error);
      return [];
    }
  }

  async getMaxPerBoxByCatalog(catalogNumber: string): Promise<number | null> {
    console.log(`🔍 API: Fetching max capacity for catalog: ${catalogNumber}`);
    
    try {
      const url = `http://localhost:3001/api/settings/max-per-box/catalog/${catalogNumber}`;
      console.log(`📡 API Request: GET ${url}`);
      
      const response = await fetch(url);
      console.log(`📨 API Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.warn(`⚠️ API: No max capacity found for catalog ${catalogNumber} (HTTP ${response.status})`);
        return null;
      }
      
      const result = await response.json();
      console.log(`📦 API Response data:`, result);
      
      if (result.data?.maxQuantity) {
        console.log(`✅ API: Max capacity for ${catalogNumber} = ${result.data.maxQuantity} units`);
        return result.data.maxQuantity;
      } else {
        console.log(`ℹ️ API: No max capacity defined for ${catalogNumber}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ API Error fetching max per box for catalog ${catalogNumber}:`, error);
      return null;
    }
  }

  // Generic POST method for API calls
  async post(url: string, data: any): Promise<any> {
    try {
      console.log(`📤 POST request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ POST response:`, result);
      return result;
    } catch (error) {
      console.error(`❌ POST request failed:`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();