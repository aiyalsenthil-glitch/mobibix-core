import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import { JobStatus } from '@prisma/client';
import { UpdateJobCardDto } from '../jobcard/dto/update-job-card.dto';

@Injectable()
export class JobCardsService {
  constructor(private prisma: PrismaService) {}

  async assertAccess(user: any, shopId: string) {
    // OWNER → any shop under tenant
    if (user.role === 'OWNER') {
      const shop = await this.prisma.shop.findFirst({
        where: {
          id: shopId,
          tenantId: user.tenantId,
        },
      });

      if (!shop) {
        throw new BadRequestException('Shop not accessible');
      }

      return;
    }

    // STAFF → only assigned shop
    if (user.role === 'STAFF') {
      const staff = await this.prisma.shopStaff.findFirst({
        where: {
          userId: user.sub,
          shopId,
          tenantId: user.tenantId,
          role: 'STAFF',
          isActive: true,
        },
      });

      if (!staff) {
        throw new BadRequestException('Shop not accessible');
      }

      return;
    }

    throw new BadRequestException('Access denied');
  }

  async nextJobNumber(shopId: string) {
    const last = await this.prisma.jobCard.findFirst({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      select: { jobNumber: true },
    });
    const n = last ? Number(last.jobNumber.split('-')[1]) + 1 : 1;
    return `JOB-${String(n).padStart(4, '0')}`;
  }

  async create(user, shopId: string, dto: CreateJobCardDto) {
    await this.assertAccess(user, shopId);
    return this.prisma.jobCard.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        jobNumber: await this.nextJobNumber(shopId),
        publicToken: crypto.randomUUID(),
        status: JobStatus.RECEIVED,

        createdByUserId: user.sub,
        createdByName: user.name ?? user.email ?? 'Staff',

        ...dto,
      },
    });
  }
  async getOne(user: any, shopId: string, id: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: {
        id,
        shopId,
        tenantId: user.tenantId,
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    return job;
  }
  async update(user: any, shopId: string, id: string, dto: UpdateJobCardDto) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: { id, shopId, tenantId: user.tenantId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Job is locked');
    }

    return this.prisma.jobCard.update({
      where: { id },
      data: dto,
    });
  }

  async list(user, shopId: string) {
    await this.assertAccess(user, shopId);
    return this.prisma.jobCard.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(user, shopId: string, id: string, status: JobStatus) {
    await this.assertAccess(user, shopId);
    const job = await this.prisma.jobCard.findUnique({ where: { id } });

    if (!job) {
      throw new BadRequestException('Job not found');
    }
    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Job is locked');
    }

    return this.prisma.jobCard.update({
      where: { id },
      data: { status },
    });
  }

  async publicStatus(publicToken: string) {
    return this.prisma.jobCard.findUnique({
      where: { publicToken },
      select: {
        jobNumber: true,
        status: true,
        deviceBrand: true,
        deviceModel: true,
        estimatedDelivery: true,
        updatedAt: true,
      },
    });
  }
}
