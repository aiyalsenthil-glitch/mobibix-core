import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('whatsapp-campaigns') private readonly campaignQueue: Queue,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateCampaignDto) {
    if (!dto.recipients?.length) {
      throw new BadRequestException('At least one recipient is required.');
    }
    if (dto.recipients.length > 50_000) {
      throw new BadRequestException('Maximum 50,000 recipients per campaign.');
    }
    if (!dto.wid) {
      throw new BadRequestException('Authkey template wid is required.');
    }

    // Resolve whatsAppNumber if not provided
    let whatsAppNumberId = dto.whatsAppNumberId ?? null;
    if (!whatsAppNumberId) {
      const defaultNumber = await this.prisma.whatsAppNumber.findFirst({
        where: { tenantId, isDefault: true, isEnabled: true, provider: 'AUTHKEY' },
        select: { id: true },
      });
      if (!defaultNumber) {
        throw new BadRequestException(
          'No active Authkey WhatsApp number configured. Complete onboarding first.',
        );
      }
      whatsAppNumberId = defaultNumber.id;
    }

    const phones = this.sanitizePhones(dto.recipients);

    const campaign = await this.prisma.whatsAppCampaign.create({
      data: {
        tenantId,
        name: dto.name,
        wid: dto.wid,
        templateId: dto.templateId,
        templateName: dto.templateName,
        recipients: phones,
        variables: dto.variables ?? {},
        countryCode: dto.countryCode ?? '91',
        batchSize: dto.batchSize ?? 200,
        batchDelayMs: dto.batchDelayMs ?? 1500,
        totalCount: phones.length,
        whatsAppNumberId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
      } as any,
    });

    this.logger.log(`Campaign created: ${campaign.id} (${phones.length} recipients) for tenant ${tenantId}`);
    return campaign;
  }

  // ─── LAUNCH ──────────────────────────────────────────────────────────────────

  async launch(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot launch a campaign in ${campaign.status} status.`);
    }

    const phones = (campaign as any).recipients as string[];
    if (!phones?.length) {
      throw new BadRequestException('Campaign has no recipients.');
    }

    const delay = (campaign as any).scheduledAt
      ? Math.max(0, new Date((campaign as any).scheduledAt).getTime() - Date.now())
      : 0;

    const newStatus = delay > 0 ? 'SCHEDULED' : 'RUNNING';

    // Mark SCHEDULED/RUNNING + pre-create PENDING logs in one transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { status: newStatus as any },
      });

      // Pre-create PENDING log rows (one per recipient) for progress tracking
      const logRows = phones.map((phone) => ({
        campaignId,
        tenantId,
        phone,
        status: 'PENDING',
      }));

      // Batch insert in chunks of 500 to avoid param limits
      const CHUNK = 500;
      for (let i = 0; i < logRows.length; i += CHUNK) {
        await (tx as any).whatsAppCampaignLog.createMany({
          data: logRows.slice(i, i + CHUNK),
          skipDuplicates: true,
        });
      }
    });

    // Enqueue BullMQ job (idempotent via jobId)
    await this.campaignQueue.add(
      'run-campaign',
      { campaignId, tenantId },
      {
        jobId: `campaign:${campaignId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    this.logger.log(`Campaign ${campaignId} enqueued (delay: ${delay}ms)`);
    return { success: true, status: newStatus, campaignId };
  }

  // ─── LIST ─────────────────────────────────────────────────────────────────────

  async list(tenantId: string) {
    const campaigns = await this.prisma.whatsAppCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        wid: true,
        templateName: true,
        status: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        scheduledAt: true,
        completedAt: true,
        createdAt: true,
      } as any,
      take: 50,
    });

    return campaigns.map((c: any) => ({
      ...c,
      progress: c.totalCount > 0
        ? Math.round(((c.sentCount + c.failedCount) / c.totalCount) * 100)
        : 0,
    }));
  }

  // ─── GET ONE ─────────────────────────────────────────────────────────────────

  async getOne(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { template: { select: { id: true, metaTemplateName: true, variables: true } } },
    } as any);

    if (!campaign) throw new NotFoundException('Campaign not found.');

    return {
      ...campaign,
      recipients: undefined, // don't expose full phone list in detail view
      recipientCount: ((campaign as any).recipients as string[])?.length ?? 0,
    };
  }

  // ─── LOGS ─────────────────────────────────────────────────────────────────────

  async getLogs(campaignId: string, tenantId: string, page = 1, status?: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, tenantId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found.');

    const PAGE_SIZE = 100;
    const where: any = { campaignId };
    if (status) where.status = status;

    const [total, logs] = await Promise.all([
      (this.prisma as any).whatsAppCampaignLog.count({ where }),
      (this.prisma as any).whatsAppCampaignLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          phone: true,
          contactName: true,
          status: true,
          errorMessage: true,
          providerRef: true,
          sentAt: true,
        },
      }),
    ]);

    return { logs, total, page, pageSize: PAGE_SIZE };
  }

  // ─── CANCEL ──────────────────────────────────────────────────────────────────

  async cancel(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({
      where: { id: campaignId, tenantId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    if (!['DRAFT', 'SCHEDULED', 'RUNNING'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot cancel a ${campaign.status} campaign.`);
    }

    // Remove BullMQ job if exists
    const job = await this.campaignQueue.getJob(`campaign:${campaignId}`);
    if (job) await job.remove();

    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' as any, cancelledAt: new Date() } as any,
    });

    return { success: true };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private sanitizePhones(phones: string[]): string[] {
    return [...new Set(phones
      .map((p) => p.replace(/\D/g, ''))
      .filter((p) => p.length >= 10 && p.length <= 15),
    )];
  }
}
