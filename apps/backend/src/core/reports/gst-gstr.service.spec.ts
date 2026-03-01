import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GSTVerificationService } from '../purchases/gst-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { GSTR2Service } from '../reports/gstr2.service';
import { PurchaseStatus, PaymentMode } from '@prisma/client';

describe('GSTVerificationService - Tier-2 Hardening', () => {
  let service: GSTVerificationService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-ca-123';

  const mockLegacyPurchase = {
    id: 'purchase-legacy',
    tenantId: mockTenantId,
    shopId: 'shop-123',
    invoiceNumber: 'PUR-LEGACY-001',
    invoiceDate: new Date('2024-06-01'),
    supplierName: 'Legacy Supplier',
    supplierGstin: '12AABCU9603R1Z5',
    amount: 10000,
    subTotal: 8200,
    totalGst: 1800,
    cgst: 0, // Not populated
    sgst: 0, // Not populated
    igst: 0, // Not populated
    isLegacyGstApproximation: true,
    gstApproximationReason: 'Backfilled from purchase receipt',
    verifiedAt: null,
    verifiedByUserId: null,
    status: PurchaseStatus.DRAFT,
    paymentMethod: PaymentMode.CASH,
    paymentReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
    globalSupplierId: null,
    supplierId: 'sup-123',
    dueDate: null,
    outstanding: 10000,
    notes: null,
    currency: 'INR',
    isPaid: false,
    paidAmount: 0,
    discountAmount: 0,
    shippingAmount: 0,
    otherCharges: 0,
    roundOff: 0,
    isTaxInclusive: false,
    itcEligible: true,
    grandTotal: 10000,
    cashAmount: 10000,
    bankAmount: 0,
    upiAmount: 0,
    cardAmount: 0,
    referenceId: null,
    referenceType: null,
    purchaseType: 'GST',
    taxInclusive: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GSTVerificationService,
        {
          provide: PrismaService,
          useValue: {
            purchase: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            purchaseItem: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GSTVerificationService>(GSTVerificationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getUnverifiedLegacy', () => {
    it('should return all unverified legacy GST purchases', async () => {
      jest
        .spyOn(prisma.purchase, 'findMany')
        .mockResolvedValueOnce([mockLegacyPurchase]);

      const result = await service.getUnverifiedLegacy(mockTenantId);

      expect(result.totalCount).toBe(1);
      expect(result.purchases[0].invoiceNumber).toBe('PUR-LEGACY-001');
      expect(result.purchases[0].reason).toBe(
        'Backfilled from purchase receipt',
      );
      expect(prisma.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            isLegacyGstApproximation: true,
            verifiedAt: null,
          }),
        }),
      );
    });

    it('should return empty if all legacy data verified', async () => {
      jest.spyOn(prisma.purchase, 'findMany').mockResolvedValueOnce([]);

      const result = await service.getUnverifiedLegacy(mockTenantId);

      expect(result.totalCount).toBe(0);
      expect(result.actionRequired).toContain('All legacy GST data verified');
    });
  });

  describe('verifyLegacyGST', () => {
    it('should verify legacy GST amounts and mark as verified', async () => {
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockLegacyPurchase);
      jest.spyOn(prisma.purchase, 'update').mockResolvedValueOnce({
        ...mockLegacyPurchase,
        cgst: 900,
        sgst: 900,
        igst: 0,
        isLegacyGstApproximation: false,
        verifiedAt: new Date(),
        verifiedByUserId: mockUserId,
      } as any);

      jest.spyOn(prisma.purchaseItem, 'findMany').mockResolvedValueOnce([
        {
          id: 'item-1',
          createdAt: new Date(),
          purchaseId: 'purchase-legacy',
          shopProductId: 'prod-1',
          description: 'Legacy Item',
          quantity: 100,
          purchasePrice: 100,
          totalAmount: 10000,
          taxAmount: 1800,
          hsnSac: '8701',
          gstRate: 18,
          cgstRate: 9 as any,
          sgstRate: 9 as any,
          igstRate: 0 as any,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
        },
      ]);

      jest
        .spyOn(prisma.purchaseItem, 'update')
        .mockResolvedValueOnce({} as any);

      await service.verifyLegacyGST(
        mockTenantId,
        mockLegacyPurchase.id,
        900,
        900,
        0,
        mockUserId,
      );

      expect(prisma.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cgst: 900,
            sgst: 900,
            igst: 0,
            isLegacyGstApproximation: false,
            verifiedByUserId: mockUserId,
            verifiedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject verification if total GST mismatch', async () => {
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockLegacyPurchase);

      await expect(
        service.verifyLegacyGST(
          mockTenantId,
          mockLegacyPurchase.id,
          500, // Wrong - total = 500, expected 1800
          500,
          500,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if purchase not legacy', async () => {
      const currentPurchase = {
        ...mockLegacyPurchase,
        isLegacyGstApproximation: false,
      };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(currentPurchase);

      await expect(
        service.verifyLegacyGST(
          mockTenantId,
          currentPurchase.id,
          900,
          900,
          0,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateGSTRates', () => {
    it('should validate standard GST rates (0%, 5%, 9%, 18%)', () => {
      expect(service.validateGSTRates(0, 0, 0)).toBe(true);
      expect(service.validateGSTRates(5, 5, 10)).toBe(true);
      expect(service.validateGSTRates(9, 9, 18)).toBe(true);
      expect(service.validateGSTRates(18, 18, 36)).toBe(false); // CGST+SGST != IGST
    });

    it('should reject invalid rates', () => {
      expect(service.validateGSTRates(7, 7, 14)).toBe(false); // 7% not standard
      expect(service.validateGSTRates(9, 9, 20)).toBe(false); // Rate mismatch
    });
  });
});

describe('GSTR2Service - ITC Tracking & Legacy Exclusion', () => {
  let service: GSTR2Service;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';

  const mockVerifiedPurchase = {
    id: 'purchase-verified',
    tenantId: mockTenantId,
    shopId: 'shop-123',
    invoiceNumber: 'PUR-001',
    invoiceDate: new Date('2024-11-01'),
    supplierName: 'Supplier A',
    supplierGstin: '12AABCU9603R1Z5',
    amount: 10000,
    subTotal: 8200,
    cgst: 900,
    sgst: 900,
    igst: 0,
    totalGst: 1800,
    isLegacyGstApproximation: false,
    verifiedAt: new Date('2024-12-01'),
    status: PurchaseStatus.SUBMITTED,
    paymentMethod: PaymentMode.CASH,
    paymentReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    globalSupplierId: null,
    supplierId: 'sup-123',
    dueDate: null,
    outstanding: 0,
    notes: null,
    currency: 'INR',
    isPaid: true,
    paidAmount: 10000,
    discountAmount: 0,
    shippingAmount: 0,
    otherCharges: 0,
    roundOff: 0,
    isTaxInclusive: false,
    itcEligible: true,
    grandTotal: 10000,
    cashAmount: 10000,
    bankAmount: 0,
    upiAmount: 0,
    cardAmount: 0,
    referenceId: null,
    referenceType: null,
    purchaseType: 'GST',
    taxInclusive: false,
    gstApproximationReason: null,
    verifiedByUserId: 'admin-123',
    items: [
      {
        id: 'item-1',
        purchaseId: 'purchase-verified',
        shopProductId: 'prod-1',
        itemName: 'Item 1',
        description: 'Test Item',
        quantity: 100,
        purchasePrice: 100,
        totalAmount: 10000,
        taxAmount: 1800,
        gstRate: 18,
        cgstRate: 9 as any,
        sgstRate: 9 as any,
        igstRate: 0 as any,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockUnverifiedLegacyPurchase = {
    id: 'purchase-legacy-unverified',
    tenantId: mockTenantId,
    shopId: 'shop-123',
    invoiceNumber: 'PUR-LEGACY-001',
    invoiceDate: new Date('2024-06-01'),
    supplierName: 'Legacy Supplier',
    supplierGstin: null,
    amount: 5000,
    subTotal: 4100,
    cgst: 450,
    sgst: 450,
    igst: 0,
    totalGst: 900,
    isLegacyGstApproximation: true,
    verifiedAt: null,
    status: PurchaseStatus.SUBMITTED,
    paymentMethod: PaymentMode.CASH,
    paymentReference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    globalSupplierId: null,
    supplierId: 'sup-legacy-123',
    dueDate: null,
    outstanding: 5000,
    notes: null,
    currency: 'INR',
    isPaid: false,
    paidAmount: 0,
    discountAmount: 0,
    shippingAmount: 0,
    otherCharges: 0,
    roundOff: 0,
    isTaxInclusive: false,
    itcEligible: false,
    grandTotal: 5000,
    cashAmount: 5000,
    bankAmount: 0,
    upiAmount: 0,
    cardAmount: 0,
    referenceId: null,
    referenceType: null,
    purchaseType: 'GST',
    taxInclusive: false,
    gstApproximationReason: 'Legacy',
    verifiedByUserId: null,
    items: [
      {
        id: 'item-2',
        purchaseId: 'purchase-legacy-unverified',
        shopProductId: 'prod-2',
        itemName: 'Item 2',
        description: 'Test Item',
        quantity: 50,
        purchasePrice: 100,
        totalAmount: 5000,
        taxAmount: 900,
        gstRate: 18,
        cgstRate: 9 as any,
        sgstRate: 9 as any,
        igstRate: 0 as any,
        cgstAmount: 450,
        sgstAmount: 450,
        igstAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GSTR2Service,
        {
          provide: PrismaService,
          useValue: {
            purchase: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GSTR2Service>(GSTR2Service);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generatePurchaseRegister', () => {
    it('should include verified purchases in ITC, exclude unverified legacy', async () => {
      jest
        .spyOn(prisma.purchase, 'findMany')
        .mockResolvedValueOnce([
          mockVerifiedPurchase,
          mockUnverifiedLegacyPurchase,
        ]);

      const result = await service.generatePurchaseRegister(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(result.totalPurchases).toBe(2);
      expect(result.itcEligibleCount).toBe(1); // Only verified
      expect(result.legacyUnverifiedCount).toBe(1);
      expect(result.totalITC).toBe(1800); // Only verified purchase ITC
    });

    it('should exclude unverified legacy GST from ITC calculation', async () => {
      jest
        .spyOn(prisma.purchase, 'findMany')
        .mockResolvedValueOnce([mockUnverifiedLegacyPurchase]);

      const result = await service.generatePurchaseRegister(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      // Unverified legacy purchases are SKIPPED from records (not included at all)
      expect(result.records.length).toBe(0); // No records returned
      expect(result.legacyUnverifiedCount).toBe(1); // But counted in metadata
      expect(result.totalITC).toBe(0); // No ITC from unverified legacy
    });
  });

  describe('verifyGSTR2Consistency', () => {
    it('should flag unverified legacy GST in audit', async () => {
      jest
        .spyOn(prisma.purchase, 'findMany')
        .mockResolvedValueOnce([mockUnverifiedLegacyPurchase]);

      const result = await service.verifyGSTR2Consistency(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(result.isConsistent).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('not verified by CA');
    });

    it('should verify 180-day ITC window', async () => {
      const oldPurchase = {
        ...mockVerifiedPurchase,
        invoiceDate: new Date('2023-01-01'),
      };
      jest
        .spyOn(prisma.purchase, 'findMany')
        .mockResolvedValueOnce([oldPurchase]);

      const result = await service.verifyGSTR2Consistency(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );

      expect(result.isConsistent).toBe(false);
      expect(result.issues.some((issue) => issue.includes('180'))).toBe(true);
    });
  });
});
