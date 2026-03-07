import { Controller, Get, Query, UseGuards, Req, Body, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.PRODUCT_ADMIN)
export class AdminAiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getAiStats() {
    const logs = await this.prisma.aiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        tenant: { select: { name: true } },
      },
    });

    const aggregate = logs.reduce((acc: any, log) => {
      const feature = log.feature;
      if (!acc[feature]) {
        acc[feature] = {
          name: feature,
          tokens: 0,
          cost: 0,
          calls: 0,
        };
      }
      acc[feature].tokens += log.totalTokens;
      acc[feature].cost += log.costUsd;
      acc[feature].calls += 1;
      return acc;
    }, {});

    const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
    const totalCost = logs.reduce((sum, l) => sum + l.costUsd, 0);

    return {
      summary: {
        totalTokens,
        totalCost,
        totalCalls: logs.length,
      },
      features: Object.values(aggregate),
      recentLogs: logs.slice(0, 50),
    };
  }

  @Get('config')
  async getConfig() {
    let config = await this.prisma.systemAiConfig.findFirst();
    if (!config) {
      config = await this.prisma.systemAiConfig.create({
        data: {}, // Uses defaults
      });
    }
    return config;
  }

  @Patch('config')
  async updateConfig(@Body() body: any) {
    let config = await this.prisma.systemAiConfig.findFirst();
    if (!config) {
      config = await this.prisma.systemAiConfig.create({ data: {} });
    }
    
    // Whitelist allowed fields
    const { provider, baseUrl, apiKey, defaultModel, embeddingModel, isActive } = body;
    const dataToUpdate: any = {};
    if (provider !== undefined) dataToUpdate.provider = provider;
    if (baseUrl !== undefined) dataToUpdate.baseUrl = baseUrl;
    if (apiKey !== undefined) dataToUpdate.apiKey = apiKey;
    if (defaultModel !== undefined) dataToUpdate.defaultModel = defaultModel;
    if (embeddingModel !== undefined) dataToUpdate.embeddingModel = embeddingModel;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const updated = await this.prisma.systemAiConfig.update({
      where: { id: config.id },
      data: dataToUpdate,
    });
    return updated;
  }

  @Get('logs')
  async getAiLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('module') module?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (module) where.module = module;

    const [total, data] = await Promise.all([
      this.prisma.aiUsageLog.count({ where }),
      this.prisma.aiUsageLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        lastPage: Math.ceil(total / limitNum),
      },
    };
  }
}
