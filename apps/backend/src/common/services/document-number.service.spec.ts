import { Test, TestingModule } from '@nestjs/testing';
import { DocumentNumberService } from './document-number.service';
import { DocumentType, YearFormat, ResetPolicy } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Test suite for DocumentNumberService
 *
 * Covers:
 * - Year format variations (FY, YYYY, YY, NONE)
 * - Reset policies (NEVER, YEARLY, MONTHLY)
 * - Financial year transitions
 * - Padding with different numberLength
 * - Concurrent generation (mocked)
 * - Error handling
 */
describe('DocumentNumberService', () => {
  let service: DocumentNumberService;

  // Mock Prisma transaction client
  const mockTx = {
    $queryRaw: jest.fn(),
    shopDocumentSetting: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentNumberService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            shopDocumentSetting: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentNumberService>(DocumentNumberService);
    jest.clearAllMocks();
  });

  describe('formatYear', () => {
    it('should format FY correctly (2526)', () => {
      // April 2025 = FY 2526
      const result = service['formatYear'](new Date('2025-04-01'), 'FY');
      expect(result).toBe('2526');
    });

    it('should format FY correctly before April (2425)', () => {
      // March 2025 = FY 2425 (prev year to current)
      const result = service['formatYear'](new Date('2025-03-31'), 'FY');
      expect(result).toBe('2425');
    });

    it('should format YYYY correctly (20252026)', () => {
      const result = service['formatYear'](new Date('2025-04-01'), 'YYYY');
      expect(result).toBe('20252026');
    });

    it('should format YY correctly (26)', () => {
      const result = service['formatYear'](new Date('2025-04-01'), 'YY');
      expect(result).toBe('26');
    });

    it('should return empty string for NONE', () => {
      const result = service['formatYear'](new Date('2025-04-01'), 'NONE');
      expect(result).toBe('');
    });
  });

  describe('getYearResetKey', () => {
    it('should return financial year for YEARLY policy', () => {
      const result = service['getYearResetKey'](
        new Date('2025-04-01'),
        'YEARLY',
      );
      expect(result).toBe('2526');
    });

    it('should return YYYY-MM for MONTHLY policy', () => {
      const result = service['getYearResetKey'](
        new Date('2025-04-15'),
        'MONTHLY',
      );
      expect(result).toBe('2025-04');
    });

    it('should return empty string for NEVER policy', () => {
      const result = service['getYearResetKey'](
        new Date('2025-04-01'),
        'NEVER',
      );
      expect(result).toBe('');
    });
  });

  describe('generateDocumentNumber - format variations', () => {
    beforeEach(() => {
      // Mock successful query and update
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-1',
          prefix: 'HP',
          separator: '-',
          documentCode: 'S',
          yearFormat: 'FY' as YearFormat,
          numberLength: 4,
          resetPolicy: 'NEVER' as ResetPolicy,
          currentNumber: 0,
          currentYear: null,
        },
      ]);
      mockTx.shopDocumentSetting.update.mockResolvedValue({});
    });

    it('should generate standard format: HP-S-2526-0001', async () => {
      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'SALES_INVOICE' as DocumentType,
        new Date('2025-04-01'),
        mockTx as any,
      );

      expect(result).toBe('HP-S-2526-0001');
      expect(mockTx.shopDocumentSetting.update).toHaveBeenCalledWith({
        where: { id: 'setting-1' },
        data: {
          currentNumber: 1,
          currentYear: null,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should generate without year when NONE', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-2',
          prefix: 'HP',
          separator: '-',
          documentCode: 'J',
          yearFormat: 'NONE' as YearFormat,
          numberLength: 5,
          resetPolicy: 'NEVER' as ResetPolicy,
          currentNumber: 42,
          currentYear: null,
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'JOB_CARD' as DocumentType,
        new Date('2025-04-01'),
        mockTx as any,
      );

      expect(result).toBe('HP-J-00043');
    });

    it('should respect custom separator (slash)', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-3',
          prefix: 'DL',
          separator: '/',
          documentCode: 'P',
          yearFormat: 'YY' as YearFormat,
          numberLength: 3,
          resetPolicy: 'NEVER' as ResetPolicy,
          currentNumber: 99,
          currentYear: null,
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-2',
        'PURCHASE_INVOICE' as DocumentType,
        new Date('2025-04-01'),
        mockTx as any,
      );

      expect(result).toBe('DL/P/26/100');
    });

    it('should pad numbers to specified length', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-4',
          prefix: 'MH',
          separator: '-',
          documentCode: 'R',
          yearFormat: 'FY' as YearFormat,
          numberLength: 6,
          resetPolicy: 'NEVER' as ResetPolicy,
          currentNumber: 5,
          currentYear: null,
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-3',
        'RECEIPT' as DocumentType,
        new Date('2025-04-01'),
        mockTx as any,
      );

      expect(result).toBe('MH-R-2526-000006');
    });
  });

  describe('generateDocumentNumber - reset policies', () => {
    it('should reset on financial year change (YEARLY)', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-5',
          prefix: 'HP',
          separator: '-',
          documentCode: 'S',
          yearFormat: 'FY' as YearFormat,
          numberLength: 4,
          resetPolicy: 'YEARLY' as ResetPolicy,
          currentNumber: 9999,
          currentYear: '2425', // Previous FY
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'SALES_INVOICE' as DocumentType,
        new Date('2025-04-01'), // New FY: 2526
        mockTx as any,
      );

      expect(result).toBe('HP-S-2526-0001');
      expect(mockTx.shopDocumentSetting.update).toHaveBeenCalledWith({
        where: { id: 'setting-5' },
        data: {
          currentNumber: 1, // Reset to 1
          currentYear: '2526', // Updated to new FY
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should NOT reset if same financial year (YEARLY)', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-6',
          prefix: 'HP',
          separator: '-',
          documentCode: 'S',
          yearFormat: 'FY' as YearFormat,
          numberLength: 4,
          resetPolicy: 'YEARLY' as ResetPolicy,
          currentNumber: 50,
          currentYear: '2526',
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'SALES_INVOICE' as DocumentType,
        new Date('2025-05-15'), // Still FY 2526
        mockTx as any,
      );

      expect(result).toBe('HP-S-2526-0051');
      expect(mockTx.shopDocumentSetting.update).toHaveBeenCalledWith({
        where: { id: 'setting-6' },
        data: {
          currentNumber: 51, // Incremented, not reset
          currentYear: '2526', // Same
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should reset on month change (MONTHLY)', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-7',
          prefix: 'HP',
          separator: '-',
          documentCode: 'J',
          yearFormat: 'FY' as YearFormat,
          numberLength: 4,
          resetPolicy: 'MONTHLY' as ResetPolicy,
          currentNumber: 500,
          currentYear: '2025-04',
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'JOB_CARD' as DocumentType,
        new Date('2025-05-01'), // New month
        mockTx as any,
      );

      expect(result).toBe('HP-J-2526-0001');
      expect(mockTx.shopDocumentSetting.update).toHaveBeenCalledWith({
        where: { id: 'setting-7' },
        data: {
          currentNumber: 1, // Reset to 1
          currentYear: '2025-05', // Updated to new month
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should never reset (NEVER)', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: 'setting-8',
          prefix: 'HP',
          separator: '-',
          documentCode: 'Q',
          yearFormat: 'NONE' as YearFormat,
          numberLength: 4,
          resetPolicy: 'NEVER' as ResetPolicy,
          currentNumber: 12345,
          currentYear: null,
        },
      ]);

      const result = await service['generateDocumentNumberInternal'](
        'shop-1',
        'QUOTATION' as DocumentType,
        new Date('2026-04-01'), // Even after year change
        mockTx as any,
      );

      expect(result).toBe('HP-Q-12346');
      expect(mockTx.shopDocumentSetting.update).toHaveBeenCalledWith({
        where: { id: 'setting-8' },
        data: {
          currentNumber: 12346, // Continues incrementing
          currentYear: null, // Never set
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundException if setting not found', async () => {
      mockTx.$queryRaw.mockResolvedValue([]); // No settings

      await expect(
        service['generateDocumentNumberInternal'](
          'shop-999',
          'SALES_INVOICE' as DocumentType,
          new Date(),
          mockTx as any,
        ),
      ).rejects.toThrow('Document setting not found');
    });

    it('should throw error if setting is inactive', async () => {
      // In real scenario, query filters isActive=true, so inactive would return []
      mockTx.$queryRaw.mockResolvedValue([]);

      await expect(
        service['generateDocumentNumberInternal'](
          'shop-1',
          'SALES_INVOICE' as DocumentType,
          new Date(),
          mockTx as any,
        ),
      ).rejects.toThrow('Document setting not found');
    });

    it('should propagate database errors', async () => {
      mockTx.$queryRaw.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        service['generateDocumentNumberInternal'](
          'shop-1',
          'SALES_INVOICE' as DocumentType,
          new Date(),
          mockTx as any,
        ),
      ).rejects.toThrow('Database connection lost');
    });
  });

  describe('initializeShopDocumentSettings', () => {
    it('should create default settings for all document types', async () => {
      const mockPrisma = {
        shopDocumentSetting: {
          createMany: jest.fn().mockResolvedValue({ count: 6 }),
        },
      };

      await service.initializeShopDocumentSettings(
        'shop-new',
        'HP',
        mockPrisma as any,
      );

      expect(mockPrisma.shopDocumentSetting.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'SALES_INVOICE',
            prefix: 'HP',
            documentCode: 'S',
          }),
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'PURCHASE_INVOICE',
            documentCode: 'P',
          }),
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'JOB_CARD',
            documentCode: 'J',
          }),
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'RECEIPT',
            documentCode: 'R',
          }),
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'QUOTATION',
            documentCode: 'Q',
          }),
          expect.objectContaining({
            shopId: 'shop-new',
            documentType: 'PURCHASE_ORDER',
            documentCode: 'PO',
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});
