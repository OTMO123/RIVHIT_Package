import {
  capitalize,
  truncate,
  slugify,
  camelCase,
  isEmail,
  isPhone,
  generateId,
  formatFileSize,
  pluralize,
} from '../../src/utils/string.utils';

describe('String Utils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('hello world', 5)).toBe('he...');
      expect(truncate('hello world', 10)).toBe('hello w...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('hello world', 5, '---')).toBe('he---');
    });
  });

  describe('slugify', () => {
    it('should create valid slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Hello   World!!!')).toBe('hello-world');
      expect(slugify('Test-123')).toBe('test-123');
    });

    it('should handle special characters', () => {
      expect(slugify('Hello@World#Test')).toBe('hello-world-test');
    });
  });

  describe('camelCase', () => {
    it('should convert to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
      expect(camelCase('Hello World')).toBe('helloWorld');
      expect(camelCase('hello-world')).toBe('helloWorld');
    });
  });

  describe('isEmail', () => {
    it('should validate email addresses', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name@domain.co.uk')).toBe(true);
      expect(isEmail('invalid-email')).toBe(false);
      expect(isEmail('test@')).toBe(false);
      expect(isEmail('@domain.com')).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('should validate phone numbers', () => {
      expect(isPhone('1234567890')).toBe(true);
      expect(isPhone('+1-234-567-8900')).toBe(true);
      expect(isPhone('(123) 456-7890')).toBe(true);
      expect(isPhone('abc-def-ghij')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate ID of correct length', () => {
      expect(generateId(8)).toHaveLength(8);
      expect(generateId(12)).toHaveLength(12);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(500)).toBe('500.00 B');
    });
  });

  describe('pluralize', () => {
    it('should pluralize correctly', () => {
      expect(pluralize(1, 'item', 'items')).toBe('item');
      expect(pluralize(0, 'item', 'items')).toBe('items');
      expect(pluralize(2, 'item', 'items')).toBe('items');
      expect(pluralize(1, 'child', 'children')).toBe('child');
      expect(pluralize(3, 'child', 'children')).toBe('children');
    });
  });
});