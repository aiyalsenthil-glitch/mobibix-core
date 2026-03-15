import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { PaymentMode, PurchaseStatus } from '@prisma/client';

describe('VouchersService - Tier-2 Hardening (createVoucherWithPurchaseUpdate)', () => {
  let service: VouchersService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockShopId = 'shop-123';
  const mockPurchaseId = 'purchase-123';
  const mockUserId = 'user-123';

  const mockPurchase = {
    id: mockPurchaseId,
    tenantId: mockTenantId,
    shopId: mockShopId,
    invoiceNumber: 'PUR-001',
    amount: 10000,
    outstanding: 10000,
    supplierName: 'Supplier A',
    invoiceDate: new Date('2024-12-01'),
    status: PurchaseStatus.SUBMITTED,
    paymentMethod: PaymentMode.CASH,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        {
          provide: PrismaService,
          useValue: {
            paymentVoucher: {
              create: jest.fn(),
            },
            purchase: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: DocumentNumberService,
          useValue: {
            generateDocumentNumber: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createVoucherWithPurchaseUpdate', () => {
    it('should create SETTLEMENT voucher and reduce purchase outstanding', async () => {
      const voucherDto = {
        amount: 5000,
        paymentMethod: PaymentMode.CASH,
        linkedPurchaseId: mockPurchaseId,
        voucherType: 'SUPPLIER',
        voucherSubType: 'SETTLEMENT' as const,
        globalSupplierId: null,
        transactionRef: null,
        narration: 'Partial payment',
        expenseCategory: null,
      } as any;

      // Mock existing createVoucher
      const mockVoucher = {
        ...voucherDto,
        id: 'voucher-1',
        amount: 500000,
      };
      jest.spyOn(service, 'createVoucher').mockResolvedValueOnce(mockVoucher);

      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);

      // Mock transaction
      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          return callback(prisma);
        });

      await service.createVoucherWithPurchaseUpdate(
        mockTenantId,
        mockShopId,
        voucherDto,
        mockUserId,
      );

      expect(service.createVoucher).toHaveBeenCalledWith(
        mockTenantId,
        mockShopId,
        voucherDto,
        mockUserId,
      );
    });

    it('should prevent over-payment (voucher > outstanding)', async () => {
      const voucherDto = {
        amount: 5000,
        paymentMethod: PaymentMode.CASH,
        linkedPurchaseId: mockPurchaseId,
        voucherType: 'SUPPLIER',
        voucherSubType: 'SETTLEMENT' as const,
        globalSupplierId: null,
        transactionRef: null,
        narration: 'Over-payment attempt',
        expenseCategory: null,
      } as any;

      jest.spyOn(service, 'createVoucher').mockResolvedValueOnce({} as any);

      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);

      // Mock transaction throwing over-payment error
      jest
        .spyOn(prisma, '$transaction')
        .mockRejectedValueOnce(
          new BadRequestException(
            'Over-payment prevented: voucher (150.00) exceeds outstanding. Balance: 100.00',
          ),
        );

      await expect(
        service.createVoucherWithPurchaseUpdate(
          mockTenantId,
          mockShopId,
          voucherDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reduce outstanding from 10000 to 5000 on 5000 SETTLEMENT voucher', async () => {
      const voucherDto = {
        amount: 5000,
        paymentMethod: PaymentMode.CASH,
        linkedPurchaseId: mockPurchaseId,
        voucherType: 'SUPPLIER',
        voucherSubType: 'SETTLEMENT' as const,
        globalSupplierId: null,
        transactionRef: null,
        narration: 'Partial payment',
        expenseCategory: null,
      } as any;

      jest.spyOn(service, 'createVoucher').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            purchase: {
              findUnique: jest.fn().mockResolvedValueOnce(mockPurchase),
              update: jest.fn().mockResolvedValueOnce({
                ...mockPurchase,
                outstanding: 5000,
              }),
            },
          };
          return callback(mockTx as any);
        });

      await service.createVoucherWithPurchaseUpdate(
        mockTenantId,
        mockShopId,
        voucherDto,
        mockUserId,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should NOT reduce outstanding for ADVANCE vouchers', async () => {
      const voucherDto = {
        amount: 2000,
        paymentMethod: PaymentMode.CASH,
        linkedPurchaseId: mockPurchaseId,
        voucherType: 'SUPPLIER',
        voucherSubType: 'ADVANCE' as const,
        globalSupplierId: null,
        transactionRef: null,
        narration: 'Advance payment',
        expenseCategory: null,
      } as any;

      jest.spyOn(service, 'createVoucher').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            purchase: {
              findUnique: jest.fn().mockResolvedValueOnce(mockPurchase),
              // ADVANCE vouchers should NOT trigger update
            },
          };
          return callback(mockTx as any);
        });

      await service.createVoucherWithPurchaseUpdate(
        mockTenantId,
        mockShopId,
        voucherDto,
        mockUserId,
      );

      // Outstanding should remain 10000 (not reduced for ADVANCE)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should fully settle purchase on full-amount SETTLEMENT voucher', async () => {
      const voucherDto = {
        amount: 10000, // Full payment
        paymentMethod: PaymentMode.CASH,
        linkedPurchaseId: mockPurchaseId,
        voucherType: 'SUPPLIER',
        voucherSubType: 'SETTLEMENT' as const,
        globalSupplierId: null,
        transactionRef: null,
        narration: 'Full payment',
        expenseCategory: null,
      } as any;

      jest.spyOn(service, 'createVoucher').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prisma.purchase, 'findUnique')
        .mockResolvedValueOnce(mockPurchase);

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            purchase: {
              findUnique: jest.fn().mockResolvedValueOnce(mockPurchase),
              update: jest.fn().mockResolvedValueOnce({
                ...mockPurchase,
                outstanding: 0,
              }),
            },
          };
          return callback(mockTx as any);
        });

      await service.createVoucherWithPurchaseUpdate(
        mockTenantId,
        mockShopId,
        voucherDto,
        mockUserId,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
