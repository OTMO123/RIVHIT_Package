import { RivhitDocument } from '@packing/shared';

// Interface Segregation Principle - разделяем интерфейсы по функциональности
export interface IOrderDisplayService {
  formatDocumentType(type: number): string;
  formatAmount(amount: number): string;
  formatDate(date: string): string;
  getStatusColor(status: number): string;
}

export interface IOrderFilterService {
  filterByText(orders: RivhitDocument[], searchText: string): RivhitDocument[];
  filterByType(orders: RivhitDocument[], type: number): RivhitDocument[];
  filterByDate(orders: RivhitDocument[], fromDate: string, toDate: string): RivhitDocument[];
}

export interface IOrderSortService {
  sortByNumber(orders: RivhitDocument[], ascending: boolean): RivhitDocument[];
  sortByDate(orders: RivhitDocument[], ascending: boolean): RivhitDocument[];
  sortByAmount(orders: RivhitDocument[], ascending: boolean): RivhitDocument[];
}

// Props interfaces following Single Responsibility Principle
export interface OrderListProps {
  orders: RivhitDocument[];
  loading: boolean;
  onOrderSelect: (order: RivhitDocument) => void;
  onRefresh: () => void;
}

export interface OrderSearchProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  onClear: () => void;
}

export interface OrderTableProps {
  orders: RivhitDocument[];
  loading: boolean;
  onOrderSelect: (order: RivhitDocument) => void;
  displayService: IOrderDisplayService;
}

export interface OrderActionsProps {
  onRefresh: () => void;
  loading: boolean;
}

// State management interfaces
export interface OrderListState {
  searchText: string;
  filteredOrders: RivhitDocument[];
  selectedOrder: RivhitDocument | null;
}

export interface OrderListActions {
  setSearchText: (text: string) => void;
  setFilteredOrders: (orders: RivhitDocument[]) => void;
  setSelectedOrder: (order: RivhitDocument | null) => void;
  clearFilters: () => void;
}

// Event handlers following Single Responsibility Principle
export interface OrderEventHandlers {
  onSearch: (text: string) => void;
  onSelect: (order: RivhitDocument) => void;
  onRefresh: () => void;
  onClearSearch: () => void;
}

// Configuration interfaces
export interface OrderListConfig {
  pageSize: number;
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  enableSearch: boolean;
  enableFilter: boolean;
  enableSort: boolean;
}

export interface OrderColumnConfig {
  key: string;
  title: string;
  width: number;
  sortable: boolean;
  filterable: boolean;
}

// Validation interfaces
export interface OrderValidationService {
  isValidOrder(order: RivhitDocument): boolean;
  validateSearchInput(input: string): boolean;
  validateDateRange(fromDate: string, toDate: string): boolean;
}

// Localization interface (for Hebrew support)
export interface OrderLocalizationService {
  getDocumentTypeText(type: number): string;
  getColumnTitle(column: string): string;
  getEmptyStateText(): string;
  getSearchPlaceholder(): string;
}