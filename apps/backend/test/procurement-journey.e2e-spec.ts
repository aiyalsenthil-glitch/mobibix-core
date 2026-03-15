import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PurchasesModule } from '../src/core/purchases/purchases.module';
import { CacheModule } from '@nestjs/cache-manager';
import { POStatus, GRNStatus, UserRole, Prisma } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtAuthGuard } from '../src/core/auth/guards/jwt-auth.guard';

describe('Procurement Journey (e2e)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    $queryRaw: jest.fn(),
    purchaseOrder: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    gRN: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    shopProduct: {
      update: jest.fn(),
    },
    stockLedger: {
      create: jest.fn(),
    },
    purchaseOrderItem: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    party: {
      findUnique: jest.fn(),
    },
    purchase: {
        findMany: jest.fn(),
        fields: { paidAmount: 'paidAmount' }
    }
  };

  const mockUser = {
    sub: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.OWNER,
  };

  const mockJwtGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PurchasesModule,
        CacheModule.register({ isGlobal: true }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Full Journey: PO -> Transition -> GRN -> Confirm', async () => {
    // 1. Create PO
    const poId = 'po-123';
    mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);
    mockPrismaService.purchaseOrder.create.mockResolvedValue({
      id: poId,
      poNumber: 'PO-001',
      status: POStatus.DRAFT,
      items: [],
    });

    const createPORes = await request(app.getHttpServer())
      .post('/purchase-orders')
      .send({
        shopId: 'shop-1',
        poNumber: 'PO-001',
        supplierName: 'Test Supplier',
        items: [{ description: 'Item 1', quantity: 10, estimatedPrice: 100 }],
      })
      .expect(201);

    expect(createPORes.body.id).toBe(poId);

    // 2. Transition PO to ORDERED
    mockPrismaService.purchaseOrder.findFirst.mockResolvedValue({
      id: poId,
      status: POStatus.DRAFT,
      tenantId: 'tenant-123',
    });
    mockPrismaService.purchaseOrder.update.mockResolvedValue({
      id: poId,
      status: POStatus.ORDERED,
      items: [],
    });

    await request(app.getHttpServer())
      .post(`/purchase-orders/${poId}/transition`)
      .send({ status: POStatus.ORDERED })
      .expect(200);

    // 3. Create GRN
    const grnId = 'grn-123';
    mockPrismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: poId,
      tenantId: 'tenant-123',
      items: [{ id: 'po-item-1' }],
    });
    mockPrismaService.gRN.findFirst.mockResolvedValue(null);
    mockPrismaService.gRN.create.mockResolvedValue({
      id: grnId,
      grnNumber: 'GRN-001',
      status: GRNStatus.DRAFT,
      items: [],
    });

    const createGRNRes = await request(app.getHttpServer())
      .post('/grns')
      .send({
        shopId: 'shop-1',
        poId: poId,
        grnNumber: 'GRN-001',
        items: [{ poItemId: 'po-item-1', shopProductId: 'prod-1', receivedQuantity: 10, confirmedPrice: 100 }],
      })
      .expect(201);

    expect(createGRNRes.body.id).toBe(grnId);

    // 4. Confirm GRN
    mockPrismaService.gRN.findUnique.mockResolvedValue({
      id: grnId,
      tenantId: 'tenant-123',
      status: GRNStatus.DRAFT,
      shopId: 'shop-1',
      grnNumber: 'GRN-001',
      poId: poId,
      items: [{ poItemId: 'po-item-1', shopProductId: 'prod-1', receivedQuantity: 10, confirmedPrice: 100 }],
    });
    mockPrismaService.$queryRaw.mockResolvedValue([{ id: 'prod-1', quantity: 0, "totalValue": BigInt(0), "lastPurchasePrice": 100 }]);
    mockPrismaService.purchaseOrderItem.findMany.mockResolvedValue([{ id: 'po-item-1', quantity: 10, receivedQuantity: 10 }]);
    mockPrismaService.gRN.update.mockResolvedValue({
      id: grnId,
      status: GRNStatus.CONFIRMED,
      items: [],
    });

    await request(app.getHttpServer())
      .post(`/grns/${grnId}/confirm`)
      .expect(200);

    expect(mockPrismaService.shopProduct.update).toHaveBeenCalled();
    expect(mockPrismaService.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: POStatus.RECEIVED }
    }));
  });
});
