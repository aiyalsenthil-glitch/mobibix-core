import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { assertShopAccess } from '../../src/common/guards/shop-access.guard';

describe('Shop Access Guard', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('assertShopAccess', () => {
    it('should throw BadRequestException when shop does not exist', async () => {
      const nonExistentShopId = 'non-existent-shop-id';
      const tenantId = 'test-tenant-id';

      await expect(
        assertShopAccess(prisma, nonExistentShopId, tenantId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        assertShopAccess(prisma, nonExistentShopId, tenantId),
      ).rejects.toThrow(
        'Invalid shop or shop does not belong to your organization',
      );
    });

    it('should throw BadRequestException when shop belongs to different tenant', async () => {
      // Create test tenants and shop
      const tenant1 = await prisma.tenant.create({
        data: {
          name: 'Test Tenant 1',
          code: `test-tenant-1-${Date.now()}`,
          tenantType: 'GYM',
        },
      });

      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Test Tenant 2',
          code: `test-tenant-2-${Date.now()}`,
          tenantType: 'GYM',
        },
      });

      const shop = await prisma.shop.create({
        data: {
          name: 'Test Shop',
          tenantId: tenant1.id,
          phone: '1234567890',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          invoicePrefix: 'TS',
        },
      });

      // Try to access tenant1's shop with tenant2's ID
      await expect(
        assertShopAccess(prisma, shop.id, tenant2.id),
      ).rejects.toThrow(BadRequestException);

      await expect(
        assertShopAccess(prisma, shop.id, tenant2.id),
      ).rejects.toThrow(
        'Invalid shop or shop does not belong to your organization',
      );

      // Cleanup
      await prisma.shop.delete({ where: { id: shop.id } });
      await prisma.tenant.delete({ where: { id: tenant1.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });

    it('should not throw when shop belongs to correct tenant', async () => {
      // Create test tenant and shop
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          code: `test-tenant-${Date.now()}`,
          tenantType: 'GYM',
        },
      });

      const shop = await prisma.shop.create({
        data: {
          name: 'Test Shop',
          tenantId: tenant.id,
          phone: '1234567890',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          invoicePrefix: 'TS',
        },
      });

      // Should not throw
      await expect(
        assertShopAccess(prisma, shop.id, tenant.id),
      ).resolves.not.toThrow();

      // Cleanup
      await prisma.shop.delete({ where: { id: shop.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });

    it('should work within a transaction', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant Tx',
          code: `test-tenant-tx-${Date.now()}`,
          tenantType: 'GYM',
        },
      });

      const shop = await prisma.shop.create({
        data: {
          name: 'Test Shop Tx',
          tenantId: tenant.id,
          phone: '1234567890',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          invoicePrefix: 'TX',
        },
      });

      // Test within transaction
      await prisma.$transaction(async (tx) => {
        await expect(
          assertShopAccess(tx, shop.id, tenant.id),
        ).resolves.not.toThrow();
      });

      // Cleanup
      await prisma.shop.delete({ where: { id: shop.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });
  });
});


