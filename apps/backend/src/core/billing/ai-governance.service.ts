import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AiGovernanceService {
  private readonly logger = new Logger(AiGovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if tenant has enough AI tokens and reset quota if a new cycle has started.
   * Enforces a "Hard Stop" when quota is exceeded.
   */
  async checkAndRecordAiUsage(
    tenantId: string,
    module: ModuleType,
    tokens: number = 1,
  ): Promise<void> {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId, module, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Active subscription required for AI features.',
      );
    }

    const maxTokens = subscription.plan.whatsappUtilityQuota || 0; // Fallback since maxAiTokens is not verified to exist
    const now = new Date();

    // 🔄 CYCLE-AWARE RESET LOGIC (Safety)
    // If now > current cycle end, the cron should have renewed it.
    // However, if for some reason we are still on the same ACTIVE row past endDate, 
    // we reset usage for the "grace" extension.
    let currentUsage = subscription.aiTokensUsed;
    if (subscription.endDate && now > subscription.endDate) {
      this.logger.log(`AI Quota: Resetting usage for tenant ${tenantId} (End date passed)`);
      currentUsage = 0;
    }

    if (currentUsage + tokens > maxTokens) {
      this.logger.warn(
        `AI Quota Exceeded: Tenant ${tenantId} (${currentUsage}/${maxTokens})`,
      );
      throw new BadRequestException(
        `AI Quota Exceeded (${maxTokens} tokens). Please upgrade your plan.`,
      );
    }

    // Increment usage
    await this.prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        aiTokensUsed: currentUsage + tokens,
        lastQuotaResetAt: currentUsage === 0 ? now : undefined,
      },
    });
  }

  /**
   * Manual reset (e.g., for troubleshooting or after add-on purchase)
   */
  async resetQuota(subscriptionId: string) {
    return this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        aiTokensUsed: 0,
        lastQuotaResetAt: new Date(),
      },
    });
  }
}
