# 📋 Developer Handoff: RIVHIT Order Packing & Invoice Integration

## 🎯 Задача
Реализовать полный workflow упаковки заказов с автоматическим переходом между страницами и безопасным сохранением данных для создания счетов-фактур в системе RIVHIT.

## 📚 Контекст и документация

### Существующая документация проекта:
1. **[Анализ системы счетов-фактур](./RIVHIT_Invoice_System_Analysis.md)** - полный анализ работы с инвойсами
2. **[План реализации Workflow](./PACKING_WORKFLOW_IMPLEMENTATION.md)** - детальный план внедрения
3. **[Исследование API методов](./RIVHIT_API_STATUS_UPDATE_RESEARCH.md)** - анализ доступных endpoints
4. **[Анализ управления заказами](./RIVHIT_Order_Management_Analysis.md)** - текущая логика системы

### Ключевые файлы в проекте:
```
📁 Backend:
├── /packages/backend/src/services/rivhit.service.ts - сервис интеграции с API
├── /packages/backend/src/services/safe-rivhit.service.ts - безопасный read-only сервис
├── /packages/backend/src/controllers/orders.controller.ts - контроллер заказов
├── /packages/backend/src/controllers/print.controller.ts - контроллер печати
└── /packages/backend/src/services/box-label.service.ts - генерация этикеток

📁 Frontend:
├── /packages/frontend/src/renderer/pages/OrdersPage.tsx - список заказов
├── /packages/frontend/src/renderer/pages/OrderDetailsPage.tsx - детали заказа
├── /packages/frontend/src/renderer/components/ItemSelector.tsx - выбор товаров
├── /packages/frontend/src/renderer/components/PrintActions.tsx - действия печати
└── /packages/frontend/src/renderer/components/BoxLabelPrint.tsx - печать этикеток коробок

📁 Shared:
└── /packages/shared/src/types/order.types.ts - типы данных
```

## 🔍 План исследования RIVHIT API Endpoints

### ⚠️ ВАЖНО: Тестировать на отдельном дампе/тестовой среде!

### 1. Document.TypeList
**Endpoint:** `POST /Document.TypeList`  
**Цель исследования:** Получить полный список типов документов и их коды

**Что нужно выяснить:**
```javascript
// Тестовый запрос
POST https://api.rivhit.co.il/online/RivhitOnlineAPI.svc/Document.TypeList
{
  "api_token": "TEST_TOKEN"
}

// Ожидаемые вопросы:
1. Какой код у "упакованного заказа"?
2. Есть ли промежуточные статусы между заказом (7) и счетом (2)?
3. Какие поля обязательны для каждого типа?
4. Можно ли создавать кастомные типы?
```

**Документировать:**
- Полный список типов с кодами
- Описание каждого типа на иврите/английском
- Связи между типами (что во что конвертируется)

### 2. Document.New / Document.NewExtended
**Endpoints:** 
- `POST /Document.New` - создание документа
- `POST /Document.NewExtended` - создание документа + квитанция

**Цель исследования:** Понять процесс создания накладной при упаковке

**Тестовый сценарий:**
```javascript
// Шаг 1: Создать тестовый заказ (type 7)
const testOrder = await createTestOrder();

// Шаг 2: Попробовать создать накладную (type 3) со ссылкой на заказ
POST /Document.New
{
  "api_token": "TEST_TOKEN",
  "document": {
    "document_type": 3,  // Delivery Note (תעודת משלוח)
    "reference_document": testOrder.document_id,
    "reference_type": 7,  // Ссылка на заказ
    "customer_id": testOrder.customer_id,
    "items": [
      {
        "item_id": "123",
        "quantity": 10,
        "packed_quantity": 8  // Фактически упаковано
      }
    ],
    "notes": "Packed on 16/08/2025",
    "metadata": {
      "packing_completed": true,
      "boxes_count": 3,
      "operator": "John Doe"
    }
  }
}

// Вопросы для проверки:
1. Меняется ли статус оригинального заказа?
2. Создается ли связь между документами?
3. Какие поля обязательны?
4. Можно ли добавить метаданные?
```

### 3. Document.Close
**Endpoint:** `POST /Document.Close`  
**Цель исследования:** Выяснить, что происходит при закрытии заказа

**Тестовые сценарии:**
```javascript
// Сценарий 1: Простое закрытие
POST /Document.Close
{
  "api_token": "TEST_TOKEN",
  "document_id": testOrder.document_id,
  "document_type": 7
}

// Сценарий 2: Закрытие с параметрами
POST /Document.Close
{
  "api_token": "TEST_TOKEN",
  "document_id": testOrder.document_id,
  "document_type": 7,
  "create_invoice": true,  // Гипотеза: создает счет автоматически
  "close_reason": "packed",
  "notes": "All items packed and ready for delivery"
}

// Проверить после каждого сценария:
1. Изменился ли статус документа?
2. Можно ли редактировать закрытый документ?
3. Создались ли связанные документы?
4. Что возвращает API в ответе?
```

### 4. Document.Send
**Endpoint:** `POST /Document.Send`  
**Цель исследования:** Может ли отправка email менять статус документа

**Тест:**
```javascript
POST /Document.Send
{
  "api_token": "TEST_TOKEN",
  "document_id": testOrder.document_id,
  "document_type": 7,
  "send_to_customer": false,  // Не отправлять реально
  "mark_as_sent": true  // Только пометить как отправленный
}

// Проверить:
1. Изменился ли статус на "sent"?
2. Сохранилась ли дата отправки?
```

### 5. Customer.OpenDocuments
**Endpoint:** `POST /Customer.OpenDocuments`  
**Цель исследования:** Получить список открытых документов клиента

