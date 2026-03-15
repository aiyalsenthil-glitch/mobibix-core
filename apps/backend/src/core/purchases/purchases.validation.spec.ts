import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../../core/stock/stock.service';
import { PartiesService } from '../parties/parties.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('PurchasesService Validations', () => {
  let service: PurchasesService;
  let prisma: PrismaService;
  let stockService: StockService;
  let partiesService: PartiesService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(prisma)),
    purchase: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    purchaseItem: {
      findMany: jest.fn(),
    },
    party: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shopProduct: {
      update: jest.fn(),
    },
  };

  const mockStockService = {
    recordStockIn: jest.fn(),
  };

  const mockPartiesService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StockService, useValue: mockStockService },
        { provide: PartiesService, useValue: mockPartiesService },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    prisma = module.get<PrismaService>(PrismaService);
    stockService = module.get<StockService>(StockService);
    partiesService = module.get<PartiesService>(PartiesService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = 'tenant-1';
    const createDto: any = {
      shopId: 'shop-1',
      invoiceNumber: 'INV-001',
      supplierName: 'Test Supplier',
      items: [
        {
          shopProductId: 'prod-1',
          quantity: 10,
          purchasePrice: 100,
          description: 'Item 1',
        },
      ],
      paymentMethod: 'CASH',
    };

    it('should create a purchase successfully', async () => {
      mockPrismaService.purchase.findFirst.mockResolvedValue(null);
      mockPrismaService.purchase.create.mockResolvedValue({
        id: 'purchase-1',
        tenantId,
        ...createDto,
        grandTotal: 1000,
        paidAmount: 0,
        items: [],
        payments: [],
      });

      const result = await service.create(tenantId, createDto);

      expect(prisma.purchase.findFirst).toHaveBeenCalled();
      expect(prisma.purchase.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should fail if globalSupplierId provided but not found', async () => {
      const dtoWithSupplier = { ...createDto, globalSupplierId: 'supplier-1' };
      mockPrismaService.party.findUnique.mockResolvedValue(null);

      await expect(service.create(tenantId, dtoWithSupplier)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should fail if invoice number already exists for shop', async () => {
      mockPrismaService.purchase.findFirst.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('atomicPurchaseSubmit', () => {
    const tenantId = 'tenant-1';
    const purchaseId = 'purchase-1';

    const basePurchase = {
      id: purchaseId,
      tenantId,
      shopId: 'shop-1',
      status: 'DRAFT',
      invoiceDate: new Date(), // Today
      totalGst: 0,
      grandTotal: 1000,
      paidAmount: 0,
    };

    const baseItems = [
      {
        id: 'item-1',
        shopProductId: 'prod-1',
        quantity: 10,
        purchasePrice: 100,
      },
    ];

    it('should submit valid purchase successfully', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(basePurchase);
      mockPrismaService.purchaseItem.findMany.mockResolvedValue(baseItems);

      await service.atomicPurchaseSubmit(tenantId, purchaseId);

      expect(prisma.purchase.update).toHaveBeenCalledWith({
        where: { id: purchaseId },
        data: { status: 'SUBMITTED' },
      });
      // 🛡️ Corrected: Stock is NOT handled here anymore
      expect(stockService.recordStockIn).not.toHaveBeenCalled();
    });

    it('should fail if purchase not found', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(null);
      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail if status is not DRAFT', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...basePurchase,
        status: 'SUBMITTED',
      });
      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(ConflictException);
    });

    it('should fail if items are empty', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue(basePurchase);
      mockPrismaService.purchaseItem.findMany.mockResolvedValue([]); // Empty items
      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if GST > 0 but no supplier GSTIN', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...basePurchase,
        totalGst: 100, // GST Present
        supplierGstin: null, // Missing GSTIN
      });
      mockPrismaService.purchaseItem.findMany.mockResolvedValue(baseItems);
      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass if GST > 0 and supplier GSTIN present', async () => {
      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...basePurchase,
        totalGst: 100,
        supplierGstin: '29ABCDE1234F1Z5',
      });
      mockPrismaService.purchaseItem.findMany.mockResolvedValue(baseItems);

      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).resolves.not.toThrow();
    });

    it('should fail if invoice date is in future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...basePurchase,
        invoiceDate: futureDate,
      });
      mockPrismaService.purchaseItem.findMany.mockResolvedValue(baseItems);

      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if invoice date is older than 180 days (ITC)', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 181);

      mockPrismaService.purchase.findUnique.mockResolvedValue({
        ...basePurchase,
        invoiceDate: oldDate,
      });
      mockPrismaService.purchaseItem.findMany.mockResolvedValue(baseItems);

      await expect(
        service.atomicPurchaseSubmit(tenantId, purchaseId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
