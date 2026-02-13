/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other attacks
 */

/**
 * Remove potentially harmful characters from strings
 * Sanitizes for HTML context
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove script tags and event handlers
 * For text content that should not contain HTML
 */
export function stripTags(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
}

/**
 * Trim whitespace and normalize string
 * Removes leading/trailing spaces
 */
export function trimAndNormalize(input: string): string {
  if (!input) return '';
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Validate and clean email
 * Returns null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = trimAndNormalize(email);
  // Simple email pattern - production should use more robust validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed.toLowerCase() : null;
}

/**
 * Validate and clean phone number
 * Removes non-digit characters except + at start
 */
export function sanitizePhone(phone: string): string | null {
  const trimmed = trimAndNormalize(phone);
  // Allow + at start, then only digits
  const phonePattern = /^\+?[0-9\s\-\(\)]+$/;
  if (!phonePattern.test(trimmed)) return null;

  // Remove all non-digit characters except +
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Sanitize numeric input
 * Ensures value is a valid number within range
 */
export function sanitizeNumber(
  input: any,
  min?: number,
  max?: number,
): number | null {
  const num = parseFloat(input);
  if (isNaN(num)) return null;

  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;

  return num;
}

/**
 * Sanitize object by removing unwanted properties
 * Whitelisting approach
 */
export function sanitizeObject<T>(
  obj: any,
  allowedKeys: (keyof T)[],
): Partial<T> {
  const result: any = {};

  for (const key of allowedKeys) {
    if (key in obj) {
      const value = obj[key];
      // Sanitize string values
      if (typeof value === 'string') {
        result[key] = trimAndNormalize(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      } else if (value === null || value === undefined) {
        result[key] = value;
      }
      // Dates and other types passed through as-is
      else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Sanitize array of strings
 * Removes empty strings and trims each
 */
export function sanitizeStringArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => (typeof item === 'string' ? trimAndNormalize(item) : ''))
    .filter((item) => item.length > 0);
}

/**
 * Create a sanitized copy of DTO
 * Strips HTML, normalizes whitespace
 */
export function sanitizeDto<T>(dto: T): T {
  const result: any = { ...dto };

  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      result[key] = stripTags(trimAndNormalize(value));
    }
  }

  return result;
}
