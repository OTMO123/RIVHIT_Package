/**
 * Utility functions for handling Hebrew text
 */

export const isHebrewText = (text: string): boolean => {
  // Hebrew Unicode range: \u0590-\u05FF
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

export const containsHebrew = (text: string): boolean => {
  return isHebrewText(text);
};

export const getTextDirection = (text: string): 'ltr' | 'rtl' => {
  return isHebrewText(text) ? 'rtl' : 'ltr';
};

export const sanitizeHebrewText = (text: string): string => {
  if (!text) return '';
  
  // Remove control characters but keep Hebrew characters
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    // Skip control characters (0x0001, 0x0002, etc.)
    if (code >= 0x0000 && code <= 0x001F && code !== 0x0020) {
      continue; // Skip control characters except space
    }
    result += char;
  }
  return result.trim();
};

export const normalizeHebrewText = (text: string): string => {
  if (!text) return '';
  
  // Normalize Hebrew text for consistent display
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    // Skip bidirectional control characters
    if (code === 0x200E || code === 0x200F || 
        (code >= 0x202A && code <= 0x202E)) {
      continue;
    }
    result += char;
  }
  return result.replace(/\s+/g, ' ').trim();
};

export const isRTL = (text: string): boolean => {
  return getTextDirection(text) === 'rtl';
};

export const wrapHebrewText = (text: string, className = 'hebrew-text'): string => {
  if (!isHebrewText(text)) return text;
  
  return `<span class="${className}" dir="rtl">${text}</span>`;
};

export const mixedTextHelper = (text: string): {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  hasHebrew: boolean;
} => {
  const hasHebrew = containsHebrew(text);
  const direction = getTextDirection(text);
  
  return {
    isRTL: direction === 'rtl',
    direction,
    hasHebrew,
  };
};

export const formatHebrewNumber = (number: number): string => {
  // Convert numbers to Hebrew numerals if needed
  // For now, return regular numbers
  return number.toString();
};

export const compareHebrewStrings = (a: string, b: string): number => {
  // Normalize both strings for comparison
  const normalizedA = normalizeHebrewText(a);
  const normalizedB = normalizeHebrewText(b);
  
  return normalizedA.localeCompare(normalizedB, 'he');
};

export const extractHebrewWords = (text: string): string[] => {
  if (!text) return [];
  
  // Hebrew word boundaries
  const hebrewWords = text.match(/[\u0590-\u05FF]+/g);
  return hebrewWords || [];
};

export const hasOnlyHebrew = (text: string): boolean => {
  if (!text) return false;
  
  // Check if text contains only Hebrew characters and whitespace
  const hebrewOnlyRegex = /^[\u0590-\u05FF\s]+$/;
  return hebrewOnlyRegex.test(text);
};