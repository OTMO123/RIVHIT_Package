import { ICacheService } from '../interfaces/ICacheService';

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Очищаем истекшие элементы каждые 60 секунд
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getKeys(pattern: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (pattern === '*') {
      return keys;
    }
    
    // Simple pattern matching for basic cases
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}