**Использование для нашей задачи:**
```javascript
POST /Customer.OpenDocuments
{
  "api_token": "TEST_TOKEN",
  "customer_id": 12345
}

// Это поможет:
1. Найти все неупакованные заказы клиента
2. Проверить, есть ли уже счет для заказа
3. Понять статусы документов
```

### 6. Item.Update
**Endpoint:** `POST /Item.Update`  
**Цель исследования:** Можно ли обновить количество товара после упаковки

**Тест:**
```javascript
POST /Item.Update
{
  "api_token": "TEST_TOKEN",
  "item_id": "123",
  "fields": {
    "in_stock": 92,  // Было 100, упаковали 8
    "reserved": 0,    // Освободили резерв
    "last_packed": "2025-08-16"
  }
}
```

### 7. Receipt.TypeList
**Endpoint:** `POST /Receipt.TypeList`  
**Цель исследования:** Типы квитанций для подтверждения упаковки

**Проверить:**
- Есть ли тип "packing confirmation"?
- Можно ли создать квитанцию об упаковке?

### 8. Document.Copies
**Endpoint:** `POST /Document.Copies`  
**Цель исследования:** Получение копий документов для печати

**Использование:**
```javascript
POST /Document.Copies
{
  "api_token": "TEST_TOKEN",
  "document_ids": [testOrder.document_id],
  "format": "pdf",
  "include_packing_list": true
}
```

## 🧪 Пошаговый план тестирования

### День 1: Подготовка тестовой среды
1. Получить тестовые credentials
2. Создать тестового клиента
3. Создать тестовые товары
4. Создать тестовый заказ

### День 2: Базовые операции
1. **Document.TypeList** - получить все типы
2. **Customer.OpenDocuments** - проверить открытые документы
3. **Document.Details** - изучить структуру заказа

### День 3: Тестирование обновления статуса
1. **Document.Close** - все варианты
2. **Document.Send** - проверка изменения статуса
3. **Document.New** (type 3) - создание накладной

### День 4: Финальная интеграция
1. Полный workflow: Order → Packing → Delivery Note
2. Проверка связей между документами
3. Тестирование fallback сценариев

## 🛡️ Безопасная архитектура решения

```typescript
// services/SafePackingService.ts
class SafePackingService {
  private testMode = true; // ВАЖНО: включить для тестов
  
  async completePackingWorkflow(orderId: number, packingData: any) {
    const results = {
      documentClosed: false,
      deliveryNoteCreated: false,
      localSaved: false,
      invoiceData: null
    };
    
    // 1. Попытка закрыть документ
    if (await this.canUseDocumentClose()) {
      try {
        results.documentClosed = await this.closeDocument(orderId);
      } catch (e) {
        console.log('Document.Close not available');
      }
    }
    
    // 2. Создание накладной (если разрешено)
    if (await this.canCreateDocuments()) {
      try {
        results.deliveryNoteCreated = await this.createDeliveryNote(orderId, packingData);
      } catch (e) {
        console.log('Cannot create delivery note');
      }
    }
    
    // 3. ВСЕГДА сохраняем локально
    results.localSaved = await this.saveLocally(orderId, packingData);
    results.invoiceData = this.prepareInvoiceData(packingData);
    
    return results;
  }
  
  private async canUseDocumentClose(): Promise<boolean> {
    // Проверка прав и доступности endpoint
    return this.testMode && this.hasPermission('Document.Close');
  }
  
  private async canCreateDocuments(): Promise<boolean> {
    // Проверка прав на создание документов
    return this.testMode && this.hasPermission('Document.New');
  }
}
```

## 📊 Матрица решений

| Сценарий | Document.Close работает | Document.New разрешен | Действие |
|----------|------------------------|----------------------|----------|
| Идеальный | ✅ | ✅ | Close + Create Delivery Note |
| Частичный 1 | ✅ | ❌ | Close + Local Save |
| Частичный 2 | ❌ | ✅ | Create Delivery Note + Local |
| Fallback | ❌ | ❌ | Only Local Save |

## 🔐 Критические проверки безопасности

1. **НИКОГДА не удалять документы**
2. **НИКОГДА не изменять финансовые поля**
3. **ВСЕГДА проверять права перед операцией**
4. **ВСЕГДА логировать все действия**
5. **ВСЕГДА иметь fallback на локальное сохранение**

## 📝 Чек-лист для разработчика

### Перед началом:
- [ ] Получил тестовые credentials
- [ ] Изучил всю документацию выше
- [ ] Понял бизнес-процесс упаковки
- [ ] Настроил тестовую среду

### Реализация:
- [ ] Создал SafePackingService с testMode
- [ ] Реализовал все fallback сценарии
- [ ] Добавил подробное логирование
- [ ] Создал unit тесты для каждого сценария

### Тестирование:
- [ ] Протестировал все endpoints на тестовой среде
- [ ] Задокументировал результаты каждого теста
- [ ] Проверил, что ничего не ломается при ошибках API
- [ ] Убедился, что данные сохраняются локально

### Перед продакшеном:
- [ ] Отключил testMode
- [ ] Проверил все права доступа
- [ ] Создал инструкцию для менеджера
- [ ] Подготовил rollback план

## 🚀 Ожидаемый результат

1. **Workflow работает** даже если API недоступен
2. **Данные всегда сохранены** локально
3. **Менеджер может создать счет** на основе подготовленных данных
4. **Система безопасна** и не нарушает целостность RIVHIT

## 📞 Контакты и ресурсы

- **API Documentation:** https://api.rivhit.co.il/online/RivhitOnlineAPI.svc/help
- **Проектная документация:** /docs/
- **Тестовая среда:** (будет предоставлена)

---

**Подготовлено:** 16.08.2025  
**Для:** Senior/Middle Developer  
**Приоритет:** Высокий  
**Срок:** После получения тестовых credentials