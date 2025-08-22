import { 
  RivhitDocument, 
  RivhitItem, 
  RivhitCustomer, 
  RivhitFullDocument,
  DocumentType,
  DocumentStatus,
  CurrencyType
} from '../types/rivhit.types';

// Realistic mock data generator based on RIVHIT API structure
export class MockDataGenerator {
  private static hebrewFirstNames = [
    'דוד', 'שרה', 'מיכאל', 'רחל', 'יוסי', 'מרים', 'אבי', 'תמר', 'אליה', 'רות',
    'משה', 'דינה', 'יעקב', 'לאה', 'אברהם', 'חנה', 'יצחק', 'אסתר', 'שלמה', 'נעמי'
  ];

  private static hebrewLastNames = [
    'כהן', 'לוי', 'רוזן', 'גולדברג', 'אברהם', 'פרידמן', 'נחמן', 'בן דוד', 
    'שמואל', 'ברק', 'אשכנזי', 'ספרדי', 'מזרחי', 'אשר', 'גבע', 'שלום'
  ];

  private static hebrewCities = [
    'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 
    'נתניה', 'באר שבע', 'בני ברק', 'חולון', 'רמת גן', 'בת ים', 'הרצליה'
  ];

  private static hebrewStreets = [
    'רחוב הרצל', 'שדרות בן גוריון', 'רחוב דיזנגוף', 'רחוב אלנבי', 'רחוב הנביאים',
    'רחוב יפו', 'שדרות ירושלים', 'רחוב רוטשילד', 'רחוב שנקין', 'רחוב אבן גבירול',
    'רחוב קינג ג\'ורג\'', 'רחוב בגין', 'רחוב ויצמן', 'רחוב רבין', 'רחוב בורוכוב'
  ];

  private static foodItems = [
    // Dairy & Eggs
    { name: 'חלב 3% ליטר', catalog: 'MLK001', price: 6.50, group: 1 },
    { name: 'גבינה צהובה 200 גרם', catalog: 'CHZ001', price: 12.90, group: 1 },
    { name: 'יוגורט טבעי 500 גרם', catalog: 'YOG001', price: 5.80, group: 1 },
    { name: 'ביצים מארז 12', catalog: 'EGG001', price: 18.90, group: 1 },
    { name: 'חמאה 200 גרם', catalog: 'BTR001', price: 8.50, group: 1 },

    // Meat & Fish
    { name: 'עוף שלם קילו', catalog: 'CHK001', price: 22.90, group: 2 },
    { name: 'בשר טחון 500 גרם', catalog: 'BEF001', price: 35.00, group: 2 },
    { name: 'דג סלמון פילה קילו', catalog: 'FSH001', price: 89.90, group: 2 },
    { name: 'נקניק טורקי 200 גרם', catalog: 'SAU001', price: 15.90, group: 2 },

    // Vegetables & Fruits
    { name: 'עגבניות קילו', catalog: 'VEG001', price: 8.90, group: 3 },
    { name: 'מלפפונים קילו', catalog: 'VEG002', price: 6.50, group: 3 },
    { name: 'תפוחים קילו', catalog: 'FRT001', price: 12.90, group: 3 },
    { name: 'בננות קילו', catalog: 'FRT002', price: 7.90, group: 3 },
    { name: 'בצל קילו', catalog: 'VEG003', price: 4.50, group: 3 },

    // Bakery
    { name: 'לחם מלא 750 גרם', catalog: 'BRD001', price: 7.90, group: 4 },
    { name: 'חלה שבת', catalog: 'BRD002', price: 12.50, group: 4 },
    { name: 'פיתות מארז 6', catalog: 'BRD003', price: 8.90, group: 4 },

    // Pantry
    { name: 'אורז לבן קילו', catalog: 'RIC001', price: 6.90, group: 5 },
    { name: 'פסטה 500 גרם', catalog: 'PST001', price: 4.50, group: 5 },
    { name: 'שמן זית 500 מל', catalog: 'OIL001', price: 25.90, group: 5 },
    { name: 'סוכר לבן קילו', catalog: 'SUG001', price: 4.20, group: 5 },
    { name: 'קמח לבן קילו', catalog: 'FLR001', price: 3.80, group: 5 }
  ];

  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static getRandomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  private static getRandomDate(daysBack: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString().split('T')[0];
  }

