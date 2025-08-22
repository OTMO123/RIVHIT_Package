import { IRivhitService, ServiceDocumentFilters, ServiceItemFilters, ServiceCustomerFilters } from '../interfaces/IRivhitService';
import { 
  RivhitDocument, 
  RivhitItem, 
  RivhitCustomer
} from '@packing/shared';

/**
 * Mock RivhitService for testing
 * Returns predefined mock data instead of making real API calls
 */
export class MockRivhitService implements IRivhitService {
  private mockData = {
    documents: [
      {
        document_type: 2,
        document_number: 12345,
        issue_date: '2025-01-13',
        due_date: '2025-01-20',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה דחופה - משלוח עד יום שישי',
        project_id: 1,
        agent_id: 1,
        customer_id: 1001,
        total_amount: 425.50,
        vat_amount: 72.34,
        status: 1,
        created_date: '2025-01-13T08:00:00Z',
        updated_date: '2025-01-13T08:00:00Z'
      },
      {
        document_type: 2,
        document_number: 12346,
        issue_date: '2025-01-13',
        due_date: '2025-01-18',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה שבועית - לקוח קבוע',
        project_id: 1,
        agent_id: 1,
        customer_id: 1002,
        total_amount: 189.75,
        vat_amount: 32.26,
        status: 2,
        created_date: '2025-01-13T09:00:00Z',
        updated_date: '2025-01-13T09:00:00Z'
      },
      {
        document_type: 2,
        document_number: 12347,
        issue_date: '2025-01-12',
        due_date: '2025-01-19',
        currency_id: 1,
        discount_type: 5,
        discount_value: 50.00,
        comments: 'הזמנה מיוחדת - הנחת לקוח VIP',
        project_id: 1,
        agent_id: 2,
        customer_id: 1003,
        total_amount: 850.00,
        vat_amount: 144.50,
        status: 4,
        created_date: '2025-01-12T14:30:00Z',
        updated_date: '2025-01-12T14:30:00Z'
      },
      {
        document_type: 2,
        document_number: 12348,
        issue_date: '2025-01-12',
        due_date: '2025-01-17',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה לאירוע - כשרות מהדרין',
        project_id: 2,
        agent_id: 1,
        customer_id: 1004,
        total_amount: 1250.00,
        vat_amount: 212.50,
        status: 0,
        created_date: '2025-01-12T16:45:00Z',
        updated_date: '2025-01-12T16:45:00Z'
      },
      {
        document_type: 2,
        document_number: 12349,
        issue_date: '2025-01-11',
        due_date: '2025-01-16',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה חוזרת - רשת מסעדות',
        project_id: 1,
        agent_id: 3,
        customer_id: 1005,
        total_amount: 2100.00,
        vat_amount: 357.00,
        status: 2,
        created_date: '2025-01-11T10:15:00Z',
        updated_date: '2025-01-11T11:20:00Z'
      },
      {
        document_type: 2,
        document_number: 12350,
        issue_date: '2025-01-11',
        due_date: '2025-01-15',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה אקספרס - משלוח דחוף',
        project_id: 1,
        agent_id: 1,
        customer_id: 1006,
        total_amount: 325.00,
        vat_amount: 55.25,
        status: 6,
        created_date: '2025-01-11T13:45:00Z',
        updated_date: '2025-01-11T13:45:00Z'
      },
      {
        document_type: 2,
        document_number: 12351,
        issue_date: '2025-01-10',
        due_date: '2025-01-17',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה רגילה - לקוח חדש',
        project_id: 1,
        agent_id: 2,
        customer_id: 1007,
        total_amount: 567.25,
        vat_amount: 96.43,
        status: 1,
        created_date: '2025-01-10T12:00:00Z',
        updated_date: '2025-01-10T12:00:00Z'
      },
      {
        document_type: 2,
        document_number: 12352,
        issue_date: '2025-01-10',
        due_date: '2025-01-14',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה קטנה - מבחן איכות',
        project_id: 1,
        agent_id: 1,
        customer_id: 1008,
        total_amount: 125.50,
        vat_amount: 21.34,
        status: 4,
        created_date: '2025-01-10T15:30:00Z',
        updated_date: '2025-01-10T15:30:00Z'
      },
      {
        document_type: 2,
        document_number: 12353,
        issue_date: '2025-01-09',
        due_date: '2025-01-16',
        currency_id: 1,
        discount_type: 10,
        discount_value: 150.00,
        comments: 'הזמנה חגיגית - הנחת כמות',
        project_id: 2,
        agent_id: 3,
        customer_id: 1009,
        total_amount: 1350.00,
        vat_amount: 229.50,
        status: 2,
        created_date: '2025-01-09T11:20:00Z',
        updated_date: '2025-01-09T11:20:00Z'
      },
      {
        document_type: 2,
        document_number: 12354,
        issue_date: '2025-01-09',
        due_date: '2025-01-13',
        currency_id: 1,
        discount_type: 0,
        discount_value: 0,
        comments: 'הזמנה סטנדרטית - שיפוץ מטבח',
        project_id: 1,
        agent_id: 2,
        customer_id: 1010,
        total_amount: 780.00,
        vat_amount: 132.60,
        status: 1,
        created_date: '2025-01-09T14:10:00Z',
        updated_date: '2025-01-09T14:10:00Z'
      }
    ] as RivhitDocument[],

    items: [
      {
        item_id: 1,
        item_name: 'פלמני קלאסיים',
        item_part_num: 'PEL001',
        item_extended_description: 'פלמני קלאסיים בטעם מסורתי',
        barcode: '7290011582345',
        item_group_id: 1,
        storage_id: 1,
        quantity: 15,
        cost_nis: 20.00,
        sale_nis: 25.50,
        currency_id: 1,
        cost_mtc: 20.00,
        sale_mtc: 25.50,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'A-1-1',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Classic Pelmeni',
        item_order: 1
      },
      {
        item_id: 2,
        item_name: 'בלינים דקים',
        item_part_num: 'BLI001',
        item_extended_description: 'בלינים דקים ומושלמים',
        barcode: '7290011582346',
        item_group_id: 2,
        storage_id: 1,
        quantity: 20,
        cost_nis: 15.00,
        sale_nis: 18.00,
        currency_id: 1,
        cost_mtc: 15.00,
        sale_mtc: 18.00,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'A-2-1',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Thin Blinis',
        item_order: 2
      },
      {
        item_id: 3,
        item_name: 'ורניקים עם תפוחי אדמה',
        item_part_num: 'VAR001',
        item_extended_description: 'ורניקים טעימים עם תפוחי אדמה',
        barcode: '7290011582347',
        item_group_id: 3,
        storage_id: 2,
        quantity: 8,
        cost_nis: 25.00,
        sale_nis: 32.00,
        currency_id: 1,
        cost_mtc: 25.00,
        sale_mtc: 32.00,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        location: 'B-1-1',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Potato Vareniki',
        item_order: 3
      }
    ] as RivhitItem[],

    customers: [
      {
        customer_id: 1001,
        first_name: 'יוסי',
        last_name: 'כהן',
        phone: '052-1234567',
        email: 'yossi.cohen@example.com',
        address: 'רחוב הרצל 15',
        city: 'תל אביב'
      },
      {
        customer_id: 1002,
        first_name: 'שרה',
        last_name: 'לוי',
        phone: '054-7654321',
        email: 'sara.levy@example.com',
        address: 'רחוב בן גוריון 22',
        city: 'חיפה'
      },
      {
        customer_id: 1003,
        first_name: 'דוד',
        last_name: 'רוזנברג',
        phone: '050-9876543',
        email: 'david.rosenberg@vip.com',
        address: 'רחוב דיזנגוף 45',
        city: 'תל אביב'
      },
      {
        customer_id: 1004,
        first_name: 'מרים',
        last_name: 'גולדשטיין',
        phone: '053-5555444',
        email: 'miriam.events@kosher.co.il',
        address: 'רחוב הנביאים 8',
        city: 'ירושלים'
      },
      {
        customer_id: 1005,
        first_name: 'אברהם',
        last_name: 'שפירא',
        phone: '052-7777888',
        email: 'avi.shapira@restaurants.co.il',
        address: 'רחוב אלנבי 123',
        city: 'תל אביב'
      },
      {
        customer_id: 1006,
        first_name: 'רחל',
        last_name: 'ברקוביץ',
        phone: '054-3333222',
        email: 'rachel.express@gmail.com',
        address: 'רחוב הכרמל 67',
        city: 'חיפה'
      },
      {
        customer_id: 1007,
        first_name: 'משה',
        last_name: 'אלקיים',
        phone: '050-1111999',
        email: 'moshe.new@outlook.com',
        address: 'רחוב יפו 234',
        city: 'ירושלים'
      },
      {
        customer_id: 1008,
        first_name: 'ענת',
        last_name: 'גרינפלד',
        phone: '053-4444555',
        email: 'anat.test@quality.co.il',
        address: 'רחוב רוטשילד 89',
        city: 'תל אביב'
      },
      {
        customer_id: 1009,
        first_name: 'יצחק',
        last_name: 'פרידמן',
        phone: '052-6666777',
        email: 'yitzchak.celebrations@events.co.il',
        address: 'רחוב קינג ג\'ורג\' 156',
        city: 'תל אביב'
      },
      {
        customer_id: 1010,
        first_name: 'טובה',
        last_name: 'קלמן',
        phone: '054-8888999',
        email: 'tova.kitchen@renovation.co.il',
        address: 'רחוב בר כוכבא 45',
        city: 'בני ברק'
      }
    ] as RivhitCustomer[]
  };

