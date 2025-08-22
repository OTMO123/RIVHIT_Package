# Исследование методов обновления статуса заказов в RIVHIT API

## 📋 Обзор проблемы
**Дата:** 16 августа 2025  
**Задача:** Найти способ обновления статуса заказа при завершении упаковки  
**Ограничение:** Безопасная работа с API без нарушения целостности данных

## 🔍 Доступные API endpoints

### 1. Document.Close
**Endpoint:** `/Document.Close`  
**Описание:** Закрытие документа  
**Предполагаемое использование:**
```javascript
// Возможные параметры (требует проверки)
{
  api_token: "TOKEN",
  document_id: 39481,
  document_type: 7,  // Order
  close_reason: "packed",
  notes: "Упаковано 16.08.2025"
}
```

**Вопросы для проверки:**
- Меняет ли статус документа на "закрыт"?
- Создает ли автоматически связанные документы (накладную, счет)?
- Блокирует ли дальнейшее редактирование?

### 2. Customer.Update
**Endpoint:** `/Customer.Update`  
**Описание:** Обновление данных клиента  
**Предполагаемое использование:**
```javascript
// НЕ подходит для обновления заказов
// Используется только для изменения данных клиента (адрес, телефон и т.д.)
```

### 3. Document.Send
**Endpoint:** `/Document.Send`  
**Описание:** Отправка документа по email  
**Предполагаемое использование:**
```javascript
{
  api_token: "TOKEN",
  document_id: 39481,
  document_type: 7,
  email_to: "customer@email.com",
  email_subject: "Ваш заказ упакован",
  email_body: "..."
}
```

**Возможности:**
- Может изменять статус на "отправлен"
- Фиксирует время отправки
- Создает запись в истории

## 🔄 Альтернативные подходы

### Вариант 1: Использование метаданных документа
Некоторые системы позволяют обновлять метаданные без изменения основного документа:

```javascript
// Гипотетический подход (требует проверки)
POST /Document.Metadata
{
  api_token: "TOKEN",
  document_id: 39481,
  metadata: {
    packing_status: "completed",
    packed_date: "2025-08-16",
    packed_by: "operator_id",
    boxes_count: 3,
    tracking_numbers: ["123", "456", "789"]
  }
}
```

### Вариант 2: Создание связанного документа
Вместо обновления статуса, создаем новый документ типа "Накладная":

```javascript
POST /Document.New
{
  api_token: "TOKEN",
  document_type: 3,  // Delivery Note (תעודת משלוח)
  reference_document: 39481,  // Ссылка на заказ
  customer_id: 12345,
  items: [...],  // Упакованные товары
  notes: "Упаковано согласно заказу #39481"
}
```

**Преимущества:**
- Не изменяет оригинальный заказ
- Создает аудит след
- Соответствует бизнес-процессу

### Вариант 3: Использование Custom Fields
Если RIVHIT поддерживает кастомные поля:

```javascript
POST /Document.CustomFields
{
  api_token: "TOKEN",
  document_id: 39481,
  custom_fields: {
    packing_completed: true,
    packing_date: "2025-08-16",
    packing_operator: "John Doe",
    boxes: [
      {box_id: 1, items: [...]},
      {box_id: 2, items: [...]}
    ]
  }
}
```

## 🧪 Тестовые сценарии для проверки

### Тест 1: Document.Close
```javascript
async function testDocumentClose() {
  const testOrderId = 39481;  // Тестовый заказ
  
  try {
    const response = await fetch('/Document.Close', {
      method: 'POST',
      body: JSON.stringify({
        api_token: API_TOKEN,
        document_id: testOrderId,
        document_type: 7
      })
    });
    
    const result = await response.json();
    console.log('Document.Close result:', result);
    
    // Проверяем изменился ли статус
    const updatedDoc = await getDocument(testOrderId);
    console.log('Updated status:', updatedDoc.status);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

### Тест 2: Проверка связи Order → Invoice
```javascript
async function checkOrderToInvoiceLink() {
  // Получаем заказ типа 7
  const order = await getDocument(39481, 7);
  
  // Ищем связанные документы
  const relatedDocs = await getDocuments({
    reference: order.document_number,
    document_type: 2  // Invoice
  });
  
  if (relatedDocs.length > 0) {
    console.log('Found related invoice:', relatedDocs[0]);
    // Заказ уже конвертирован в счет
  } else {
    console.log('No invoice found for order');
    // Можно создавать счет
  }
}
```

## 📊 Анализ официального интерфейса RIVHIT

### Наблюдения из пользовательского интерфейса:
1. **Кнопка "סגור" (Close)** - закрывает документ
2. **Кнопка "שמור" (Save)** - сохраняет изменения
3. **Кнопка "המרה" (Convert)** - конвертирует в другой тип документа
4. **Статусы** - отображаются цветными метками

### Вероятный workflow в официальном UI:
```
1. Открыть заказ (Type 7)
2. Нажать "המרה" (Convert)
3. Выбрать "חשבונית" (Invoice - Type 2)
4. Система создает новый документ Type 2
5. Оригинальный заказ помечается как "converted"
```

## 🛡️ Безопасная реализация для нашей системы

### Рекомендуемый подход:

```javascript
class SafeOrderStatusUpdater {
  
