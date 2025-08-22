import { RivhitItem, RivhitCustomer, RivhitDocument, AppItem, PackingItem } from '../types/rivhit.types';

/**
 * Конвертеры данных между RIVHIT API форматом и внутренним форматом приложения
 */
export class RivhitConverter {
  
  /**
   * Конвертирует RIVHIT Item в AppItem (удобный для UI)
   */
  static toAppItem(rivhitItem: RivhitItem): AppItem {
    return {
      id: rivhitItem.item_id,
      name: rivhitItem.item_name,
      description: rivhitItem.item_extended_description || '',
      partNumber: rivhitItem.item_part_num,
      barcode: rivhitItem.barcode,
      groupId: rivhitItem.item_group_id,
      storageId: rivhitItem.storage_id,
      quantity: rivhitItem.quantity,
      costPrice: rivhitItem.cost_nis,
      salePrice: rivhitItem.sale_nis,
      isVatExempt: rivhitItem.exempt_vat,
      location: rivhitItem.location,
      isSerial: rivhitItem.is_serial === 1,
      pictureUrl: rivhitItem.picture_link,
      nameEn: rivhitItem.item_name_en,
      order: rivhitItem.item_order
    };
  }

  /**
   * Конвертирует RIVHIT Item в PackingItem (для процесса упаковки)
   */
  static toPackingItem(rivhitItem: RivhitItem, requestedQuantity?: number, orderId?: string): PackingItem {
    const quantity = requestedQuantity ?? Math.abs(rivhitItem.quantity); // Используем абсолютное значение для отрицательных
    const boxCapacity = this.extractBoxCapacity(rivhitItem.item_extended_description);
    
    // Generate unique line_id using order ID and line number (or unique_id if available)
    const line_id = rivhitItem.unique_id || 
                   (orderId && rivhitItem.line ? `${orderId}_L${rivhitItem.line}` : 
                   `item_${rivhitItem.item_id}_${Date.now()}`);
    
    return {
      ...rivhitItem,
      line_id,
      isPacked: false,
      isAvailable: rivhitItem.quantity > 0, // Доступен если количество положительное
      packedQuantity: 0,
      notes: undefined,
      reason: rivhitItem.quantity <= 0 ? 'Товар отсутствует на складе' : undefined,
      // Переопределяем quantity для отображения запрошенного количества
      quantity: quantity,
      // Box-related properties - всегда устанавливаем boxCapacity для включения UI коробок
      boxCapacity: boxCapacity || 1, // Если не найдено в описании, используем 1 как минимум
      selectedBoxes: 0
    };
  }

  /**
   * Конвертирует массив RIVHIT Items в AppItems
   */
  static toAppItems(rivhitItems: RivhitItem[]): AppItem[] {
    return rivhitItems.map(item => this.toAppItem(item));
  }

  /**
   * Конвертирует массив RIVHIT Items в PackingItems
   */
  static toPackingItems(rivhitItems: RivhitItem[], requestedQuantities?: Map<number, number>, orderId?: string): PackingItem[] {
    return rivhitItems.map(item => {
      const requestedQty = requestedQuantities?.get(item.item_id);
      return this.toPackingItem(item, requestedQty, orderId);
    });
  }

  /**
   * Фильтрует доступные товары (с положительным количеством)
   */
  static filterAvailableItems(rivhitItems: RivhitItem[]): RivhitItem[] {
    return rivhitItems.filter(item => item.quantity > 0);
  }

  /**
   * Фильтрует товары по группе
   */
  static filterByGroup(rivhitItems: RivhitItem[], groupId: number): RivhitItem[] {
    return rivhitItems.filter(item => item.item_group_id === groupId);
  }

  /**
   * Фильтрует товары по складу
   */
  static filterByStorage(rivhitItems: RivhitItem[], storageId: number): RivhitItem[] {
    return rivhitItems.filter(item => item.storage_id === storageId);
  }

