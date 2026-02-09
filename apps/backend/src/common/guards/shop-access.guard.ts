import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Validates that a shop belongs to the specified tenant
 * Throws BadRequestException if shop not found or belongs to different tenant
 *
 * @param tx - Prisma transaction client or regular PrismaClient
 * @param shopId - Shop ID to validate
 * @param tenantId - Tenant ID that should own the shop
 * @throws BadRequestException if shop is invalid or doesn't belong to tenant
 */
export async function assertShopAccess(
  tx: PrismaClient | any,
  shopId: string,
  tenantId: string,
): Promise<void> {
  const shop = await tx.shop.findFirst({
    where: { id: shopId, tenantId },
    select: { id: true },
  });

  if (!shop) {
    throw new BadRequestException(
      'Invalid shop or shop does not belong to your organization',
    );
  }
}