  /**
   * Попытка безопасного обновления статуса заказа
   */
  async updateOrderStatus(orderId, newStatus, packingData) {
    // 1. Сначала пробуем Document.Close
    try {
      const closeResult = await this.tryDocumentClose(orderId);
      if (closeResult.success) {
        console.log('Order closed successfully');
        return closeResult;
      }
    } catch (error) {
      console.log('Document.Close not available or failed');
    }
    
    // 2. Пробуем создать Delivery Note
    try {
      const deliveryNote = await this.createDeliveryNote(orderId, packingData);
      if (deliveryNote.success) {
        console.log('Delivery note created');
        return deliveryNote;
      }
    } catch (error) {
      console.log('Cannot create delivery note');
    }
    
    // 3. Fallback - сохраняем локально
    return await this.saveStatusLocally(orderId, newStatus, packingData);
  }
  
  async tryDocumentClose(orderId) {
    const response = await fetch('/Document.Close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_token: this.apiToken,
        document_id: orderId,
        document_type: 7,
        close_type: 'packed',
        notes: `Packed at ${new Date().toISOString()}`
      })
    });
    
    if (!response.ok) {
      throw new Error('Document.Close failed');
    }
    
    return await response.json();
  }
  
  async createDeliveryNote(orderId, packingData) {
    // Создаем накладную (Type 3) вместо обновления статуса
    const response = await fetch('/Document.New', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_token: this.apiToken,
        document_type: 3,  // Delivery Note
        reference: orderId,
        customer_id: packingData.customerId,
        items: packingData.items,
        notes: `Delivery note for order #${orderId}`
      })
    });
    
    return await response.json();
  }
  
  async saveStatusLocally(orderId, status, data) {
    // Сохраняем в локальную БД
    await this.db.savePackingStatus({
      order_id: orderId,
      status: status,
      packing_data: data,
      timestamp: new Date(),
      synced: false
    });
    
    return {
      success: true,
      local: true,
      message: 'Status saved locally, pending sync'
    };
  }
}
```

## 📋 Проверочный список

### Что нужно проверить с RIVHIT:
- [ ] Работает ли Document.Close для заказов (type 7)?
- [ ] Что происходит с заказом после Document.Close?
- [ ] Можно ли создать накладную (type 3) со ссылкой на заказ?
- [ ] Есть ли поле status в документах?
- [ ] Какие значения может принимать status?
- [ ] Есть ли webhooks для уведомлений об изменениях?

### Что нужно уточнить у менеджера:
- [ ] Как в официальном UI меняется статус заказа?
- [ ] Что происходит при нажатии "סגור" (Close)?
- [ ] Как создается счет из заказа?
- [ ] Есть ли промежуточные статусы между "заказан" и "доставлен"?

## 🚀 План действий

### Фаза 1: Тестирование (безопасно)
1. Создать тестовый заказ в RIVHIT
2. Попробовать Document.Close через API
3. Проверить изменения в официальном UI
4. Документировать результаты

### Фаза 2: Реализация fallback
1. Если Document.Close работает - использовать его
2. Если нет - создавать Delivery Note
3. Всегда сохранять локально для подстраховки

### Фаза 3: Мониторинг
1. Логировать все попытки обновления
2. Создать отчет о несинхронизированных заказах
3. Уведомлять менеджера о проблемах

## 💡 Выводы

На данный момент у нас нет четкой документации по обновлению статуса заказа в RIVHIT. Рекомендуется:

1. **Протестировать Document.Close** на тестовом заказе
2. **Использовать создание накладной** как альтернативу
3. **Всегда сохранять локально** для надежности
4. **Запросить официальную документацию** у RIVHIT

---

**Документ подготовлен:** 16.08.2025  
**Статус:** Требуется тестирование  
**Следующий шаг:** Провести безопасные тесты с тестовым заказом