  /**
   * Поиск товаров по тексту (имя, описание, штрихкод)
   */
  static searchItems(rivhitItems: RivhitItem[], searchText: string): RivhitItem[] {
    if (!searchText.trim()) return rivhitItems;
    
    const search = searchText.toLowerCase().trim();
    
    return rivhitItems.filter(item =>
      item.item_name.toLowerCase().includes(search) ||
      (item.item_extended_description && item.item_extended_description.toLowerCase().includes(search)) ||
      (item.item_part_num && item.item_part_num.toLowerCase().includes(search)) ||
      (item.barcode && item.barcode.includes(search)) ||
      (item.item_name_en && item.item_name_en.toLowerCase().includes(search))
    );
  }

  /**
   * Сортировка товаров
   */
  static sortItems(rivhitItems: RivhitItem[], sortBy: 'name' | 'price' | 'quantity' | 'order', ascending: boolean = true): RivhitItem[] {
    const sorted = [...rivhitItems].sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case 'name':
          result = a.item_name.localeCompare(b.item_name, 'he');
          break;
        case 'price':
          result = a.sale_nis - b.sale_nis;
          break;
        case 'quantity':
          result = a.quantity - b.quantity;
          break;
        case 'order':
          result = a.item_order - b.item_order;
          break;
      }
      
