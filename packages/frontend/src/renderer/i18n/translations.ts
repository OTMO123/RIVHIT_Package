export type Language = 'he' | 'ru' | 'en' | 'ar';

export interface Translations {
  // Navigation
  nav: {
    orders: string;
    packing: string;
    printing: string;
    settings: string;
  };
  
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    next: string;
    back: string;
    finish: string;
    search: string;
    print: string;
    scan: string;
    refresh: string;
  };
  
  // Orders
  orders: {
    title: string;
    orderNumber: string;
    customer: string;
    status: string;
    items: string;
    total: string;
    startPacking: string;
    orderDetails: string;
    noOrders: string;
  };
  
  // Packing
  packing: {
    title: string;
    scanItem: string;
    itemName: string;
    quantity: string;
    packed: string;
    remaining: string;
    markAsPacked: string;
    progress: string;
    complete: string;
    skipItem: string;
    printLabel: string;
  };
  
  // Printer
  printer: {
    status: string;
    ready: string;
    offline: string;
    printing: string;
    testPrint: string;
    settings: string;
    selectPrinter: string;
  };
  
  // Status
  status: {
    pending: string;
    inProgress: string;
    completed: string;
    cancelled: string;
  };
}

export const translations: Record<Language, Translations> = {
  // Hebrew (עברית)
  he: {
    nav: {
      orders: 'הזמנות',
      packing: 'אריזה',
      printing: 'הדפסה',
      settings: 'הגדרות',
    },
    common: {
      loading: 'טוען...',
      error: 'שגיאה',
      success: 'הצלחה',
      cancel: 'ביטול',
      save: 'שמירה',
      next: 'הבא',
      back: 'חזור',
      finish: 'סיום',
      search: 'חיפוש',
      print: 'הדפס',
      scan: 'סרוק',
      refresh: 'רענן',
    },
    orders: {
      title: 'רשימת הזמנות',
      orderNumber: 'מספר הזמנה',
      customer: 'לקוח',
      status: 'סטטוס',
      items: 'פריטים',
      total: 'סה"כ',
      startPacking: 'התחל אריזה',
      orderDetails: 'פרטי הזמנה',
      noOrders: 'אין הזמנות',
    },
    packing: {
      title: 'אריזת הזמנה',
      scanItem: 'סרוק פריט',
      itemName: 'שם הפריט',
      quantity: 'כמות',
      packed: 'נארז',
      remaining: 'נותר',
      markAsPacked: 'סמן כנארז',
      progress: 'התקדמות',
      complete: 'הושלם',
      skipItem: 'דלג על פריט',
      printLabel: 'הדפס תווית',
    },
    printer: {
      status: 'סטטוס מדפסת',
      ready: 'מוכן',
      offline: 'לא זמין',
      printing: 'מדפיס',
      testPrint: 'הדפסת בדיקה',
      settings: 'הגדרות מדפסת',
      selectPrinter: 'בחר מדפסת',
    },
    status: {
      pending: 'ממתין',
      inProgress: 'בתהליך',
      completed: 'הושלם',
      cancelled: 'בוטל',
    },
  },
  
  // Russian (Русский)
  ru: {
    nav: {
      orders: 'Заказы',
      packing: 'Упаковка',
      printing: 'Печать',
      settings: 'Настройки',
    },
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успех',
      cancel: 'Отмена',
      save: 'Сохранить',
      next: 'Далее',
      back: 'Назад',
      finish: 'Завершить',
      search: 'Поиск',
      print: 'Печать',
      scan: 'Сканировать',
      refresh: 'Обновить',
    },
    orders: {
      title: 'Список заказов',
      orderNumber: 'Номер заказа',
      customer: 'Клиент',
      status: 'Статус',
      items: 'Товары',
      total: 'Итого',
      startPacking: 'Начать упаковку',
      orderDetails: 'Детали заказа',
      noOrders: 'Нет заказов',
    },
    packing: {
      title: 'Упаковка заказа',
      scanItem: 'Сканировать товар',
      itemName: 'Название товара',
      quantity: 'Количество',
      packed: 'Упаковано',
      remaining: 'Осталось',
      markAsPacked: 'Отметить упакованным',
      progress: 'Прогресс',
      complete: 'Завершено',
      skipItem: 'Пропустить товар',
      printLabel: 'Печать этикетки',
    },
    printer: {
      status: 'Статус принтера',
      ready: 'Готов',
      offline: 'Недоступен',
      printing: 'Печатает',
      testPrint: 'Тестовая печать',
      settings: 'Настройки принтера',
      selectPrinter: 'Выбрать принтер',
    },
    status: {
      pending: 'Ожидает',
      inProgress: 'В процессе',
      completed: 'Завершен',
      cancelled: 'Отменен',
    },
  },
  
  // English
  en: {
    nav: {
      orders: 'Orders',
      packing: 'Packing',
      printing: 'Printing',
      settings: 'Settings',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      next: 'Next',
      back: 'Back',
      finish: 'Finish',
      search: 'Search',
      print: 'Print',
      scan: 'Scan',
      refresh: 'Refresh',
    },
    orders: {
      title: 'Orders List',
      orderNumber: 'Order Number',
      customer: 'Customer',
      status: 'Status',
      items: 'Items',
      total: 'Total',
      startPacking: 'Start Packing',
      orderDetails: 'Order Details',
      noOrders: 'No orders',
    },
    packing: {
      title: 'Order Packing',
      scanItem: 'Scan Item',
      itemName: 'Item Name',
      quantity: 'Quantity',
      packed: 'Packed',
      remaining: 'Remaining',
      markAsPacked: 'Mark as Packed',
      progress: 'Progress',
      complete: 'Complete',
      skipItem: 'Skip Item',
      printLabel: 'Print Label',
    },
    printer: {
      status: 'Printer Status',
      ready: 'Ready',
      offline: 'Offline',
      printing: 'Printing',
      testPrint: 'Test Print',
      settings: 'Printer Settings',
      selectPrinter: 'Select Printer',
    },
    status: {
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  },
  
  // Arabic (العربية)
  ar: {
    nav: {
      orders: 'الطلبات',
      packing: 'التعبئة',
      printing: 'الطباعة',
      settings: 'الإعدادات',
    },
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجح',
      cancel: 'إلغاء',
      save: 'حفظ',
      next: 'التالي',
      back: 'السابق',
      finish: 'إنهاء',
      search: 'بحث',
      print: 'طباعة',
      scan: 'مسح',
      refresh: 'تحديث',
    },
    orders: {
      title: 'قائمة الطلبات',
      orderNumber: 'رقم الطلب',
      customer: 'العميل',
      status: 'الحالة',
      items: 'العناصر',
      total: 'المجموع',
      startPacking: 'بدء التعبئة',
      orderDetails: 'تفاصيل الطلب',
      noOrders: 'لا توجد طلبات',
    },
    packing: {
      title: 'تعبئة الطلب',
      scanItem: 'مسح العنصر',
      itemName: 'اسم العنصر',
      quantity: 'الكمية',
      packed: 'معبأ',
      remaining: 'المتبقي',
      markAsPacked: 'تحديد كمعبأ',
      progress: 'التقدم',
      complete: 'مكتمل',
      skipItem: 'تخطي العنصر',
      printLabel: 'طباعة الملصق',
    },
    printer: {
      status: 'حالة الطابعة',
      ready: 'جاهز',
      offline: 'غير متصل',
      printing: 'يطبع',
      testPrint: 'طباعة تجريبية',
      settings: 'إعدادات الطابعة',
      selectPrinter: 'اختيار الطابعة',
    },
    status: {
      pending: 'في الانتظار',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    },
  },
};

// Language configuration
export const languageConfig = {
  he: { dir: 'rtl', name: 'עברית' },
  ru: { dir: 'ltr', name: 'Русский' },
  en: { dir: 'ltr', name: 'English' },
  ar: { dir: 'rtl', name: 'العربية' },
};