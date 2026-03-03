import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GRNService } from './grn.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { GRNStatus, POStatus, Prisma } from '@prisma/client';

describe('GRNService', () => {
  let service: GRNService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-1';
  const mockShopId = 'shop-1';
  const mockUserId = 'user-1';
  const mockOwnerId = 'owner-1';

  const mockProduct = {
    id: 'prod-1',
    quantity: 10,
    totalValue: BigInt(1000), // 10 * 100
    lastPurchasePrice: 100,
    avgCost: 100,
  };

  const mockPOItem = {
    id: 'po-item-1',
    poId: 'po-1',
    quantity: 10,
    receivedQuantity: 0,
  };

  const mockGRN = {
    id: 'grn-1',
    tenantId: mockTenantId,
    shopId: mockShopId,
    poId: 'po-1',
    grnNumber: 'GRN-001',
    status: GRNStatus.DRAFT,
    isVarianceOverridden: false,
    items: [
      {
        id: 'grn-item-1',
        poItemId: 'po-item-1',
        shopProductId: 'prod-1',
        receivedQuantity: 5,
        confirmedPrice: 100,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GRNService,
        {
          provide: PrismaService,
          useValue: {
            purchaseOrder: { findUnique: jest.fn(), update: jest.fn() },
            gRN: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
            shopProduct: { update: jest.fn() },
            stockLedger: { create: jest.fn() },
            purchaseOrderItem: { update: jest.fn(), findMany: jest.fn() },
            $transaction: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: StockService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GRNService>(GRNService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('confirm', () => {
    it('should successfully confirm GRN and update stock/WAC', async () => {
      // Setup Initial State
      jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce({
        ...mockGRN,
        po: { items: [mockPOItem] },
      } as any);

      // Transaction Mock
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        return callback(prisma);
      });

      // Status Check Inside Transaction
      jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(mockGRN as any);

      // Product Mock
      jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockProduct]);

      // PO Items Mock
      jest.spyOn(prisma.purchaseOrderItem, 'findMany').mockResolvedValueOnce([{
          ...mockPOItem,
          receivedQuantity: 5 // Half received
      }] as any);

      // Final GRN Mock
      jest.spyOn(prisma.gRN, 'update').mockResolvedValueOnce({
        ...mockGRN,
        status: GRNStatus.CONFIRMED,
      } as any);

      const result = await service.confirm(mockTenantId, 'grn-1', { id: mockUserId, role: 'STAFF' });

      expect(result.status).toBe(GRNStatus.CONFIRMED);
      expect(prisma.shopProduct.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({
          quantity: 15,
          lastPurchasePrice: 100,
        }),
      });
      // 1000 (old) + 5*100 (new) = 1500 / 15 = 100
      expect(prisma.shopProduct.update).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
              avgCost: 100
          })
      });
    });

    it('should throw BadRequestException if variance is too high without override', async () => {
        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce({
            ...mockGRN,
            items: [{
                ...mockGRN.items[0],
                confirmedPrice: 200 // > 1.2 * 100
            }]
        } as any);

        jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback(prisma);
        });

        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(mockGRN as any);
        jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockProduct]);

        await expect(service.confirm(mockTenantId, 'grn-1', { id: mockUserId, role: 'STAFF' }))
            .rejects.toThrow(BadRequestException);
    });

    it('should allow high variance if overridden by OWNER', async () => {
        const overriddenGRN = { ...mockGRN, isVarianceOverridden: true, items: [{ ...mockGRN.items[0], confirmedPrice: 200 }] };
        
        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce({
            ...overriddenGRN,
            po: { items: [mockPOItem] }
        } as any);

        jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback(prisma);
        });

        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(overriddenGRN as any);
        jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockProduct]);
        jest.spyOn(prisma.purchaseOrderItem, 'findMany').mockResolvedValueOnce([{...mockPOItem, receivedQuantity: 5}] as any);
        jest.spyOn(prisma.gRN, 'update').mockResolvedValueOnce({...overriddenGRN, status: GRNStatus.CONFIRMED} as any);

        const result = await service.confirm(mockTenantId, 'grn-1', { id: mockOwnerId, role: 'OWNER' });
        expect(result.status).toBe(GRNStatus.CONFIRMED);
    });

    it('should throw ForbiddenException if high variance overridden by non-OWNER', async () => {
        const overriddenGRN = { ...mockGRN, isVarianceOverridden: true, items: [{ ...mockGRN.items[0], confirmedPrice: 200 }] };
        
        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(overriddenGRN as any);

        jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback(prisma);
        });

        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(overriddenGRN as any);
        jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockProduct]);

        await expect(service.confirm(mockTenantId, 'grn-1', { id: mockUserId, role: 'STAFF' }))
            .rejects.toThrow(ForbiddenException);
    });

    it('should update PO status to RECEIVED when all items are fully received', async () => {
        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce({
            ...mockGRN,
            items: [
                {
                    ...mockGRN.items[0],
                    receivedQuantity: 10, // Full qty
                }
            ],
            po: { items: [mockPOItem] }
        } as any);

        jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
            return callback(prisma);
        });

        jest.spyOn(prisma.gRN, 'findUnique').mockResolvedValueOnce(mockGRN as any);
        jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockProduct]);
        
        // Mock all items received
        jest.spyOn(prisma.purchaseOrderItem, 'findMany').mockResolvedValueOnce([{
            ...mockPOItem,
            receivedQuantity: 10,
            quantity: 10
        }] as any);

        jest.spyOn(prisma.gRN, 'update').mockResolvedValueOnce({...mockGRN, status: GRNStatus.CONFIRMED} as any);

        await service.confirm(mockTenantId, 'grn-1', { id: mockUserId, role: 'STAFF' });

        expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: POStatus.RECEIVED }
        });
    });
  });
});
