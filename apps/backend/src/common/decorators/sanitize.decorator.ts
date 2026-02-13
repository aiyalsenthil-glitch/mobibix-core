import { Transform } from 'class-transformer';
import {
  sanitizeHtml,
  stripTags,
  trimAndNormalize,
  sanitizeEmail,
  sanitizePhone,
} from '../utils/sanitization.util';

/**
 * Sanitize string inputs - removes HTML and trims
 * Usage: @Sanitize() name: string;
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return stripTags(trimAndNormalize(value));
  });
}

/**
 * Sanitize and validate email
 * Usage: @SanitizeEmail() email: string;
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeEmail(value) || value; // Return original if invalid format (validator will catch it)
  });
}

/**
 * Sanitize and validate phone number
 * Usage: @SanitizePhone() phone: string;
 */
export function SanitizePhone() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const sanitized = sanitizePhone(value);
    return sanitized || value; // Return original if invalid (validator will catch it)
  });
}

/**
 * Sanitize HTML special characters
 * Usage: @SanitizeHtml() content: string;
 */
export function SanitizeHtmlTransform() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value);
  });
}

/**
 * Trim and normalize whitespace only
 * Usage: @TrimTransform() name: string;
 */
export function TrimTransform() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return trimAndNormalize(value);
  });
}
