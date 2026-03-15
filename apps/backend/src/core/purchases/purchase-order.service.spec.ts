import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus, Prisma } from '@prisma/client';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-1';
  const mockShopId = 'shop-1';

  const mockSupplier = {
    id: 'supp-1',
    supplierProfile: {
      paymentDueDays: 45,
      preferredCurrency: 'USD',
    },
  };

  const mockPO = {
    id: 'po-1',
    tenantId: mockTenantId,
    shopId: mockShopId,
    poNumber: 'PO-001',
    status: POStatus.DRAFT,
    currency: 'INR',
    exchangeRate: new Prisma.Decimal(1.0),
    paymentDueDays: 30,
    items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        {
          provide: PrismaService,
          useValue: {
            purchaseOrder: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
            party: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a PO with supplier defaults', async () => {
      jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValueOnce(null);
      jest.spyOn(prisma.party, 'findUnique').mockResolvedValueOnce(mockSupplier as any);
      jest.spyOn(prisma.purchaseOrder, 'create').mockImplementation(((args: any) => ({
        id: 'po-new',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        notes: args.data.notes || null,
        expectedDelivery: args.data.expectedDelivery || null,
        items: [],
      }) as any) as any);

      const dto = {
        shopId: mockShopId,
        poNumber: 'PO-NEW',
        globalSupplierId: 'supp-1',
        supplierName: 'Supp 1',
        items: [{ description: 'Item 1', quantity: 10, estimatedPrice: 100 }],
      };

      const result = await service.create(mockTenantId, dto as any);

      expect(result.paymentDueDays).toBe(45);
      expect(result.currency).toBe('USD');
      expect(result.totalEstimatedAmount).toBe(1000); // 10 * 100
    });

    it('should throw ConflictException if PO number already exists', async () => {
      jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValueOnce(mockPO as any);

      const dto = {
        shopId: mockShopId,
        poNumber: 'PO-001',
        supplierName: 'Supp 1',
        items: [],
      };

      await expect(service.create(mockTenantId, dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('transitionStatus', () => {
    it('should allow DRAFT to ORDERED transition', async () => {
      jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValueOnce(mockPO as any);
      jest.spyOn(prisma.purchaseOrder, 'update').mockImplementation(((args: any) => ({
        ...mockPO,
        status: args.data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        notes: null,
        expectedDelivery: null,
        totalEstimatedAmount: 1000,
        supplierName: 'Supp 1',
        globalSupplierId: 'supp-1',
        items: [],
      }) as any) as any);

      const result = await service.transitionStatus(mockTenantId, 'po-1', POStatus.ORDERED, 'user-1');
      expect(result.status).toBe(POStatus.ORDERED);
    });

    it('should throw BadRequestException for invalid transition (DRAFT to RECEIVED)', async () => {
      jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValueOnce(mockPO as any);

      await expect(service.transitionStatus(mockTenantId, 'po-1', POStatus.RECEIVED, 'user-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if PO not found', async () => {
      jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValueOnce(null);

      await expect(service.transitionStatus(mockTenantId, 'po-1', POStatus.ORDERED, 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
