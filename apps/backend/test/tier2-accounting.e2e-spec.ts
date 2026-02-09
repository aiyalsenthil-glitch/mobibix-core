import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PurchasesModule } from '../src/core/purchases/purchases.module';
import { ReportsHardeningModule } from '../src/core/reports/reports-hardening.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { StockService } from '../src/core/stock/stock.service';
import { PartiesService } from '../src/core/parties/parties.service';
import { JwtAuthGuard } from '../src/core/auth/guards/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';

describe('Tier 2 Accounting (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    purchase: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    party: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    paymentVoucher: {
      create: jest.fn(),
    },
    financialEntry: {
      create: jest.fn(),
    },
    shopProduct: {
      update: jest.fn(),
    },
  };

  const mockStockService = {
    recordStockIn: jest.fn(),
  };

  const mockPartiesService = {};

  const mockUser = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['ADMIN'],
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
        PurchasesModule,
        ReportsHardeningModule,
        CacheModule.register({ isGlobal: true }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(StockService)
      .useValue(mockStockService)
      .overrideProvider(PartiesService)
      .useValue(mockPartiesService)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Mimic global validation pipes if used in main.ts?
    // Ideally yes, but for now we focus on controller-service wiring.

    await app.init();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/purchases (POST)', () => {
    it('should create a purchase draft', () => {
      const createDto = {
        shopId: 'shop-1',
        supplierName: 'Test Supplier',
        invoiceNumber: 'INV-E2E-001',
        paymentMethod: 'CASH',
        items: [
          {
            shopProductId: 'prod-1',
            quantity: 5,
            purchasePrice: 100,
            description: 'E2E Item',
          },
        ],
      };

      mockPrismaService.purchase.findFirst.mockResolvedValue(null);
      mockPrismaService.purchase.create.mockResolvedValue({
        id: 'purchase-e2e-1',
        tenantId: 'tenant-1',
        ...createDto,
        grandTotal: 500,
        paidAmount: 0,
        status: 'DRAFT',
      });

      return request(app.getHttpServer())
        .post('/purchases')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual('purchase-e2e-1');
          expect(res.body.status).toEqual('DRAFT');
        });
    });
  });

  describe('/purchases/:id/submit (POST)', () => {
    it('should submit a purchase draft', () => {
      const purchaseId = 'purchase-e2e-1';

      // Mock findUnique for validation and transaction double-check
      mockPrismaService.purchase.findUnique.mockResolvedValue({
        id: purchaseId,
        tenantId: 'tenant-1',
        shopId: 'shop-1',
        status: 'DRAFT',
        invoiceDate: new Date(),
        totalGst: 0,
        grandTotal: 500,
        items: [
          {
            shopProductId: 'prod-1',
            quantity: 5,
            purchasePrice: 100,
          },
        ],
      });

      // Update mock
      mockPrismaService.purchase.update.mockResolvedValue({
        id: purchaseId,
        status: 'SUBMITTED',
      });

      return request(app.getHttpServer())
        .post(`/purchases/${purchaseId}/submit`)
        .expect(200); // Controller returns void? 200 or 201? Usually 201 for POST, but validation might be 200.
      // Actually atomicPurchaseSubmit returns void, so default might be 201 or 200 depending on framework. Supertest handles checking.
    });
  });

  describe('/reports/receivables-aging (GET)', () => {
    it('should return aging report', () => {
      // Since this is integration, we mock the findMany inside AgingService (via Prisma)
      // Or we can mock the Service method if we overrode AgingService, but we overrode Prisma.

      // Mock findMany for getting invoices
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/reports/receivables-aging')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.buckets).toBeDefined();
        });
    });
  });
});