  private static getFutureDate(daysForward: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysForward));
    return date.toISOString().split('T')[0];
  }

  private static generatePhone(): string {
    const prefixes = ['050', '052', '053', '054', '055', '058'];
    const prefix = this.getRandomElement(prefixes);
    const number = this.getRandomNumber(1000000, 9999999);
    return `${prefix}-${number}`;
  }

  private static generateBarcode(): string {
    return Math.random().toString().slice(2, 15);
  }

  private static generateIdNumber(): string {
    return this.getRandomNumber(100000000, 999999999).toString();
  }

  static generateCustomer(id?: number): RivhitCustomer {
    const customerId = id || this.getRandomNumber(1001, 9999);
    const firstName = this.getRandomElement(this.hebrewFirstNames);
    const lastName = this.getRandomElement(this.hebrewLastNames);
    const city = this.getRandomElement(this.hebrewCities);
    const street = this.getRandomElement(this.hebrewStreets);

    return {
      customer_id: customerId,
      first_name: firstName,
      last_name: lastName,
      address: `${street} ${this.getRandomNumber(1, 150)}`,
      city,
      zipcode: this.getRandomNumber(10000, 99999).toString(),
      phone: this.generatePhone(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      id_number: this.generateIdNumber(),
      customer_type: this.getRandomNumber(1, 3),
      company_name: Math.random() > 0.7 ? `${lastName} בע"מ` : undefined,
      credit_limit: this.getRandomFloat(1000, 50000, 0)
    };
  }

  static generateItem(id?: number): RivhitItem {
    const itemId = id || this.getRandomNumber(1001, 9999);
    const itemData = this.getRandomElement(this.foodItems);
    const quantity = this.getRandomNumber(1, 20);
    const priceNis = itemData.price;
    const costMultiplier = this.getRandomFloat(0.6, 0.8); // 60-80% of sale price

    return {
      item_id: itemId,
      item_part_num: itemData.catalog,
      item_name: itemData.name,
      item_extended_description: `${itemData.name} - איכות מעולה`,
      quantity,
      sale_nis: priceNis,
      sale_mtc: this.getRandomFloat(priceNis * 0.25, priceNis * 0.35), // Rough USD conversion
      currency_id: 1,
      storage_id: this.getRandomNumber(1, 5),
      barcode: Math.random() > 0.8 ? this.generateBarcode() : null,
      exempt_vat: Math.random() > 0.9,
      item_group_id: itemData.group,
      cost_nis: this.getRandomFloat(priceNis * costMultiplier, priceNis * (costMultiplier + 0.1)),
      cost_mtc: this.getRandomFloat(priceNis * costMultiplier * 0.25, priceNis * costMultiplier * 0.35),
      picture_link: null,
      avitem: 0,
      location: null,
      is_serial: Math.random() > 0.8 ? 1 : 0,
      sapak: 0,
      item_name_en: null,
      item_order: itemId
    };
  }

  static generateDocument(id?: number): RivhitDocument {
    const documentNumber = id || this.getRandomNumber(100001, 999999);
    const documentType = this.getRandomElement(Object.values(DocumentType).filter(v => typeof v === 'number')) as DocumentType;
    const status = this.getRandomElement(Object.values(DocumentStatus).filter(v => typeof v === 'number')) as DocumentStatus;
    const issueDate = this.getRandomDate(60);
    const dueDate = Math.random() > 0.3 ? this.getFutureDate(45) : undefined;

    return {
      document_type: documentType,
      document_number: documentNumber,
      issue_date: issueDate,
      due_date: dueDate,
      currency_id: CurrencyType.NIS,
      discount_type: Math.random() > 0.7 ? this.getRandomNumber(1, 2) : undefined,
      discount_value: Math.random() > 0.7 ? this.getRandomFloat(5, 20) : undefined,
      comments: Math.random() > 0.6 ? 'הערות מיוחדות למשלוח' : undefined,
      project_id: Math.random() > 0.8 ? this.getRandomNumber(1, 100) : undefined,
      agent_id: this.getRandomNumber(1, 10),
      customer_id: this.getRandomNumber(1001, 9999),
      total_amount: 0, // Will be calculated from items
      vat_amount: 0, // Will be calculated
      status,
      created_date: issueDate,
      updated_date: issueDate
    };
  }

  static generateFullDocument(documentId?: number): RivhitFullDocument {
    const document = this.generateDocument(documentId);
    const customer = this.generateCustomer(document.customer_id);
    const itemCount = this.getRandomNumber(3, 12);
    const items = Array.from({ length: itemCount }, (_, index) => 
      this.generateItem(index + 1)
    );

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.sale_nis * item.quantity), 0);
    const vatAmount = subtotal * 0.17; // 17% VAT in Israel
    const discountAmount = document.discount_value ? 
      (document.discount_type === 1 ? document.discount_value : subtotal * (document.discount_value / 100)) 
      : 0;
    
    document.total_amount = subtotal + vatAmount - discountAmount;
    document.vat_amount = vatAmount;

    return {
      document,
      customer,
      items
    };
  }

  static generateDocuments(count: number = 20): RivhitDocument[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateDocument(100001 + index)
    );
  }

  static generateFullDocuments(count: number = 10): RivhitFullDocument[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateFullDocument(100001 + index)
    );
  }

  // Generate test scenario with various document statuses
  static generateTestScenario(): {
    documents: RivhitFullDocument[];
    pendingOrders: RivhitFullDocument[];
    readyForPacking: RivhitFullDocument[];
    completedOrders: RivhitFullDocument[];
  } {
    const documents = this.generateFullDocuments(30);
    
    // Categorize by status for different use cases
    const pendingOrders = documents.filter(d => 
      d.document.status === DocumentStatus.PENDING || 
      d.document.status === DocumentStatus.APPROVED
    );
    
    const readyForPacking = documents.filter(d => 
      d.document.status === DocumentStatus.IN_PROGRESS
    );
    
    const completedOrders = documents.filter(d => 
      d.document.status === DocumentStatus.DELIVERED ||
      d.document.status === DocumentStatus.PACKED
    );

    return {
      documents,
      pendingOrders,
      readyForPacking,
      completedOrders
    };
  }

  // Generate data for specific business scenarios
  static generateUrgentOrders(): RivhitFullDocument[] {
    const orders = this.generateFullDocuments(5);
    
    // Make them urgent (due soon)
    orders.forEach(order => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      order.document.due_date = tomorrow.toISOString().split('T')[0];
      order.document.status = DocumentStatus.APPROVED;
      order.document.comments = 'דחוף - משלוח מהיר!!!';
    });

    return orders;
  }

  static generateLargeOrders(): RivhitFullDocument[] {
    const orders = this.generateFullDocuments(3);
    
    // Make them large orders
    orders.forEach(order => {
      order.items = Array.from({ length: this.getRandomNumber(15, 25) }, 
        (_, index) => this.generateItem(index + 1)
      );
      
      // Recalculate totals
      const subtotal = order.items.reduce((sum, item) => sum + (item.sale_nis * item.quantity), 0);
      order.document.total_amount = subtotal * 1.17; // With VAT
      order.document.vat_amount = subtotal * 0.17;
    });

    return orders;
  }
}