import { Injectable, BadRequestException } from '@nestjs/common';
import prisma from '../prismaClient';

@Injectable()
export class TenantService {
  async createTenant(userId: string, name: string) {
    // Check if user already has a tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.tenantId) {
      throw new BadRequestException('User already has a tenant');
    }

    const code = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const tenant = await prisma.tenant.create({
      data: {
        name,
        code,
        users: {
          connect: { id: userId },
        },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        role: 'owner',
      },
    });

    return tenant;
  }
}
