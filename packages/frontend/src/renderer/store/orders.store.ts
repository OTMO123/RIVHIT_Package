import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { RivhitDocument, RivhitItem, RivhitCustomer } from '@packing/shared';
import { IPCService } from '../services/ipc.service';

// State interface
interface OrdersState {
  // Data
  orders: RivhitDocument[];
  selectedOrder: RivhitDocument | null;
  orderItems: RivhitItem[];
  orderCustomer: RivhitCustomer | null;
  
  // UI State
  loading: {
    orders: boolean;
    selectedOrder: boolean;
    items: boolean;
    customer: boolean;
  };
  
  // Filters
  filters: {
    searchText: string;
    documentType?: number;
    dateFrom?: string;
    dateTo?: string;
  };
  
  // Error handling
  error: string | null;
}

// Actions interface
interface OrdersActions {
  // Data actions
  loadOrders: (params?: { fromDate?: string; toDate?: string; documentType?: number }) => Promise<void>;
  selectOrder: (orderId: number) => Promise<void>;
  loadOrderItems: (orderId: number) => Promise<void>;
  loadOrderCustomer: (customerId: number) => Promise<void>;
  
  // UI actions
  setSearchText: (text: string) => void;
  setDateFilter: (from?: string, to?: string) => void;
  setDocumentTypeFilter: (type?: number) => void;
  clearFilters: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed getters
  getFilteredOrders: () => RivhitDocument[];
  getOrderById: (id: number) => RivhitDocument | undefined;
}

type OrdersStore = OrdersState & OrdersActions;

const initialState: OrdersState = {
  orders: [],
  selectedOrder: null,
  orderItems: [],
  orderCustomer: null,
  loading: {
    orders: false,
    selectedOrder: false,
    items: false,
    customer: false
  },
  filters: {
    searchText: '',
    documentType: undefined,
    dateFrom: undefined,
    dateTo: undefined
  },
  error: null
};

// Create store with Zustand
export const useOrdersStore = create<OrdersStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Data actions
      loadOrders: async (params) => {
        set((state) => ({
          ...state,
          loading: { ...state.loading, orders: true },
          error: null
        }));

        try {
          const ipcService = new IPCService();
          const result = await ipcService.getOrders(params);
          
          if (result.success) {
            set((state) => ({
              ...state,
              orders: Array.isArray(result.data) ? result.data : [],
              loading: { ...state.loading, orders: false }
            }));
          } else {
            set((state) => ({
              ...state,
              error: result.error || 'Failed to load orders',
              loading: { ...state.loading, orders: false }
            }));
          }
        } catch (error: unknown) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: { ...state.loading, orders: false }
          }));
        }
      },

      selectOrder: async (orderId) => {
        set((state) => ({
          ...state,
          loading: { ...state.loading, selectedOrder: true },
          error: null
        }));

        try {
          const order = get().getOrderById(orderId);
          if (order) {
            set((state) => ({
              ...state,
              selectedOrder: order,
              loading: { ...state.loading, selectedOrder: false }
            }));
            
            // Load related data
            await get().loadOrderItems(order.document_number ?? 0);
          } else {
            set((state) => ({
              ...state,
              error: 'Order not found',
              loading: { ...state.loading, selectedOrder: false }
            }));
          }
        } catch (error: unknown) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : 'Failed to select order',
            loading: { ...state.loading, selectedOrder: false }
          }));
        }
      },

      loadOrderItems: async (orderId) => {
        set((state) => ({
          ...state,
          loading: { ...state.loading, items: true },
          error: null
        }));

        try {
          const ipcService = new IPCService();
          const result = await ipcService.getOrderItems(orderId);
          
          if (result.success) {
            set((state) => ({
              ...state,
              orderItems: Array.isArray(result.data) ? result.data : [],
              loading: { ...state.loading, items: false }
            }));
          } else {
            set((state) => ({
              ...state,
              error: 'error' in result ? result.error : 'Failed to load order items',
              loading: { ...state.loading, items: false }
            }));
          }
        } catch (error: unknown) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: { ...state.loading, items: false }
          }));
        }
      },

      loadOrderCustomer: async (customerId) => {
        set((state) => ({
          ...state,
          loading: { ...state.loading, customer: true },
          error: null
        }));

        try {
          const ipcService = new IPCService();
          const result = await ipcService.getCustomer(customerId);
          
          if (result.success) {
            set((state) => ({
              ...state,
              orderCustomer: (result.data as RivhitCustomer) || null,
              loading: { ...state.loading, customer: false }
            }));
          } else {
            set((state) => ({
              ...state,
              error: result.error || 'Failed to load customer',
              loading: { ...state.loading, customer: false }
            }));
          }
        } catch (error: unknown) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            loading: { ...state.loading, customer: false }
          }));
        }
      },

      // UI actions
      setSearchText: (text) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, searchText: text }
        }));
      },

      setDateFilter: (from, to) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, dateFrom: from, dateTo: to }
        }));
      },

      setDocumentTypeFilter: (type) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, documentType: type }
        }));
      },

      clearFilters: () => {
        set((state) => ({
          ...state,
          filters: {
            searchText: '',
            documentType: undefined,
            dateFrom: undefined,
            dateTo: undefined
          }
        }));
      },

      // Error handling
      setError: (error) => {
        set((state) => ({
          ...state,
          error
        }));
      },

      clearError: () => {
        set((state) => ({
          ...state,
          error: null
        }));
      },

      // Computed getters
      getFilteredOrders: () => {
        const state = get();
        let filtered = [...state.orders];
        
        // Search filter
        if (state.filters.searchText) {
          const searchLower = state.filters.searchText.toLowerCase();
          filtered = filtered.filter((order) =>
            (order.document_number?.toString() || '').includes(searchLower) ||
            order.customer_id?.toString().includes(searchLower) ||
            order.issue_date?.includes(searchLower)
          );
        }
        
        // Document type filter
        if (state.filters.documentType !== undefined) {
          filtered = filtered.filter((order) => order.document_type === state.filters.documentType);
        }
        
        // Date range filter
        if (state.filters.dateFrom || state.filters.dateTo) {
          filtered = filtered.filter((order) => {
            if (!order.issue_date) return false;
            const orderDate = new Date(order.issue_date);
            
            if (state.filters.dateFrom) {
              const fromDate = new Date(state.filters.dateFrom);
              if (orderDate < fromDate) return false;
            }
            
            if (state.filters.dateTo) {
              const toDate = new Date(state.filters.dateTo);
              if (orderDate > toDate) return false;
            }
            
            return true;
          });
        }
        
        return filtered;
      },

      getOrderById: (id) => {
        const state = get();
        return state.orders.find((order) => order.document_number === id);
      }
    }),
    {
      name: 'orders-store',
    }
  )
);

// Export individual selectors for better performance
export const useOrders = () => useOrdersStore((state) => state.orders);
export const useSelectedOrder = () => useOrdersStore((state) => state.selectedOrder);
export const useOrderItems = () => useOrdersStore((state) => state.orderItems);
export const useOrderCustomer = () => useOrdersStore((state) => state.orderCustomer);
export const useOrdersLoading = () => useOrdersStore((state) => state.loading);
export const useOrdersFilters = () => useOrdersStore((state) => state.filters);
export const useOrdersError = () => useOrdersStore((state) => state.error);
export const useFilteredOrders = () => useOrdersStore((state) => state.getFilteredOrders());