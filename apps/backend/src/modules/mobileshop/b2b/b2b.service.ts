import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class B2BService {
  constructor(private prisma: PrismaService) {}

  // Distributor Onboarding
  async onboardDistributor(data: {
    name: string;
    contactPhone: string;
    city: string;
    gstNumber?: string;
    address?: string;
    state?: string;
  }) {
    return this.prisma.distributor.create({
      data,
    });
  }

  // Catalog Management
  async updateCatalog(distributorId: string, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      // Simple wipe and replace for MVP
      await tx.wholesaleCatalog.deleteMany({ where: { distributorId } });
      return tx.wholesaleCatalog.createMany({
        data: items.map((item) => ({
          sku: item.sku,
          productName: item.productName,
          category: item.category,
          wholesalePrice: item.wholesalePrice,
          moq: item.moq || 1,
          stockAvailable: item.stockAvailable || 0,
          distributorId,
        })),
      });
    });
  }

  // Fetch Catalogs for a Retailer
  async getAvailableWholesaleItems(tenantId: string) {
    // Only fetch from APPROVED distributors
    let links = await this.prisma.distributorTenantLink.findMany({
      where: { tenantId, status: 'APPROVED' },
      select: { distributorId: true },
    });

    // Auto-Seed Demo Distributor for MVP if none linked
    if (links.length === 0) {
      let demoDist = await this.prisma.distributor.findFirst({
        where: { name: 'Mobibix Global Supply' },
      });
      if (!demoDist) {
        demoDist = await this.prisma.distributor.create({
          data: {
            name: 'Mobibix Global Supply',
            city: 'HQ',
            catalogs: {
              create: [
                {
                  sku: 'AC-101',
                  productName: 'iPhone 15 Pro Max Screen Guard (11D Glass)',
                  category: 'Accessories',
                  wholesalePrice: 85,
                  moq: 50,
                  stockAvailable: 1000,
                },
                {
                  sku: 'CH-202',
                  productName: 'Samsung 25W Fast Charger (Original Pkg)',
                  category: 'Chargers',
                  wholesalePrice: 450,
                  moq: 10,
                  stockAvailable: 500,
                },
                {
                  sku: 'CS-303',
                  productName: 'Premium iPhone Silicon Case - Midnight Blue',
                  category: 'Cases',
                  wholesalePrice: 180,
                  moq: 100,
                  stockAvailable: 250,
                },
                {
                  sku: 'SP-404',
                  productName: 'Redmi Note 12 Battery Replacement',
                  category: 'Spares',
                  wholesalePrice: 650,
                  moq: 5,
                  stockAvailable: 50,
                },
                {
                  sku: 'CB-505',
                  productName: 'Universal USB-C to USB-C Cable (1m)',
                  category: 'Cables',
                  wholesalePrice: 45,
                  moq: 100,
                  stockAvailable: 2000,
                },
              ],
            },
          },
        });
      }

      await this.prisma.distributorTenantLink.create({
        data: {
          tenantId,
          distributorId: demoDist.id,
          status: 'APPROVED',
        },
      });

      links = [{ distributorId: demoDist.id }];
    }

    const distributorIds = links.map((l) => l.distributorId);

    return this.prisma.wholesaleCatalog.findMany({
      where: { distributorId: { in: distributorIds } },
      include: { distributor: { select: { name: true } } },
    });
  }

  // Networking (Linking Shop to Distributor)
  async requestLink(tenantId: string, distributorId: string) {
    const existing = await this.prisma.distributorTenantLink.findUnique({
      where: { tenantId_distributorId: { tenantId, distributorId } },
    });

    if (existing) throw new BadRequestException('Link request already exists');

    return this.prisma.distributorTenantLink.create({
      data: {
        tenantId,
        distributorId,
        status: 'PENDING',
      },
    });
  }

  // Ordering
  async placeB2BOrder(
    tenantId: string,
    data: {
      distributorId: string;
      items: { catalogItemId: string; quantity: number; unitPrice: number }[];
    },
  ) {
    const poNumber = `B2B-PO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const totalAmount = data.items.reduce(
      (acc, i) => acc + i.unitPrice * i.quantity,
      0,
    );

    return this.prisma.b2BPurchaseOrder.create({
      data: {
        poNumber,
        tenantId,
        distributorId: data.distributorId,
        totalAmount,
        status: 'SUBMITTED',
        items: {
          create: data.items.map((i) => ({
            catalogItemId: i.catalogItemId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true, distributor: true },
    });
  }
}
