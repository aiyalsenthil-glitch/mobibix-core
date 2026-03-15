import { BadRequestException } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import {
  validateProductSerialization,
  isValidIMEIFormat,
  validateIMEIs,
  validateIMEIQuantity,
} from './stock-serialization.validation';

describe('Stock Serialization Validation', () => {
  describe('validateProductSerialization', () => {
    it('should allow serialization for GOODS products', () => {
      expect(() =>
        validateProductSerialization(ProductType.GOODS, true, 'iPhone 15'),
      ).not.toThrow();
    });

    it('should throw error when SERVICE product is serialized', () => {
      expect(() =>
        validateProductSerialization(ProductType.SERVICE, true, 'Repair'),
      ).toThrow(BadRequestException);
      expect(() =>
        validateProductSerialization(ProductType.SERVICE, true, 'Repair'),
      ).toThrow(/SERVICE products are intangible/);
    });

    it('should allow SERVICE product without serialization', () => {
      expect(() =>
        validateProductSerialization(ProductType.SERVICE, false, 'Repair'),
      ).not.toThrow();
    });
  });

  describe('isValidIMEIFormat', () => {
    it('should accept valid 15-digit IMEI (standard)', () => {
      expect(isValidIMEIFormat('123456789012345')).toBe(true);
    });

    it('should accept 14-digit MEID', () => {
      expect(isValidIMEIFormat('12345678901234')).toBe(true);
    });

    it('should accept 16-digit IMEI-SV', () => {
      expect(isValidIMEIFormat('1234567890123456')).toBe(true);
    });

    it('should accept 17-digit variants', () => {
      expect(isValidIMEIFormat('12345678901234567')).toBe(true);
    });

    it('should reject IMEI with letters', () => {
      expect(isValidIMEIFormat('123456789ABC345')).toBe(false);
    });

    it('should reject IMEI with special characters', () => {
      expect(isValidIMEIFormat('123-456-789-012')).toBe(false);
    });

    it('should reject IMEI shorter than 14 digits', () => {
      expect(isValidIMEIFormat('1234567890123')).toBe(false);
    });

    it('should reject IMEI longer than 17 digits', () => {
      expect(isValidIMEIFormat('123456789012345678')).toBe(false);
    });

    it('should handle whitespace in IMEI', () => {
      expect(isValidIMEIFormat('  123456789012345  ')).toBe(true);
    });
  });

  describe('validateIMEIs', () => {
    it('should accept valid unique IMEIs', () => {
      expect(() =>
        validateIMEIs(['123456789012345', '987654321098765']),
      ).not.toThrow();
    });

    it('should throw error for empty array', () => {
      expect(() => validateIMEIs([])).toThrow(BadRequestException);
      expect(() => validateIMEIs([])).toThrow(/cannot be empty/);
    });

    it('should throw error for invalid IMEI formats', () => {
      expect(() => validateIMEIs(['123456789012345', '123ABC456'])).toThrow(
        BadRequestException,
      );
      expect(() => validateIMEIs(['123456789012345', '123ABC456'])).toThrow(
        /Invalid IMEI format/,
      );
    });

    it('should throw error for duplicate IMEIs', () => {
      expect(() =>
        validateIMEIs(['123456789012345', '123456789012345']),
      ).toThrow(BadRequestException);
      expect(() =>
        validateIMEIs(['123456789012345', '123456789012345']),
      ).toThrow(/Duplicate IMEI/);
    });

    it('should detect duplicates after trimming', () => {
      expect(() =>
        validateIMEIs(['  123456789012345', '123456789012345  ']),
      ).toThrow(BadRequestException);
    });

    it('should accept IMEIs with leading/trailing whitespace', () => {
      expect(() =>
        validateIMEIs(['  123456789012345  ', '987654321098765']),
      ).not.toThrow();
    });
  });

  describe('validateIMEIQuantity', () => {
    it('should accept matching quantity', () => {
      expect(() =>
        validateIMEIQuantity(
          ['123456789012345', '987654321098765'],
          2,
          'iPhone',
        ),
      ).not.toThrow();
    });

    it('should throw error when IMEI count is less than quantity', () => {
      expect(() =>
        validateIMEIQuantity(['123456789012345'], 2, 'iPhone'),
      ).toThrow(BadRequestException);
      expect(() =>
        validateIMEIQuantity(['123456789012345'], 2, 'iPhone'),
      ).toThrow(/IMEI count mismatch/);
    });

    it('should throw error when IMEI count is more than quantity', () => {
      expect(() =>
        validateIMEIQuantity(
          ['123456789012345', '987654321098765'],
          1,
          'iPhone',
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw error when no IMEIs provided', () => {
      expect(() => validateIMEIQuantity(undefined, 2, 'iPhone')).toThrow(
        BadRequestException,
      );
      expect(() => validateIMEIQuantity(undefined, 2, 'iPhone')).toThrow(
        /requires 2 IMEI/,
      );
    });

    it('should work without product name', () => {
      expect(() => validateIMEIQuantity(['123456789012345'], 2)).toThrow(
        BadRequestException,
      );
    });
  });
});
