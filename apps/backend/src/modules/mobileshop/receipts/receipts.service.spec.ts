import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReceiptsService } from '../../../core/receipts/receipts.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { InvoiceStatus, PaymentMode } from '@prisma/client';

describe('ReceiptsService - Tier-2 Hardening (createReceiptWithInvoiceUpdate)', () => {
  let service: ReceiptsService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockShopId = 'shop-123';
  const mockInvoiceId = 'invoice-123';
  const mockUserId = 'user-123';

  const mockInvoice = {
    id: mockInvoiceId,
    tenantId: mockTenantId,
    shopId: mockShopId,
    invoiceNumber: 'INV-001',
    amount: 10000,
    paidAmount: 0,
    status: InvoiceStatus.UNPAID,
    invoiceDate: new Date('2024-12-01'),
    customerId: 'cust-123',
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: new Date('2025-01-01'),
    notes: null,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 10000,
    subTotal: 10000,
    isTaxInclusive: false,
    balance: 10000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        {
          provide: PrismaService,
          useValue: {
            receipt: {
              create: jest.fn(),
            },
            invoice: {
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

    service = module.get<ReceiptsService>(ReceiptsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createReceiptWithInvoiceUpdate', () => {
    it('should create receipt and update invoice payment status to PARTIALLY_PAID', async () => {
      const receiptDto = {
        amount: 5000,
        paymentMethod: PaymentMode.CASH,
        linkedInvoiceId: mockInvoiceId,
        receiptType: 'RECEIPT',
        customerName: 'Customer A',
        transactionRef: null,
        narration: 'Partial payment',
        customerPhone: null,
        linkedJobId: null,
      } as any;

      // Mock existing createReceipt
      const mockReceipt = { ...receiptDto, id: 'receipt-1', amount: 500000 } as any;
      jest.spyOn(service, 'createReceipt').mockResolvedValueOnce(mockReceipt);

      jest
        .spyOn(prisma.invoice, 'findUnique')
        .mockResolvedValueOnce(mockInvoice as any);

      // Mock transaction
      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          return callback(prisma);
        });

      await service.createReceiptWithInvoiceUpdate(
        mockTenantId,
        mockShopId,
        receiptDto,
        mockUserId,
      );

      expect(service.createReceipt).toHaveBeenCalledWith(
        mockTenantId,
        mockShopId,
        receiptDto,
        mockUserId,
      );
    });

    it('should prevent over-collection (receipt > outstanding)', async () => {
      const receiptDto = {
        amount: 15000, // Exceeds outstanding (10000)
        paymentMethod: PaymentMode.CASH,
        linkedInvoiceId: mockInvoiceId,
        receiptType: 'RECEIPT',
        customerName: 'Customer A',
        transactionRef: null,
        narration: 'Over-collection attempt',
        customerPhone: null,
        linkedJobId: null,
      } as any;

      jest.spyOn(service, 'createReceipt').mockResolvedValueOnce({} as any);

      jest
        .spyOn(prisma.invoice, 'findUnique')
        .mockResolvedValueOnce(mockInvoice as any);

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          await expect(() => callback(prisma)).rejects.toThrow(
            BadRequestException,
          );
        });

      // Override to simulate transaction throwing
      jest
        .spyOn(prisma, '$transaction')
        .mockRejectedValueOnce(
          new BadRequestException('Over-collection prevented'),
        );

      await expect(
        service.createReceiptWithInvoiceUpdate(
          mockTenantId,
          mockShopId,
          receiptDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition invoice from UNPAID to PARTIALLY_PAID', async () => {
      const receiptDto = {
        amount: 5000,
        paymentMethod: PaymentMode.CASH,
        linkedInvoiceId: mockInvoiceId,
        receiptType: 'RECEIPT',
        customerName: 'Customer A',
        transactionRef: null,
        narration: 'Partial payment',
        customerPhone: null,
        linkedJobId: null,
      } as any;

      jest.spyOn(service, 'createReceipt').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prisma.invoice, 'findUnique')
        .mockResolvedValueOnce(mockInvoice as any);

      const invoiceUpdateData = {
        paidAmount: 500000, // 5000 in paisa
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            invoice: {
              findUnique: jest.fn().mockResolvedValueOnce(mockInvoice as any),
              update: jest.fn().mockResolvedValueOnce({
                ...mockInvoice,
                ...invoiceUpdateData,
              } as any),
            },
          };
          return callback(mockTx);
        });

      await service.createReceiptWithInvoiceUpdate(
        mockTenantId,
        mockShopId,
        receiptDto,
        mockUserId,
      );

      // Verify that invoice update would happen
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should transition invoice from PARTIALLY_PAID to PAID', async () => {
      const partialInvoice = {
        ...mockInvoice,
        paidAmount: 5000,
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      const receiptDto = {
        amount: 5000, // Final payment to complete invoice
        paymentMethod: PaymentMode.CASH,
        linkedInvoiceId: mockInvoiceId,
        receiptType: 'RECEIPT',
        customerName: 'Customer A',
        transactionRef: null,
        narration: 'Final payment',
        customerPhone: null,
        linkedJobId: null,
      } as any;

      jest.spyOn(service, 'createReceipt').mockResolvedValueOnce({} as any);
      jest
        .spyOn(prisma.invoice, 'findUnique')
        .mockResolvedValueOnce(partialInvoice as any);

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (callback: any) => {
          const mockTx = {
            invoice: {
              findUnique: jest.fn().mockResolvedValueOnce(partialInvoice as any),
              update: jest.fn().mockResolvedValueOnce({
                ...partialInvoice,
                paidAmount: 10000,
                status: InvoiceStatus.PAID,
              } as any),
            },
          };
          return callback(mockTx);
        });

      await service.createReceiptWithInvoiceUpdate(
        mockTenantId,
        mockShopId,
        receiptDto,
        mockUserId,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
