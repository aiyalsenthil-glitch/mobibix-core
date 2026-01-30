import {
  getFinancialYear,
  generateSalesInvoiceNumber,
  generatePurchaseInvoiceNumber,
  generateJobCardNumber,
} from './invoice-number.util';

describe('Invoice Number Utility', () => {
  describe('getFinancialYear', () => {
    it('should return 2526 for January 2026 (FY 2025-26)', () => {
      const date = new Date(2026, 0, 27); // January 27, 2026
      expect(getFinancialYear(date)).toBe('2526');
    });

    it('should return 2526 for April 2025 (start of FY 2025-26)', () => {
      const date = new Date(2025, 3, 1); // April 1, 2025
      expect(getFinancialYear(date)).toBe('2526');
    });

    it('should return 2425 for March 2025 (end of FY 2024-25)', () => {
      const date = new Date(2025, 2, 31); // March 31, 2025
      expect(getFinancialYear(date)).toBe('2425');
    });

    it('should return 2627 for May 2026 (FY 2026-27)', () => {
      const date = new Date(2026, 4, 15); // May 15, 2026
      expect(getFinancialYear(date)).toBe('2627');
    });

    it('should return 2526 for December 2025 (FY 2025-26)', () => {
      const date = new Date(2025, 11, 25); // December 25, 2025
      expect(getFinancialYear(date)).toBe('2526');
    });
  });

  describe('generateSalesInvoiceNumber', () => {
    it('should generate correct sales invoice number', () => {
      const date = new Date(2026, 0, 27); // January 27, 2026
      const number = generateSalesInvoiceNumber('HP', 1, date);
      expect(number).toBe('HP-S-2526-0001');
    });

    it('should pad sequence number correctly', () => {
      const date = new Date(2026, 0, 27);
      expect(generateSalesInvoiceNumber('HP', 1, date)).toBe('HP-S-2526-0001');
      expect(generateSalesInvoiceNumber('HP', 10, date)).toBe('HP-S-2526-0010');
      expect(generateSalesInvoiceNumber('HP', 100, date)).toBe(
        'HP-S-2526-0100',
      );
      expect(generateSalesInvoiceNumber('HP', 1000, date)).toBe(
        'HP-S-2526-1000',
      );
    });

    it('should handle different shop prefixes', () => {
      const date = new Date(2026, 0, 27);
      expect(generateSalesInvoiceNumber('ABC', 5, date)).toBe(
        'ABC-S-2526-0005',
      );
      expect(generateSalesInvoiceNumber('XYZ', 5, date)).toBe(
        'XYZ-S-2526-0005',
      );
    });
  });

  describe('generatePurchaseInvoiceNumber', () => {
    it('should generate correct purchase invoice number', () => {
      const date = new Date(2026, 0, 27);
      const number = generatePurchaseInvoiceNumber('HP', 1, date);
      expect(number).toBe('HP-P-2526-0001');
    });

    it('should use P type identifier', () => {
      const date = new Date(2026, 0, 27);
      expect(generatePurchaseInvoiceNumber('HP', 5, date)).toContain('-P-');
    });
  });

  describe('generateJobCardNumber', () => {
    it('should generate correct job card number', () => {
      const date = new Date(2026, 0, 27);
      const number = generateJobCardNumber('HP', 1, date);
      expect(number).toBe('HP-J-2526-0001');
    });

    it('should use J type identifier', () => {
      const date = new Date(2026, 0, 27);
      expect(generateJobCardNumber('HP', 5, date)).toContain('-J-');
    });
  });
});