      return ascending ? result : -result;
    });
    
    return sorted;
  }

  /**
   * Группировка товаров по складу
   */
  static groupByStorage(rivhitItems: RivhitItem[]): Map<number, RivhitItem[]> {
    const groups = new Map<number, RivhitItem[]>();
    
    rivhitItems.forEach(item => {
      const storageId = item.storage_id;
      if (!groups.has(storageId)) {
        groups.set(storageId, []);
      }
      groups.get(storageId)!.push(item);
    });
    
    return groups;
  }

  /**
   * Группировка товаров по группе товаров
   */
  static groupByItemGroup(rivhitItems: RivhitItem[]): Map<number, RivhitItem[]> {
    const groups = new Map<number, RivhitItem[]>();
    
    rivhitItems.forEach(item => {
      const groupId = item.item_group_id;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(item);
    });
    
    return groups;
  }

  /**
   * Статистика по товарам
   */
  static getItemsStats(rivhitItems: RivhitItem[]): {
    total: number;
    available: number;
    outOfStock: number;
    totalValue: number;
    averagePrice: number;
    groups: number;
    storages: number;
  } {
    const available = rivhitItems.filter(item => item.quantity > 0);
    const outOfStock = rivhitItems.filter(item => item.quantity <= 0);
    const totalValue = rivhitItems.reduce((sum, item) => sum + (item.sale_nis * Math.abs(item.quantity)), 0);
    const averagePrice = rivhitItems.length > 0 ? rivhitItems.reduce((sum, item) => sum + item.sale_nis, 0) / rivhitItems.length : 0;
    
    const uniqueGroups = new Set(rivhitItems.map(item => item.item_group_id));
    const uniqueStorages = new Set(rivhitItems.map(item => item.storage_id));
    
    return {
      total: rivhitItems.length,
      available: available.length,
      outOfStock: outOfStock.length,
      totalValue,
      averagePrice,
      groups: uniqueGroups.size,
      storages: uniqueStorages.size
    };
  }

  /**
   * Валидация RIVHIT Item
   */
  static validateItem(rivhitItem: RivhitItem): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rivhitItem.item_name || rivhitItem.item_name.trim().length === 0) {
      errors.push('Item name is required');
    }
    
    if (rivhitItem.item_id < 0) {
      errors.push('Item ID must be positive');
    }
    
    if (rivhitItem.sale_nis < 0) {
      errors.push('Sale price cannot be negative');
    }
    
    if (rivhitItem.cost_nis < 0) {
      errors.push('Cost price cannot be negative');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Создает отчет о товарах для печати/экспорта
   */
  static createItemsReport(rivhitItems: RivhitItem[]): {
    summary: ReturnType<typeof RivhitConverter.getItemsStats>;
    byStorage: Array<{ storageId: number; items: RivhitItem[]; count: number; value: number }>;
    byGroup: Array<{ groupId: number; items: RivhitItem[]; count: number; value: number }>;
    lowStock: RivhitItem[];
    outOfStock: RivhitItem[];
  } {
    const summary = this.getItemsStats(rivhitItems);
    const storageGroups = this.groupByStorage(rivhitItems);
    const itemGroups = this.groupByItemGroup(rivhitItems);
    
    const byStorage = Array.from(storageGroups.entries()).map(([storageId, items]) => ({
      storageId,
      items,
      count: items.length,
      value: items.reduce((sum, item) => sum + (item.sale_nis * Math.abs(item.quantity)), 0)
    }));
    
    const byGroup = Array.from(itemGroups.entries()).map(([groupId, items]) => ({
      groupId,
      items,
      count: items.length,
      value: items.reduce((sum, item) => sum + (item.sale_nis * Math.abs(item.quantity)), 0)
    }));
    
    const lowStock = rivhitItems.filter(item => item.quantity > 0 && item.quantity < 5); // Arbitrary low stock threshold
    const outOfStock = rivhitItems.filter(item => item.quantity <= 0);
    
    return {
      summary,
      byStorage,
      byGroup,
      lowStock,
      outOfStock
    };
  }

  /**
   * Извлекает вместимость коробки из описания товара
   * Ищет любое разумное число в описании как вместимость коробки
   */
  static extractBoxCapacity(description: string): number | undefined {
    if (!description) return undefined;
    
    // Hebrew patterns for box capacity
    const hebrewPatterns = [
      /קרטון\s*(\d+)\s*יח'?/i,           // "קרטון 12 יח'" or "קרטון 12יח'"
      /מארז\s*(\d+)/i,                   // "מארז 6"
      /אריזה\s*(\d+)\s*יחידות/i,         // "אריזה 24 יחידות"
      /חבילה\s*(\d+)/i,                  // "חבילה 8"
      /(\d+)\s*יח['\s]*בקרטון/i,        // "12 יח בקרטון"
      /(\d+)\s*באריזה/i,                 // "6 באריזה"
    ];
    
    // Russian/Universal patterns
    const universalPatterns = [
      /(\d+)г/i,                         // "600г" -> extract number
      /(\d+)\s*(шт|штук|pieces)/i,       // "12 шт"
      /коробк.*?(\d+)/i,                 // "коробка 12"
      /упаковк.*?(\d+)/i,                // "упаковка 6"
      /(\d+).*?(коробк|упаковк)/i,       // "12 коробка"
    ];
    
    // Try Hebrew patterns first
    for (const pattern of hebrewPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const capacity = parseInt(match[1], 10);
        if (capacity > 0 && capacity <= 100) { // Reasonable range
          return capacity;
        }
      }
    }
    
    // Try universal patterns
    for (const pattern of universalPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const capacity = parseInt(match[1], 10);
        
        // For weight-based (like 600г), convert to reasonable box quantity
        if (pattern.source.includes('г') && capacity >= 100) {
          // Convert weight to reasonable box count (6-12 items per box typically)
          if (capacity >= 500) return 6;
          if (capacity >= 300) return 8;
          return 10;
        }
        
        // For regular counts
        if (capacity > 0 && capacity <= 50) {
          return capacity;
        }
      }
    }
    
    // Fallback: try to extract any reasonable number (1-50)
    const numbers = description.match(/\b(\d+)\b/g);
    if (numbers) {
      for (const numStr of numbers) {
        const num = parseInt(numStr, 10);
        if (num >= 1 && num <= 50) {
          return num;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Вычисляет количество коробок на основе количества товара и вместимости коробки
   */
  static calculateBoxes(quantity: number, boxCapacity: number): number {
    if (boxCapacity <= 0) return 0;
    return Math.ceil(quantity / boxCapacity);
  }

  /**
   * Вычисляет общее количество товара на основе количества коробок и вместимости
   */
  static calculateQuantityFromBoxes(boxes: number, boxCapacity: number): number {
    return boxes * boxCapacity;
  }

  /**
   * Проверяет, достаточно ли товара в наличии для указанного количества коробок
   */
  static isBoxQuantityAvailable(boxCount: number, boxCapacity: number, availableQuantity: number): boolean {
    const requiredQuantity = this.calculateQuantityFromBoxes(boxCount, boxCapacity);
    return requiredQuantity <= availableQuantity;
  }
}