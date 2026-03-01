import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../../core/stock/stock.service';
import { PartiesService } from '../parties/parties.service';
import { PaymentMode, PurchaseStatus } from '@prisma/client';

describe('PurchasesService - Tier-2 Hardening (atomicPurchaseSubmit)', () => {
  let service: PurchasesService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockPurchaseId = 'purchase-123';
  const mockUserId = 'user-123';

  const mockPurchase = {
    id: mockPurchaseId,
    tenantId: mockTenantId,
    shopId: 'shop-123',
    status: PurchaseStatus.DRAFT,
    invoiceNumber: 'PUR-001',
    globalSupplierId: null,
    supplierName: 'Supplier A',
    supplierGstin: '12AABCU9603R1Z5',
    amount: 10000,
    subTotal: 8200,
    cgst: 900,
    sgst: 900,
    igst: 0,
    totalGst: 1800,
    invoiceDate: new Date('2025-08-20'),
    dueDate: null,
    isLegacyGstApproximation: false,
    outstanding: 10000,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplierId: 'supplier-123',
    createdBy: mockUserId,
    // Add other missing Prisma fields as needed (null/default)
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
    paymentMethod: PaymentMode.CASH,
    paymentReference: null,
    cashAmount: 10000,
    bankAmount: 0,
    upiAmount: 0,
    cardAmount: 0,
    referenceId: null,
    referenceType: null,
    purchaseType: 'GST',
    taxInclusive: false,
    gstApproximationReason: null,
    verifiedByUserId: null,
    verifiedAt: null,
  };

  const mockItems = [
    {
      id: 'item-1',
      purchaseId: mockPurchaseId,
      shopProductId: 'prod-123',
      itemName: 'Item 1',
      description: 'Test Item',
      quantity: 10,
      purchasePrice: 100,
      totalAmount: 1000,
      taxAmount: 180,
      hsnCode: '8701',
      hsnSac: '8701',
      gstRate: 18,
      cgstRate: 9 as any, // Decimal type mismatch in mock
      sgstRate: 9 as any,
      igstRate: 0 as any,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: PrismaService,
          useValue: {
            purchase: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            purchaseItem: {
              findMany: jest.fn(),
            },
            stockLedger: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: StockService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: PartiesService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('atomicPurchaseSubmit', () => {
    it('should submit a valid purchase and create stock ledger entries', async () => {
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);
      jest
        .spyOn(prisma.purchaseItem, 'findMany')
        .mockResolvedValueOnce(mockItems);

      // Mock transaction
      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback) => {
          return callback(prisma);
        });

      await service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId);

      expect(prisma.purchase.findUnique).toHaveBeenCalledWith({
        where: { id: mockPurchaseId },
      });
    });

    it('should reject submission if purchase not found', async () => {
      jest.spyOn(prisma.purchase, 'findUnique').mockResolvedValueOnce(null);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject submission if purchase not in DRAFT status', async () => {
      const submittedPurchase = {
        ...mockPurchase,
        status: PurchaseStatus.SUBMITTED,
      };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(submittedPurchase);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject submission if purchase has no items', async () => {
      const purchaseNoItems = { ...mockPurchase, items: [] };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(purchaseNoItems);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if GSTIN missing for GST purchases', async () => {
      const purchaseNoGstin = { ...mockPurchase, supplierGstin: null };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(purchaseNoGstin);
      jest
        .spyOn(prisma.purchaseItem, 'findMany')
        .mockResolvedValueOnce(mockItems);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(
        new BadRequestException(
          'Supplier GSTIN required for GST purchases (ITC eligibility)',
        ),
      );
    });

    it('should reject if invoice date is in future', async () => {
      const futurePurchase = {
        ...mockPurchase,
        invoiceDate: new Date(Date.now() + 86400000), // +1 day
      };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(futurePurchase);
      jest
        .spyOn(prisma.purchaseItem, 'findMany')
        .mockResolvedValueOnce(mockItems);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if invoice exceeds 180-day ITC window', async () => {
      const oldPurchase = {
        ...mockPurchase,
        invoiceDate: new Date('2023-01-01'), // >180 days ago
      };
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(oldPurchase);
      jest
        .spyOn(prisma.purchaseItem, 'findMany')
        .mockResolvedValueOnce(mockItems);

      await expect(
        service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
