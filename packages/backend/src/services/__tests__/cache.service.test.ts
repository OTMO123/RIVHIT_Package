import { MemoryCacheService } from '../cache.service';

describe('MemoryCacheService', () => {
  let service: MemoryCacheService;

  beforeEach(() => {
    service = new MemoryCacheService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      // Arrange
      const key = 'test-key';
      const value = { data: 'test-value' };

      // Act
      await service.set(key, value);
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      // Act
      const result = await service.get('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for expired keys', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 0.001; // 1ms

      // Act
      await service.set(key, value, ttl);
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';

      // Act
      await service.set(key, value);
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(value);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      await service.set(key, value);

      // Act
      await service.delete(key);
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle deleting non-existent keys', async () => {
      // Act & Assert
      await expect(service.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      // Arrange
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      // Act
      await service.clear();

      // Assert
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
      expect(await service.get('key3')).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing keys', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      await service.set(key, value);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      // Act
      const result = await service.exists('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for expired keys', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 0.001; // 1ms

      // Act
      await service.set(key, value, ttl);
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      const result = await service.exists(key);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should automatically clean up expired items', async () => {
      // Arrange
      const key1 = 'key1';
      const key2 = 'key2';
      const shortTTL = 0.001; // 1ms
      const longTTL = 3600; // 1 hour

      await service.set(key1, 'value1', shortTTL);
      await service.set(key2, 'value2', longTTL);

      // Act
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      
      // Trigger cleanup by accessing the service
      await service.exists(key1);

      // Assert
      expect(await service.exists(key1)).toBe(false);
      expect(await service.exists(key2)).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should clear cache and stop cleanup interval', async () => {
      // Arrange
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      // Act
      service.destroy();

      // Assert
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
    });
  });
});