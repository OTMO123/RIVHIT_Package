import { ICacheService } from '../../interfaces/ICacheService';
import Redis from 'ioredis';

/**
 * Redis Cache Service
 * Реализует ICacheService используя Redis для distributed кэширования
 * Следует принципам SOLID:
 * - SRP: Отвечает только за кэширование через Redis
 * - OCP: Расширяется без изменения базового интерфейса
 * - LSP: Полностью заменяет ICacheService
 * - ISP: Реализует только необходимые методы кэширования
 * - DIP: Зависит от абстракции ICacheService и Redis интерфейса
 */
export class RedisCacheService implements ICacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor(
    private config: {
      host: string;
      port: number;
      password?: string;
      database?: number;
      keyPrefix?: string;
    } = {
      host: 'localhost',
      port: 6379,
      database: 0,
      keyPrefix: 'rivhit:'
    }
  ) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.database || 0,
      keyPrefix: config.keyPrefix || 'rivhit:',
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis cache connected');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis cache error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis cache connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    this.isConnected = false;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // Используем SCAN для безопасной очистки с prefix
      const prefix = this.config.keyPrefix || 'rivhit:';
      const keys = await this.redis.keys(`${prefix}*`);
      
      if (keys.length > 0) {
        // Удаляем ключи без prefix (Redis автоматически добавляет prefix)
        const keysWithoutPrefix = keys.map(key => key.replace(prefix, ''));
        await this.redis.del(...keysWithoutPrefix);
      }
    } catch (error) {
      console.error('Redis clear error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      throw error;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    try {
      // Redis KEYS команда с паттерном
      const prefix = this.config.keyPrefix || 'rivhit:';
      const fullPattern = `${prefix}${pattern}`;
      const keys = await this.redis.keys(fullPattern);
      
      // Убираем prefix из результатов
      return keys.map(key => key.replace(prefix, ''));
    } catch (error) {
      console.error(`Redis getKeys error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Дополнительные Redis-специфичные методы
   */
  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async getInfo(): Promise<string> {
    return this.redis.info();
  }

  async getTTL(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Atomic operations
   */
  async increment(key: string, by: number = 1): Promise<number> {
    if (by === 1) {
      return this.redis.incr(key);
    } else {
      return this.redis.incrby(key, by);
    }
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    if (by === 1) {
      return this.redis.decr(key);
    } else {
      return this.redis.decrby(key, by);
    }
  }

  /**
   * List operations для очередей
   */
  async pushToList(key: string, value: any): Promise<number> {
    const serializedValue = JSON.stringify(value);
    return this.redis.lpush(key, serializedValue);
  }

  async popFromList(key: string): Promise<any> {
    const value = await this.redis.rpop(key);
    return value ? JSON.parse(value) : null;
  }

  async getListLength(key: string): Promise<number> {
    return this.redis.llen(key);
  }
}