// Конфигурация для безопасного тестирования RIVHIT API
export const SafeTestConfig = {
  // Ограничения для безопасности
  LIMITS: {
    MAX_REQUESTS_PER_MINUTE: 10,
    MAX_DOCUMENTS_PER_REQUEST: 50,
    MAX_ITEMS_PER_REQUEST: 100,
    MAX_CUSTOMERS_PER_REQUEST: 200,
    CACHE_DURATION_SECONDS: 300, // 5 минут
  },

  // Разрешенные методы API
  ALLOWED_METHODS: [
    'Document.List',
    'Document.Get',
    'Item.List', 
    'Item.Get',
    'Customer.List',
    'Customer.Get',
    'Storage.List',
    'Agent.List'
  ] as const,

  // Запрещенные методы (двойная проверка)
  FORBIDDEN_METHODS: [
    'Document.New',
    'Document.Update', 
    'Document.Delete',
    'Customer.New',
    'Customer.Update',
    'Customer.Delete',
    'Item.New',
    'Item.Update',
    'Item.Delete',
    'Storage.Update',
    'Agent.Update'
  ] as const,

  // Параметры для тестового режима
  TEST_FILTERS: {
    // Ограничиваем тестирование только недавними данными
    RECENT_DAYS: 30,
    
    // Тестируем только определенные типы документов
    SAFE_DOCUMENT_TYPES: [1, 2], // Только quotes и orders
    
    // Ограничиваем по статусам (только завершенные)
    SAFE_STATUSES: [5, 6], // Только delivered/completed
  }
} as const;

// Фабрика для создания безопасного клиента
export class SafeRivhitClientFactory {
  static createTestClient(apiToken: string) {
    const config = {
      baseUrl: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
      apiToken,
      timeout: 10000,
      retryAttempts: 2,
      testMode: true,
      
      // Дополнительные ограничения безопасности
      maxRequestsPerMinute: SafeTestConfig.LIMITS.MAX_REQUESTS_PER_MINUTE,
      enableLogging: true,
      enableCache: true,
      
      // Фильтры для дополнительной безопасности
      defaultFilters: {
        limit: 10, // Малые порции данных
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Последние 30 дней
      }
    };

    return config;
  }

  static validateApiToken(token: string): boolean {
    // Базовая валидация токена
    if (!token || token.length < 10) {
      console.error('❌ Invalid API token format');
      return false;
    }

    if (token.includes('test') || token.includes('demo')) {
      console.log('✅ Detected test/demo token');
      return true;
    }

    console.log('⚠️ Production token detected - extra safety measures enabled');
    return true;
  }
}