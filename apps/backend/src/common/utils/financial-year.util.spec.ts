import {
  getFinancialYear,
  getFinancialYearShort,
  getFinancialYearStart,
  getFinancialYearEnd,
  isInFinancialYear,
} from './financial-year.util';

describe('Financial Year Utilities', () => {
  describe('getFinancialYear', () => {
    it('should return correct FY for date in first quarter (Jan-Mar)', () => {
      const date = new Date('2026-02-15');
      expect(getFinancialYear(date)).toBe('2025-26');
    });

    it('should return correct FY for date on April 1 (FY start)', () => {
      const date = new Date('2026-04-01');
      expect(getFinancialYear(date)).toBe('2026-27');
    });

    it('should return correct FY for date on March 31 (FY end)', () => {
      const date = new Date('2026-03-31');
      expect(getFinancialYear(date)).toBe('2025-26');
    });

    it('should return correct FY for date in second quarter (Apr-Jun)', () => {
      const date = new Date('2026-05-20');
      expect(getFinancialYear(date)).toBe('2026-27');
    });
  });

  describe('getFinancialYearShort', () => {
    it('should return short format for date in first quarter', () => {
      const date = new Date('2026-02-15');
      expect(getFinancialYearShort(date)).toBe('2526');
    });

    it('should return short format for date on April 1', () => {
      const date = new Date('2026-04-01');
      expect(getFinancialYearShort(date)).toBe('2627');
    });

    it('should return short format for date in previous FY', () => {
      const date = new Date('2025-01-15');
      expect(getFinancialYearShort(date)).toBe('2425');
    });
  });

  describe('getFinancialYearStart', () => {
    it('should return April 1 of previous year for date in Q1', () => {
      const date = new Date('2026-02-15');
      const start = getFinancialYearStart(date);
      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(3); // April (0-indexed)
      expect(start.getDate()).toBe(1);
    });

    it('should return April 1 of current year for date after April', () => {
      const date = new Date('2026-05-20');
      const start = getFinancialYearStart(date);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(3);
      expect(start.getDate()).toBe(1);
    });
  });

  describe('getFinancialYearEnd', () => {
    it('should return March 31 of current year for date in Q1', () => {
      const date = new Date('2026-02-15');
      const end = getFinancialYearEnd(date);
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(2); // March (0-indexed)
      expect(end.getDate()).toBe(31);
    });

    it('should return March 31 of next year for date after April', () => {
      const date = new Date('2026-05-20');
      const end = getFinancialYearEnd(date);
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(2);
      expect(end.getDate()).toBe(31);
    });
  });

  describe('isInFinancialYear', () => {
    it('should return true for date within specified FY', () => {
      const date = new Date('2026-02-15');
      expect(isInFinancialYear(date, '2025-26')).toBe(true);
    });

    it('should return false for date outside specified FY', () => {
      const date = new Date('2026-02-15');
      expect(isInFinancialYear(date, '2026-27')).toBe(false);
    });

    it('should handle FY boundary dates correctly', () => {
      const marchDate = new Date('2026-03-31');
      const aprilDate = new Date('2026-04-01');

      expect(isInFinancialYear(marchDate, '2025-26')).toBe(true);
      expect(isInFinancialYear(aprilDate, '2025-26')).toBe(false);
      expect(isInFinancialYear(aprilDate, '2026-27')).toBe(true);
    });
  });
});
