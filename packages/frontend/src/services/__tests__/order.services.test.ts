import { RivhitDocument } from '@packing/shared';
import { 
  OrderDisplayService, 
  OrderFilterService, 
  OrderSortService,
  OrderValidationServiceImpl,
  OrderLocalizationServiceImpl
} from '../order.services';

describe('OrderDisplayService', () => {
  let service: OrderDisplayService;

  beforeEach(() => {
    service = new OrderDisplayService();
  });

  describe('formatDocumentType', () => {
    it('should format document type correctly', () => {
      expect(service.formatDocumentType(1)).toBe('הזמנה');
      expect(service.formatDocumentType(2)).toBe('חשבונית');
      expect(service.formatDocumentType(3)).toBe('תעודת משלוח');
      expect(service.formatDocumentType(4)).toBe('החזרה');
      expect(service.formatDocumentType(999)).toBe('לא ידוע');
    });
  });

  describe('formatAmount', () => {
    it('should format amount with Israeli locale', () => {
      expect(service.formatAmount(1000)).toBe('₪1,000');
      expect(service.formatAmount(1234.56)).toBe('₪1,234.56');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = service.formatDate('2023-01-15');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should handle invalid date', () => {
      expect(service.formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for different statuses', () => {
      expect(service.getStatusColor(1)).toBe('blue');
      expect(service.getStatusColor(2)).toBe('green');
      expect(service.getStatusColor(3)).toBe('orange');
      expect(service.getStatusColor(4)).toBe('purple');
      expect(service.getStatusColor(5)).toBe('success');
      expect(service.getStatusColor(6)).toBe('red');
      expect(service.getStatusColor(999)).toBe('default');
    });
  });
});

describe('OrderFilterService', () => {
  let service: OrderFilterService;
  let mockOrders: RivhitDocument[];

  beforeEach(() => {
    service = new OrderFilterService();
    mockOrders = [
      {
        document_type: 1,
        document_number: 123,
        issue_date: '2023-01-01',
        total_amount: 100,
        customer_id: 1,
        currency_id: 1
      },
      {
        document_type: 2,
        document_number: 456,
        issue_date: '2023-01-02',
        total_amount: 200,
        customer_id: 2,
        currency_id: 1
      }
    ];
  });

  describe('filterByText', () => {
    it('should filter by document number', () => {
      const result = service.filterByText(mockOrders, '123');
      expect(result).toHaveLength(1);
      expect(result[0].document_number).toBe(123);
    });

    it('should filter by customer ID', () => {
      const result = service.filterByText(mockOrders, '2');
      expect(result).toHaveLength(1);
      expect(result[0].customer_id).toBe(2);
    });

    it('should return all orders when search text is empty', () => {
      const result = service.filterByText(mockOrders, '');
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByType', () => {
    it('should filter by document type', () => {
      const result = service.filterByType(mockOrders, 1);
      expect(result).toHaveLength(1);
      expect(result[0].document_type).toBe(1);
    });
  });

  describe('filterByDate', () => {
    it('should filter by date range', () => {
      const result = service.filterByDate(mockOrders, '2023-01-01', '2023-01-01');
      expect(result).toHaveLength(1);
      expect(result[0].issue_date).toBe('2023-01-01');
    });

    it('should return all orders when no date range provided', () => {
      const result = service.filterByDate(mockOrders, '', '');
      expect(result).toHaveLength(2);
    });
  });
});

describe('OrderSortService', () => {
  let service: OrderSortService;
  let mockOrders: RivhitDocument[];

  beforeEach(() => {
    service = new OrderSortService();
    mockOrders = [
      {
        document_type: 1,
        document_number: 456,
        issue_date: '2023-01-02',
        total_amount: 200,
        customer_id: 1,
        currency_id: 1
      },
      {
        document_type: 2,
        document_number: 123,
        issue_date: '2023-01-01',
        total_amount: 100,
        customer_id: 2,
        currency_id: 1
      }
    ];
  });

  describe('sortByNumber', () => {
    it('should sort by document number ascending', () => {
      const result = service.sortByNumber(mockOrders, true);
      expect(result[0].document_number).toBe(123);
      expect(result[1].document_number).toBe(456);
    });

    it('should sort by document number descending', () => {
      const result = service.sortByNumber(mockOrders, false);
      expect(result[0].document_number).toBe(456);
      expect(result[1].document_number).toBe(123);
    });
  });

  describe('sortByDate', () => {
    it('should sort by date ascending', () => {
      const result = service.sortByDate(mockOrders, true);
      expect(result[0].issue_date).toBe('2023-01-01');
      expect(result[1].issue_date).toBe('2023-01-02');
    });
  });

  describe('sortByAmount', () => {
    it('should sort by amount ascending', () => {
      const result = service.sortByAmount(mockOrders, true);
      expect(result[0].total_amount).toBe(100);
      expect(result[1].total_amount).toBe(200);
    });
  });
});

describe('OrderValidationServiceImpl', () => {
  let service: OrderValidationServiceImpl;

  beforeEach(() => {
    service = new OrderValidationServiceImpl();
  });

  describe('isValidOrder', () => {
    it('should validate correct order', () => {
      const order: RivhitDocument = {
        document_type: 1,
        document_number: 123,
        issue_date: '2023-01-01',
        total_amount: 100,
        customer_id: 1,
        currency_id: 1
      };

      expect(service.isValidOrder(order)).toBe(true);
    });

    it('should invalidate incomplete order', () => {
      const order = {
        document_type: 1,
        document_number: 123
      } as RivhitDocument;

      expect(service.isValidOrder(order)).toBe(false);
    });
  });

  describe('validateSearchInput', () => {
    it('should validate reasonable search input', () => {
      expect(service.validateSearchInput('123')).toBe(true);
      expect(service.validateSearchInput('a'.repeat(100))).toBe(true);
    });

    it('should invalidate too long search input', () => {
      expect(service.validateSearchInput('a'.repeat(101))).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date range', () => {
      expect(service.validateDateRange('2023-01-01', '2023-01-02')).toBe(true);
    });

    it('should invalidate incorrect date range', () => {
      expect(service.validateDateRange('2023-01-02', '2023-01-01')).toBe(false);
    });

    it('should validate empty date range', () => {
      expect(service.validateDateRange('', '')).toBe(true);
    });
  });
});

describe('OrderLocalizationServiceImpl', () => {
  let service: OrderLocalizationServiceImpl;

  beforeEach(() => {
    service = new OrderLocalizationServiceImpl();
  });

  describe('getDocumentTypeText', () => {
    it('should return Hebrew text for document types', () => {
      expect(service.getDocumentTypeText(1)).toBe('הזמנה');
      expect(service.getDocumentTypeText(2)).toBe('חשבונית');
      expect(service.getDocumentTypeText(3)).toBe('תעודת משלוח');
      expect(service.getDocumentTypeText(4)).toBe('החזרה');
      expect(service.getDocumentTypeText(999)).toBe('לא ידוע');
    });
  });

  describe('getColumnTitle', () => {
    it('should return Hebrew column titles', () => {
      expect(service.getColumnTitle('document_number')).toBe('מספר מסמך');
      expect(service.getColumnTitle('document_type')).toBe('סוג מסמך');
      expect(service.getColumnTitle('amount')).toBe('סכום');
      expect(service.getColumnTitle('unknown')).toBe('unknown');
    });
  });

  describe('getEmptyStateText', () => {
    it('should return Hebrew empty state text', () => {
      expect(service.getEmptyStateText()).toBe('לא נמצאו הזמנות');
    });
  });

  describe('getSearchPlaceholder', () => {
    it('should return Hebrew search placeholder', () => {
      expect(service.getSearchPlaceholder()).toBe('חיפוש לפי מספר מסמך, לקוח או תאריך');
    });
  });
});