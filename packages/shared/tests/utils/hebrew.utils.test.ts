import {
  isHebrewText,
  containsHebrew,
  getTextDirection,
  sanitizeHebrewText,
  normalizeHebrewText,
  isRTL,
  hasOnlyHebrew,
  extractHebrewWords,
  compareHebrewStrings,
} from '../../src/utils/hebrew.utils';

describe('Hebrew Utils', () => {
  describe('isHebrewText', () => {
    it('should detect Hebrew text', () => {
      expect(isHebrewText('שלום')).toBe(true);
      expect(isHebrewText('פלמני')).toBe(true);
      expect(isHebrewText('hello')).toBe(false);
      expect(isHebrewText('123')).toBe(false);
    });

    it('should handle mixed text', () => {
      expect(isHebrewText('שלום world')).toBe(true);
      expect(isHebrewText('hello שלום')).toBe(true);
      expect(isHebrewText('hello world')).toBe(false);
    });
  });

  describe('containsHebrew', () => {
    it('should detect Hebrew in mixed text', () => {
      expect(containsHebrew('Product פלמני')).toBe(true);
      expect(containsHebrew('שלום World')).toBe(true);
      expect(containsHebrew('Hello World')).toBe(false);
      expect(containsHebrew('')).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('should return correct text direction', () => {
      expect(getTextDirection('שלום')).toBe('rtl');
      expect(getTextDirection('hello')).toBe('ltr');
      expect(getTextDirection('שלום world')).toBe('rtl');
      expect(getTextDirection('hello שלום')).toBe('rtl');
    });
  });

  describe('sanitizeHebrewText', () => {
    it('should remove control characters', () => {
      const textWithControls = 'שלום\\u0001\\u0002עולם';
      expect(sanitizeHebrewText(textWithControls)).toBe('שלוםעולם');
    });

    it('should handle empty string', () => {
      expect(sanitizeHebrewText('')).toBe('');
      expect(sanitizeHebrewText(null as any)).toBe('');
      expect(sanitizeHebrewText(undefined as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeHebrewText('  שלום  ')).toBe('שלום');
    });
  });

  describe('normalizeHebrewText', () => {
    it('should normalize Hebrew text', () => {
      const textWithBidi = 'שלום\\u200Eעולם';
      expect(normalizeHebrewText(textWithBidi)).toBe('שלוםעולם');
    });

    it('should normalize whitespace', () => {
      expect(normalizeHebrewText('שלום   עולם')).toBe('שלום עולם');
    });

    it('should handle empty string', () => {
      expect(normalizeHebrewText('')).toBe('');
    });
  });

  describe('isRTL', () => {
    it('should detect RTL text', () => {
      expect(isRTL('שלום')).toBe(true);
      expect(isRTL('hello')).toBe(false);
      expect(isRTL('פלמני קלאסיים')).toBe(true);
    });
  });

  describe('hasOnlyHebrew', () => {
    it('should detect Hebrew-only text', () => {
      expect(hasOnlyHebrew('שלום עולם')).toBe(true);
      expect(hasOnlyHebrew('שלום')).toBe(true);
      expect(hasOnlyHebrew('שלום123')).toBe(false);
      expect(hasOnlyHebrew('שלום hello')).toBe(false);
      expect(hasOnlyHebrew('hello')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(hasOnlyHebrew('')).toBe(false);
    });
  });

  describe('extractHebrewWords', () => {
    it('should extract Hebrew words', () => {
      expect(extractHebrewWords('שלום עולם')).toEqual(['שלום', 'עולם']);
      expect(extractHebrewWords('hello שלום world עולם')).toEqual(['שלום', 'עולם']);
      expect(extractHebrewWords('hello world')).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(extractHebrewWords('')).toEqual([]);
    });
  });

  describe('compareHebrewStrings', () => {
    it('should compare Hebrew strings correctly', () => {
      expect(compareHebrewStrings('אבג', 'אבד')).toBeLessThan(0);
      expect(compareHebrewStrings('אבד', 'אבג')).toBeGreaterThan(0);
      expect(compareHebrewStrings('אבג', 'אבג')).toBe(0);
    });

    it('should handle normalized comparison', () => {
      expect(compareHebrewStrings('  אבג  ', 'אבג')).toBe(0);
    });
  });
});