  async getDocuments(filters?: ServiceDocumentFilters): Promise<RivhitDocument[]> {
    console.log('🧪 MockRivhitService: Getting documents', filters);
    
    let result = [...this.mockData.documents];

    if (filters) {
      // Filter by document type if provided
      if (filters.document_type) {
        result = result.filter(doc => doc.document_type === filters.document_type);
      }

      // Filter by customer if provided
      if (filters.customer_id) {
        result = result.filter(doc => doc.customer_id === filters.customer_id);
      }

      // Filter by agent if provided
      if (filters.agent_id) {
        result = result.filter(doc => doc.agent_id === filters.agent_id);
      }

      // Filter by date range if provided
      if (filters.date_from) {
        result = result.filter(doc => doc.issue_date >= filters.date_from!);
      }

      if (filters.date_to) {
        result = result.filter(doc => doc.issue_date <= filters.date_to!);
      }
    }

    // Simulate slight delay
    await this.delay(100);

    return result;
  }

  async getItems(filters?: ServiceItemFilters): Promise<RivhitItem[]> {
    console.log('🧪 MockRivhitService: Getting items', filters);
    
    let result = [...this.mockData.items];

    if (filters) {
      // Filter by group ID if provided
      if (filters.item_group_id) {
        result = result.filter(item => item.item_group_id === filters.item_group_id);
      }

      // Filter by storage ID if provided
      if (filters.storage_id) {
        result = result.filter(item => item.storage_id === filters.storage_id);
      }

      // Filter by search text if provided
      if (filters.search_text) {
        const searchText = filters.search_text.toLowerCase();
        result = result.filter(item => 
          item.item_name.toLowerCase().includes(searchText) ||
          item.item_extended_description.toLowerCase().includes(searchText) ||
          (item.item_part_num && item.item_part_num.toLowerCase().includes(searchText))
        );
      }
    }

    // Simulate slight delay
    await this.delay(50);

    return result;
  }

