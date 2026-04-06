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
import { PaymentMode, PurchaseStatus, Prisma } from '@prisma/client';

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
    invoiceDate: new Date(Date.now() - 30 * 86400000), // 30 days ago (within ITC window)
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
    exchangeRate: new Prisma.Decimal(1.0),
    poId: null,
    taxDetails: null,
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
      taxDetails: null,
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
              findMany: jest.fn(),
              count: jest.fn(),
              fields: {
                paidAmount: 'paidAmount', // Dummy for grandTotal: { gt: this.prisma.purchase.fields.paidAmount }
              } as any,
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
    it('should submit a valid purchase (financial-only)', async () => {
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);
      jest
        .spyOn(prisma.purchaseItem, 'findMany')
        .mockResolvedValueOnce(mockItems as any);

      // Mock transaction
      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback) => {
          return callback(prisma);
        });

      await service.atomicPurchaseSubmit(mockTenantId, mockPurchaseId);

      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: mockPurchaseId },
        data: { status: 'SUBMITTED' },
      });
      
      // Verify no stock ledger creation (now handled by GRN)
      expect(prisma.stockLedger.create).not.toHaveBeenCalled();
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
  });

  describe('getPayablesAging', () => {
    it('should calculate aging buckets correctly', async () => {
      const today = new Date();
      const mockPurchases = [
        {
          id: 'p1',
          invoiceNumber: 'INV1',
          supplierName: 'S1',
          grandTotal: 100000,
          paidAmount: 0,
          dueDate: new Date(today.getTime() + 86400000), // Future (Current)
          invoiceDate: today,
        },
        {
          id: 'p2',
          invoiceNumber: 'INV2',
          supplierName: 'S2',
          grandTotal: 50000,
          paidAmount: 10000,
          dueDate: new Date(today.getTime() - 10 * 86400000), // 10 days ago (1-30)
          invoiceDate: today,
        },
        {
          id: 'p3',
          invoiceNumber: 'INV3',
          supplierName: 'S3',
          grandTotal: 200000,
          paidAmount: 0,
          dueDate: new Date(today.getTime() - 100 * 86400000), // 100 days ago (over90)
          invoiceDate: today,
        },
      ];

      jest.spyOn(prisma.purchase, 'findMany').mockResolvedValueOnce(mockPurchases as any);

      const report = await service.getPayablesAging(mockTenantId);

      expect(report.current).toBe(1000);
      expect(report['1-30']).toBe(400); // 500 - 100
      expect(report.over90).toBe(2000);
      expect(report.totalOutstanding).toBe(3400);
    });
  });
});
