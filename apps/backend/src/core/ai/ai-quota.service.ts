import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType } from '@prisma/client';

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates if the tenant has sufficient AI tokens for a new request.
   */
  async assertQuota(tenantId: string, module: ModuleType): Promise<void> {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] }, // AI works during grace
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      throw new ForbiddenException({
        code: 'AI_SUBSCRIPTION_REQUIRED',
        message: 'No active subscription found for this module.',
      });
    }

    const limit = sub.plan?.maxAiTokens ?? 0;

    if (limit === 0) {
      throw new ForbiddenException({
        code: 'AI_NOT_IN_PLAN',
        message: 'AI features are not included in your current plan. Please upgrade.',
      });
    }

    if (limit !== -1 && (sub.aiTokensUsed ?? 0) >= limit) {
      throw new ForbiddenException({
        code: 'AI_TOKEN_QUOTA_EXCEEDED',
        message: 'Your AI token quota for this billing cycle has been exhausted.',
      });
    }
  }

  /**
   * Dedicates AI tokens used after a successful inference.
   */
  async recordUsage(
    tenantId: string,
    module: ModuleType,
    tokenUsage: { input: number; output: number; total: number },
    operationType: string = 'chat',
  ): Promise<void> {
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) return;

    await this.prisma.$transaction(async (tx) => {
      // Increment token usage on the subscription
      await tx.tenantSubscription.update({
        where: { id: sub.id },
        data: {
          aiTokensUsed: { increment: tokenUsage.total },
        },
      });

      // Log usage to AiUsageLog table
      await tx.aiUsageLog.create({
        data: {
          tenantId,
          module,
          feature: operationType,
          model: 'gemini-2.0-flash', // Default for beta (Gemini/Groq)
          promptTokens: tokenUsage.input,
          completionTokens: tokenUsage.output,
          totalTokens: tokenUsage.total,
          costUsd: 0, // Not applicable for local models, but required by schema
        },
      });
    });

    this.logger.debug(`Recorded ${tokenUsage.total} tokens for tenant ${tenantId}`);
  }
}

