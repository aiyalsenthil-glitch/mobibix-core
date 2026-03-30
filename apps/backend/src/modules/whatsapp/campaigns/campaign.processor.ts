import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuthkeyProvider } from '../providers/REMOVED_TOKEN.provider';
import { decrypt } from '../../../common/utils/crypto.util';

interface CampaignJobData {
  campaignId: string;
  tenantId: string;
}

@Processor('whatsapp-campaigns')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly REMOVED_TOKEN: AuthkeyProvider,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, tenantId } = job.data;
    this.logger.log(`[CampaignProcessor] Starting campaign ${campaignId}`);

    // 1. Fetch campaign
    const campaign = await this.prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        whatsAppNumber: {
          select: {
            REMOVED_TOKENApiKey: true,
            REMOVED_TOKENCountryCode: true,
            isEnabled: true,
            setupStatus: true,
          },
        },
      } as any,
    });

    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found — skipping`);
      return;
    }

    if (!['RUNNING', 'SCHEDULED'].includes(campaign.status)) {
      this.logger.warn(`Campaign ${campaignId} is ${campaign.status} — skipping`);
      return;
    }

    const waNumber = (campaign as any).whatsAppNumber;
    if (!waNumber?.REMOVED_TOKENApiKey || !waNumber.isEnabled) {
      await this.failCampaign(campaignId, 'WhatsApp number not configured or disabled.');
      return;
    }

    // 2. Decrypt API key
    let apiKey: string;
    try {
      apiKey = decrypt(waNumber.REMOVED_TOKENApiKey);
    } catch {
      await this.failCampaign(campaignId, 'Failed to decrypt Authkey API key.');
      return;
    }

    const countryCode = waNumber.REMOVED_TOKENCountryCode ?? '91';
    const wid = (campaign as any).wid;
    const variables = ((campaign as any).variables ?? {}) as Record<string, string>;
    const recipients = ((campaign as any).recipients ?? []) as string[];
    const batchSize: number = (campaign as any).batchSize ?? 200;
    const batchDelayMs: number = (campaign as any).batchDelayMs ?? 1500;

    if (!wid) {
      await this.failCampaign(campaignId, 'Authkey template wid is missing.');
      return;
    }

    // 3. Mark RUNNING
    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' as any },
    });

    // 4. Process in batches
    let totalSent = 0;
    let totalFailed = 0;

    const chunks = this.chunk(recipients, batchSize);
    this.logger.log(`Campaign ${campaignId}: ${recipients.length} recipients in ${chunks.length} batches`);

    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];
      job.updateProgress(Math.round((i / chunks.length) * 100));

      // Build batch payload — bodyValues are the same for all (static variables)
      // If you need per-recipient personalization, extend recipients to [{phone, vars}]
      const REMOVED_TOKENRecipients = batch.map((phone) => ({
        mobile: phone,
        bodyValues: Object.keys(variables).length > 0 ? variables : undefined,
      }));

      try {
        const result = await this.REMOVED_TOKEN.sendBulkTemplate(
          apiKey,
          wid,
          REMOVED_TOKENRecipients,
          countryCode,
        );

        if (result.success) {
          // Mark batch as SENT
          await (this.prisma as any).whatsAppCampaignLog.updateMany({
            where: { campaignId, phone: { in: batch } },
            data: {
              status: 'SENT',
              providerRef: result.messageId ?? null,
              sentAt: new Date(),
            },
          });
          totalSent += batch.length;
        } else {
          // Mark batch as FAILED
          await (this.prisma as any).whatsAppCampaignLog.updateMany({
            where: { campaignId, phone: { in: batch } },
            data: { status: 'FAILED', errorMessage: result.error ?? 'Authkey error' },
          });
          totalFailed += batch.length;
          this.logger.warn(`Batch ${i + 1} failed: ${result.error}`);
        }
      } catch (err: any) {
        const errMsg = err?.message ?? 'Unknown error';
        await (this.prisma as any).whatsAppCampaignLog.updateMany({
          where: { campaignId, phone: { in: batch } },
          data: { status: 'FAILED', errorMessage: errMsg },
        });
        totalFailed += batch.length;
        this.logger.error(`Batch ${i + 1} exception: ${errMsg}`);
      }

      // Update running counters after each batch
      await this.prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { sentCount: totalSent, failedCount: totalFailed } as any,
      });

      // Delay between batches (skip after last batch)
      if (i < chunks.length - 1 && batchDelayMs > 0) {
        await this.sleep(batchDelayMs);
      }
    }

    // 5. Mark COMPLETED
    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED' as any,
        completedAt: new Date(),
        sentCount: totalSent,
        failedCount: totalFailed,
      } as any,
    });

    this.logger.log(
      `Campaign ${campaignId} completed — sent: ${totalSent}, failed: ${totalFailed}`,
    );
  }

  private async failCampaign(campaignId: string, reason: string) {
    this.logger.error(`Campaign ${campaignId} failed: ${reason}`);
    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'CANCELLED' as any,
        errorSummary: reason,
        cancelledAt: new Date(),
      } as any,
    });
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
