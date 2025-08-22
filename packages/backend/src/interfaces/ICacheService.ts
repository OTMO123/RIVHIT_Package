export interface ICacheService {
  /**
   * Получить значение из кэша
   * @param key - Ключ
   * @returns Promise<T | null>
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Установить значение в кэш
   * @param key - Ключ
   * @param value - Значение
   * @param ttl - Время жизни в секундах
   * @returns Promise<void>
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Удалить значение из кэша
   * @param key - Ключ
   * @returns Promise<void>
   */
  delete(key: string): Promise<void>;

  /**
   * Очистить весь кэш
   * @returns Promise<void>
   */
  clear(): Promise<void>;

  /**
   * Проверить существование ключа
   * @param key - Ключ
   * @returns Promise<boolean>
   */
  exists(key: string): Promise<boolean>;

  /**
   * Получить список ключей по паттерну
   * @param pattern - Паттерн для поиска ключей (например, "user:*")
   * @returns Promise<string[]>
   */
  getKeys(pattern: string): Promise<string[]>;
}