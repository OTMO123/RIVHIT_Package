import { RivhitDocument } from '@packing/shared';
import { 
  IOrderDisplayService, 
  IOrderFilterService, 
  IOrderSortService,
  OrderValidationService,
  OrderLocalizationService 
} from '../types/order.interfaces';

// Single Responsibility Principle - каждый сервис отвечает за одну функцию
export class OrderDisplayService implements IOrderDisplayService {
  formatDocumentType(type: number): string {
    switch (type) {
      case 1:
        return 'הזמנה';
      case 2:
        return 'חשבונית';
      case 3:
        return 'תעודת משלוח';
      case 4:
        return 'החזרה';
      default:
        return 'לא ידוע';
    }
  }

  formatAmount(amount: number): string {
    return `₪${amount.toLocaleString('he-IL')}`;
  }

  formatDate(date: string): string {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  }

  getStatusColor(status: number): string {
    switch (status) {
      case 1:
        return 'blue';
      case 2:
        return 'green';
      case 3:
        return 'orange';
      case 4:
        return 'purple';
      case 5:
        return 'success';
      case 6:
        return 'red';
      default:
        return 'default';
    }
  }
}

export class OrderFilterService implements IOrderFilterService {
  filterByText(orders: RivhitDocument[], searchText: string): RivhitDocument[] {
    if (!searchText.trim()) {
      return orders;
    }

    const lowerSearchText = searchText.toLowerCase();
    return orders.filter(order =>
      order.document_number?.toString().includes(lowerSearchText) ||
      order.customer_id.toString().includes(lowerSearchText) ||
      order.issue_date.includes(lowerSearchText)
    );
  }

  filterByType(orders: RivhitDocument[], type: number): RivhitDocument[] {
    return orders.filter(order => order.document_type === type);
  }

  filterByDate(orders: RivhitDocument[], fromDate: string, toDate: string): RivhitDocument[] {
    if (!fromDate && !toDate) {
      return orders;
    }

    return orders.filter(order => {
      const orderDate = new Date(order.issue_date);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;

      if (from && orderDate < from) return false;
      if (to && orderDate > to) return false;
      return true;
    });
  }
}

export class OrderSortService implements IOrderSortService {
  sortByNumber(orders: RivhitDocument[], ascending: boolean = true): RivhitDocument[] {
    return [...orders].sort((a, b) => {
      const result = (a.document_number ?? 0) - (b.document_number ?? 0);
      return ascending ? result : -result;
    });
  }

  sortByDate(orders: RivhitDocument[], ascending: boolean = true): RivhitDocument[] {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.issue_date).getTime();
      const dateB = new Date(b.issue_date).getTime();
      const result = dateA - dateB;
      return ascending ? result : -result;
    });
  }

  sortByAmount(orders: RivhitDocument[], ascending: boolean = true): RivhitDocument[] {
    return [...orders].sort((a, b) => {
      const result = (a.total_amount ?? 0) - (b.total_amount ?? 0);
      return ascending ? result : -result;
    });
  }
}

export class OrderValidationServiceImpl implements OrderValidationService {
  isValidOrder(order: RivhitDocument): boolean {
    return !!(
      order &&
      order.document_number &&
      order.document_type &&
      order.issue_date &&
      order.customer_id &&
      typeof order.total_amount === 'number'
    );
  }

  validateSearchInput(input: string): boolean {
    return input.length <= 100; // Reasonable length limit
  }

  validateDateRange(fromDate: string, toDate: string): boolean {
    if (!fromDate || !toDate) return true;
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return from <= to;
  }
}

export class OrderLocalizationServiceImpl implements OrderLocalizationService {
  getDocumentTypeText(type: number): string {
    switch (type) {
      case 1:
        return 'הזמנה';
      case 2:
        return 'חשבונית';
      case 3:
        return 'תעודת משלוח';
      case 4:
        return 'החזרה';
      default:
        return 'לא ידוע';
    }
  }

  getColumnTitle(column: string): string {
    const columnTitles: Record<string, string> = {
      'document_number': 'מספר מסמך',
      'document_type': 'סוג מסמך',
      'document_date': 'תאריך',
      'document_time': 'שעה',
      'customer_id': 'לקוח',
      'amount': 'סכום',
      'actions': 'פעולות'
    };
    
    return columnTitles[column] || column;
  }

  getEmptyStateText(): string {
    return 'לא נמצאו הזמנות';
  }

  getSearchPlaceholder(): string {
    return 'חיפוש לפי מספר מסמך, לקוח או תאריך';
  }
}

// Factory pattern for creating services (Dependency Inversion Principle)
export class OrderServiceFactory {
  static createDisplayService(): IOrderDisplayService {
    return new OrderDisplayService();
  }

  static createFilterService(): IOrderFilterService {
    return new OrderFilterService();
  }

  static createSortService(): IOrderSortService {
    return new OrderSortService();
  }

  static createValidationService(): OrderValidationService {
    return new OrderValidationServiceImpl();
  }

  static createLocalizationService(): OrderLocalizationService {
    return new OrderLocalizationServiceImpl();
  }
}