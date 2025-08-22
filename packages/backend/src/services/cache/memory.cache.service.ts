import { ICacheService } from '../../interfaces/ICacheService';

/**
 * In-Memory Cache Service
 * Реализует ICacheService используя Map для хранения в памяти
 * Следует принципам SOLID:
 * - SRP: Отвечает только за кэширование в памяти
 * - OCP: Расширяется без изменения базового интерфейса
 * - LSP: Полностью заменяет ICacheService
 * - ISP: Реализует только необходимые методы кэширования
 * - DIP: Зависит от абстракции ICacheService
 */
export class MemoryCacheService implements ICacheService {
  private cache: Map<string, { value: any; expires?: number }> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Проверка истечения TTL
    if (item.expires && Date.now() > item.expires) {
      await this.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Очистка предыдущего таймера если существует
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(key);
    }

    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    
    this.cache.set(key, { value, expires });

    // Установка таймера для автоматического удаления
    if (ttl) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      
      this.timers.set(key, timer);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async clear(): Promise<void> {
    // Очистка всех таймеров
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Проверка истечения TTL
    if (item.expires && Date.now() > item.expires) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async getKeys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    
    // Простой паттерн-матчинг (* в конце)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return keys.filter(key => key.startsWith(prefix));
    }
    
    // Точное совпадение
    return keys.filter(key => key === pattern);
  }

  /**
   * Дополнительные методы для отладки и мониторинга
   */
  getSize(): number {
    return this.cache.size;
  }

  getStats(): { size: number; timers: number } {
    return {
      size: this.cache.size,
      timers: this.timers.size
    };
  }

  /**
   * Очистка истекших ключей (garbage collection)
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && now > item.expires) {
        await this.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}