  async getCustomer(customerId: number): Promise<RivhitCustomer> {
    console.log('🧪 MockRivhitService: Getting customer', { customerId });
    
    const customer = this.mockData.customers.find(c => c.customer_id === customerId);
    
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Simulate slight delay
    await this.delay(30);

    return customer;
  }

  async getCustomers(filters?: ServiceCustomerFilters): Promise<RivhitCustomer[]> {
    console.log('🧪 MockRivhitService: Getting customers', filters);
    
    let result = [...this.mockData.customers];

    if (filters) {
      // Filter by customer type if provided
      if (filters.customer_type) {
        result = result.filter(customer => customer.customer_type === filters.customer_type);
      }

      // Filter by city if provided
      if (filters.city) {
        result = result.filter(customer => customer.city.toLowerCase().includes(filters.city!.toLowerCase()));
      }

      // Filter by search text if provided
      if (filters.search_text) {
        const searchText = filters.search_text.toLowerCase();
        result = result.filter(customer => 
          customer.first_name.toLowerCase().includes(searchText) ||
          customer.last_name.toLowerCase().includes(searchText) ||
          (customer.email && customer.email.toLowerCase().includes(searchText)) ||
          customer.phone.includes(searchText)
        );
      }
    }

    // Simulate slight delay
    await this.delay(50);

    return result;
  }

  async updateOrderStatus(
    documentId: number, 
    status: string, 
    packingData?: any
  ): Promise<boolean> {
    console.log('🧪 MockRivhitService: Updating order status', { 
      documentId, 
      status, 
      packingData 
    });

    // Check if document exists
    const document = this.mockData.documents.find(doc => doc.document_number === documentId);
    
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Simulate slight delay
    await this.delay(200);

    // Always return success in mock mode
    return true;
  }

  async syncPendingOrderUpdates(): Promise<boolean> {
    console.log('🧪 MockRivhitService: Syncing pending updates');
    
    // Simulate slight delay
    await this.delay(100);

    // Always return success in mock mode
    return true;
  }

  async getDocumentDetails(documentType: number, documentNumber: number): Promise<any> {
    console.log(`🧪 MockRivhitService: Getting document details for type ${documentType}, number ${documentNumber}`);
    
    // Find the document
    const document = this.mockData.documents.find(doc => 
      doc.document_number === documentNumber && 
      doc.document_type === documentType
    );
    
    if (!document) {
      throw new Error(`Document ${documentNumber} of type ${documentType} not found`);
    }
    
    // Use real mock items from our mock data
    const mockItems = this.mockData.items.slice(0, 3).map((item, index) => ({
      item_id: item.item_id,
      catalog_number: item.item_part_num,
      description: item.item_name,
      quantity: Math.floor(Math.random() * 10) + 1,
      price_nis: item.sale_nis,
      total_line: 0, // Will be calculated
      barcode: item.barcode,
      unit_name: 'יח\'',
      item_extended_description: item.item_extended_description
    }));
    
    // Calculate totals
    mockItems.forEach(item => {
      item.total_line = item.quantity * item.price_nis;
    });
    
    // Simulate slight delay
    await this.delay(100);
    
    return {
      ...document,
      items: mockItems
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}